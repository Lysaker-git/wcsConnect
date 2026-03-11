-- =============================================================
-- COMPETITION SCHEMA
-- Supports: Jack & Jill, Strictly, Routine, Team, Cabaret
-- WSDC Registry Event Rules 2026 compliant
-- Run this in Supabase SQL Editor
-- =============================================================


-- =============================================================
-- SECTION 1: PROFILE TABLE — WSDC extensions
-- Existing columns (already present, no changes needed):
--   "wsdcID"    numeric  — WSDC competitor ID number
--   "wsdcLevel" text     — primary role skill level
--   "age"       date     — date of birth (used for age-gate validation)
--   "role"      text     — general dance role (leader/follower)
--
-- New columns added below:
-- =============================================================

ALTER TABLE profiles
  -- Secondary role: the off-role the competitor may enter (tracked separately per WSDC rules)
  ADD COLUMN IF NOT EXISTS "wsdcSecondaryRole"  text CHECK ("wsdcSecondaryRole" IN ('leader','follower')),
  ADD COLUMN IF NOT EXISTS "wsdcSecondaryLevel" text CHECK ("wsdcSecondaryLevel" IN (
    'newcomer','novice','intermediate','advanced','all_star','champion'
  )),

  -- Full WSDC points snapshot, structured by role and level.
  -- Populated from WSDC API. Used for secondary-role eligibility checks.
  -- Shape: { "leader": { "novice": 12, "intermediate": 3, ... }, "follower": { ... } }
  ADD COLUMN IF NOT EXISTS "wsdcPoints"       jsonb        DEFAULT '{}'::jsonb,

  -- Timestamp of last successful WSDC API sync. Null = never synced / manually entered.
  ADD COLUMN IF NOT EXISTS "wsdcLastSynced"   timestamptz;

-- Add a CHECK on the existing "wsdcLevel" column to enforce valid values
-- (only run if not already constrained)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_wsdc_level_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_wsdc_level_check
  CHECK ("wsdcLevel" IN ('newcomer','novice','intermediate','advanced','all_star','champion') OR "wsdcLevel" IS NULL);

COMMENT ON COLUMN profiles."wsdcPoints" IS
  'WSDC points per role per level. Shape: {"leader":{"novice":12},"follower":{"novice":0,...}}. Synced from WSDC API.';

COMMENT ON COLUMN profiles."wsdcLastSynced" IS
  'Timestamp of last successful WSDC API sync. Null = never synced / manually entered.';


-- =============================================================
-- SECTION 2: competitions
-- Top-level competition object. Linked to an event (optional).
-- =============================================================

CREATE TABLE IF NOT EXISTS competitions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid        REFERENCES events(id) ON DELETE SET NULL,
  name            text        NOT NULL,
  description     text,

  -- Competition type determines registration shape and validation rules
  comp_type       text        NOT NULL CHECK (comp_type IN (
    'jj',        -- Jack & Jill: random partner, role-based, WSDC level divisions
    'strictly',  -- Strictly Swing: pre-chosen partner couple
    'routine',   -- Choreographed routine: partner or solo duo
    'team',      -- Team routine: group with team name
    'cabaret'    -- Solo performance: individual, pulls from profile
  )),

  status          text        NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming','registration_open','registration_closed','live','completed'
  )),

  -- WSDC Registry settings (J&J only)
  -- When true: results and surcharge ($2/entry) must be reported to WSDC
  wsdc_eligible   boolean     NOT NULL DEFAULT false,

  -- Global age gate (applies to entire competition; overridable per division)
  min_age         int,   -- null = no restriction
  max_age         int,   -- null = no restriction

  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);


-- =============================================================
-- SECTION 3: competition_divisions
-- Each competition has one or more divisions.
-- Division shape varies by comp_type.
--
-- J&J divisions:   one per WSDC level (Novice, Intermediate…)
--                  + optional age-based (Juniors, Sophisticated, Masters)
-- Strictly:        one per level pair (e.g. Intermediate Strictly)
-- Routine/Cabaret: typically one or two open divisions
-- Team:            typically one open division
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_divisions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id      uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name                text        NOT NULL,  -- e.g. "Intermediate J&J", "Masters J&J", "Strictly Open"
  sort_order          int         NOT NULL DEFAULT 0,
  entry_fee           numeric(10,2),

  -- WSDC skill level (J&J + Strictly)
  -- null for open / age-based / non-level divisions
  wsdc_level          text        CHECK (wsdc_level IN (
    'newcomer','novice','intermediate','advanced','all_star','champion'
  )),
  -- Numeric rank used for comparison logic in code (avoid string comparison)
  -- 1=newcomer, 2=novice, 3=intermediate, 4=advanced, 5=all_star, 6=champion
  wsdc_level_order    int,

  -- Division category
  -- 'skill_level'  → standard WSDC skill-level division (e.g. Novice J&J)
  -- 'junior'       → age-based, open to all skill levels, max_age applies (< 18)
  -- 'sophisticated'→ age-based, min_age = 35
  -- 'masters'      → age-based, min_age = 50
  -- 'open'         → no level or age restriction (used for Strictly Open etc.)
  division_category   text        NOT NULL DEFAULT 'skill_level' CHECK (division_category IN (
    'skill_level','junior','sophisticated','masters','open'
  )),

  -- Age gate (set automatically for age-based categories, or custom)
  min_age             int,   -- e.g. Masters = 50, Sophisticated = 35
  max_age             int,   -- e.g. Juniors: store 17 (< 18 by close of event)

  -- Role capacity (J&J, Strictly)
  max_leaders         int,   -- null = unlimited
  max_followers       int,

  -- General capacity (Cabaret, Routine, Team)
  max_entries         int,

  -- Off-role / secondary role (J&J only)
  -- WSDC rule: competitors may dance up to 2 levels below their primary level
  allow_off_role      boolean     NOT NULL DEFAULT false,
  off_role_max_gap    int         NOT NULL DEFAULT 2,  -- levels below primary allowed

  -- Registration and results state
  registration_open   boolean     NOT NULL DEFAULT true,
  is_published        boolean     NOT NULL DEFAULT false,

  created_at          timestamptz DEFAULT now()
);

COMMENT ON COLUMN competition_divisions.wsdc_level_order IS
  '1=newcomer, 2=novice, 3=intermediate, 4=advanced, 5=all_star, 6=champion. Used for eligibility comparison.';

COMMENT ON COLUMN competition_divisions.off_role_max_gap IS
  'WSDC rule: secondary role may be at most N levels below primary. Default 2. e.g. Intermediate primary → Novice secondary is allowed (gap=1), Newcomer secondary is not (gap=2, but level=newcomer=1 while intermediate=3, gap=2 so borderline — validate carefully).';


-- =============================================================
-- SECTION 4: competition_teams
-- Used only for comp_type = 'team'.
-- Each team gets one row; members each get a competition_entries row pointing here.
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_teams (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  division_id     uuid        NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  team_name       text        NOT NULL,
  captain_user_id uuid        REFERENCES auth.users(id),  -- primary contact / team lead
  status          text        NOT NULL DEFAULT 'registered' CHECK (status IN (
    'registered','withdrawn','checked_in'
  )),
  registered_at   timestamptz DEFAULT now()
);


-- =============================================================
-- SECTION 5: competition_entries
-- Unified entry table — one row per person per division.
-- Handles all 5 comp types via nullable type-specific columns.
--
-- J&J:       role + is_off_role
-- Strictly:  role + partner_entry_id (self-referential)
-- Routine:   role (optional) + partner_entry_id
-- Team:      team_id
-- Cabaret:   no extra fields needed
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  division_id     uuid        NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshot of personal info at time of registration
  -- (so renames / profile edits don't affect existing entries)
  first_name      text        NOT NULL,
  last_name       text        NOT NULL,
  wsdc_id         text,
  date_of_birth   date,       -- snapshot for age validation audit

  -- Role (J&J, Strictly, Routine — null for Team and Cabaret)
  role            text        CHECK (role IN ('leader','follower')),

  -- J&J: true when this entry is the competitor's secondary (off-role) entry.
  -- The primary role entry must exist in the same competition.
  is_off_role     boolean     NOT NULL DEFAULT false,

  -- Strictly / Routine: partner linking.
  -- Workflow:
  --   1. Person A registers → status = 'pending_partner'
  --   2. Person B registers, selects A's entry → partner_entry_id set on both
  --   3. Both entries updated to status = 'registered'
  partner_entry_id  uuid      REFERENCES competition_entries(id),

  -- Team comp: all members share the same team_id
  team_id         uuid        REFERENCES competition_teams(id),

  -- Status
  status          text        NOT NULL DEFAULT 'registered' CHECK (status IN (
    'pending_partner',  -- Strictly/Routine: waiting for partner to register
    'registered',
    'waitlisted',
    'withdrawn',
    'checked_in',
    'scratched'
  )),

  bib_number      int,
  registered_at   timestamptz DEFAULT now()
);

-- Bib numbers must be unique per competition
CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_bib_unique
  ON competition_entries (competition_id, bib_number)
  WHERE bib_number IS NOT NULL;

-- One active entry per user per division (withdrawn/scratched don't block re-entry)
CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_user_division_unique
  ON competition_entries (division_id, user_id)
  WHERE status NOT IN ('withdrawn','scratched');


-- =============================================================
-- SECTION 6: competition_heats  (unchanged from v1)
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_heats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     uuid        NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  round           text        NOT NULL CHECK (round IN ('prelims','quarters','semis','finals')),
  heat_number     int         NOT NULL,
  role            text        NOT NULL CHECK (role IN ('leader','follower')),
  created_at      timestamptz DEFAULT now()
);


-- =============================================================
-- SECTION 7: competition_heat_entries  (join: entry ↔ heat)
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_heat_entries (
  heat_id         uuid        NOT NULL REFERENCES competition_heats(id) ON DELETE CASCADE,
  entry_id        uuid        NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  PRIMARY KEY (heat_id, entry_id)
);


-- =============================================================
-- SECTION 8: competition_scores
-- WSDC uses Callback system for prelims and Relative Placement for finals.
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_scores (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     uuid        NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  round           text        NOT NULL CHECK (round IN ('prelims','quarters','semis','finals')),
  entry_id        uuid        NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  judge_id        uuid        NOT NULL REFERENCES auth.users(id),

  -- Prelims: WSDC Callback system values
  -- Yes = 10, Alt1 = 4.5, Alt2 = 4.3, Alt3 = 4.2, No = 0
  callback_value  numeric(4,1),  -- null if finals

  -- Finals: Relative Placement — judge's rank for this competitor
  placement       int,            -- null if prelims

  notes           text,
  scored_at       timestamptz     DEFAULT now(),

  UNIQUE (division_id, round, entry_id, judge_id)
);


-- =============================================================
-- SECTION 9: competition_judges
-- =============================================================

CREATE TABLE IF NOT EXISTS competition_judges (
  competition_id  uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_head_judge   boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (competition_id, user_id)
);


-- =============================================================
-- SECTION 10: RLS POLICIES
-- =============================================================

ALTER TABLE competitions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_divisions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_heats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_heat_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_judges       ENABLE ROW LEVEL SECURITY;

-- competitions: public read, admin write
CREATE POLICY "competitions_public_read"
  ON competitions FOR SELECT USING (true);

CREATE POLICY "competitions_admin_write"
  ON competitions FOR ALL
  USING (auth.uid() = created_by);

-- competition_divisions: public read, admin write (via competition ownership)
CREATE POLICY "divisions_public_read"
  ON competition_divisions FOR SELECT USING (true);

CREATE POLICY "divisions_admin_write"
  ON competition_divisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_id AND c.created_by = auth.uid()
    )
  );

-- competition_teams: public read, own team write
CREATE POLICY "teams_public_read"
  ON competition_teams FOR SELECT USING (true);

CREATE POLICY "teams_captain_write"
  ON competition_teams FOR ALL
  USING (captain_user_id = auth.uid());

-- competition_entries: public read, own row insert/update
CREATE POLICY "entries_public_read"
  ON competition_entries FOR SELECT USING (true);

CREATE POLICY "entries_own_insert"
  ON competition_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "entries_own_update"
  ON competition_entries FOR UPDATE
  USING (user_id = auth.uid());

-- competition_heats / heat_entries: public read, admin write
CREATE POLICY "heats_public_read"
  ON competition_heats FOR SELECT USING (true);

CREATE POLICY "heat_entries_public_read"
  ON competition_heat_entries FOR SELECT USING (true);

-- competition_scores: private until published — judge writes own rows
CREATE POLICY "scores_judge_write"
  ON competition_scores FOR ALL
  USING (judge_id = auth.uid());

CREATE POLICY "scores_public_read_when_published"
  ON competition_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competition_divisions d
      WHERE d.id = division_id AND d.is_published = true
    )
  );

-- competition_judges: public read
CREATE POLICY "judges_public_read"
  ON competition_judges FOR SELECT USING (true);
