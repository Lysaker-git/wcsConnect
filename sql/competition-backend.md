# Competition Backend — Requirements & SQL Schema
_Created: March 2026 · Branch: feature/competition_

This document tracks all database tables, columns, RLS policies, and API endpoints
needed to make the competition front-end fully functional.

---

## Tables needed

### 1. `competitions`
The top-level competition object. Can be tied to an event or standalone.

```sql
CREATE TABLE competitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid REFERENCES events(id) ON DELETE SET NULL,  -- optional link to an event
  name          text NOT NULL,
  description   text,
  date          date NOT NULL,
  location      text,
  venue         text,
  status        text NOT NULL DEFAULT 'upcoming',
  -- status values: upcoming | registration_open | registration_closed | live | completed
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
```

### 2. `competition_divisions`
Each competition has multiple divisions (Newcomer J&J, Novice J&J, etc.)

```sql
CREATE TABLE competition_divisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name            text NOT NULL,               -- e.g. "Novice J&J"
  division_type   text NOT NULL DEFAULT 'jj',  -- jj | strictly | classic | cabaret
  sort_order      int NOT NULL DEFAULT 0,
  max_leaders     int,                          -- null = unlimited
  max_followers   int,
  registration_open boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
```

### 3. `competition_registrations`
A competitor's registration into a division.

```sql
CREATE TABLE competition_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  division_id     uuid NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  wsdc_id         text,
  role            text NOT NULL CHECK (role IN ('Leader', 'Follower')),
  bib_number      int,                    -- assigned when heats are drawn
  status          text NOT NULL DEFAULT 'registered',
  -- status values: registered | withdrawn | checked_in | scratched
  registered_at   timestamptz DEFAULT now()
);

-- Bib numbers must be unique per competition
CREATE UNIQUE INDEX ON competition_registrations (competition_id, bib_number)
  WHERE bib_number IS NOT NULL;
```

### 4. `competition_heats`
A heat groups several competitors to dance together in a round.

```sql
CREATE TABLE competition_heats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     uuid NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  round           text NOT NULL,   -- prelims | semis | finals
  heat_number     int NOT NULL,
  role            text NOT NULL CHECK (role IN ('Leader', 'Follower')),
  -- Each heat covers one role per round. Leaders and followers are paired randomly later.
  created_at      timestamptz DEFAULT now()
);
```

### 5. `competition_heat_competitors`
Join table: which competitor is in which heat.

```sql
CREATE TABLE competition_heat_competitors (
  heat_id         uuid NOT NULL REFERENCES competition_heats(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES competition_registrations(id) ON DELETE CASCADE,
  PRIMARY KEY (heat_id, registration_id)
);
```

### 6. `competition_scores`
One row per judge per competitor per round.

```sql
CREATE TABLE competition_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     uuid NOT NULL REFERENCES competition_divisions(id) ON DELETE CASCADE,
  round           text NOT NULL,
  registration_id uuid NOT NULL REFERENCES competition_registrations(id) ON DELETE CASCADE,
  judge_id        uuid NOT NULL REFERENCES auth.users(id),
  placement       int,          -- relative placement within the judge's scoring sheet
  callbacks       boolean,      -- TRUE = judge is calling this competitor back to next round
  notes           text,
  scored_at       timestamptz DEFAULT now(),
  UNIQUE (division_id, round, registration_id, judge_id)
);
```

### 7. `competition_judges`
Which users are assigned as judges for a competition.

```sql
CREATE TABLE competition_judges (
  competition_id  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_head_judge   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (competition_id, user_id)
);
```

---

## RLS policies needed

| Table                          | Public read | Competitor write | Judge write | Admin/ED write |
|-------------------------------|-------------|-----------------|-------------|----------------|
| `competitions`                | ✅ Yes      | ❌ No            | ❌ No       | ✅ Yes         |
| `competition_divisions`       | ✅ Yes      | ❌ No            | ❌ No       | ✅ Yes         |
| `competition_registrations`   | ✅ Yes      | ✅ Own rows      | ❌ No       | ✅ Yes         |
| `competition_heats`           | ✅ Yes      | ❌ No            | ❌ No       | ✅ Yes         |
| `competition_heat_competitors`| ✅ Yes      | ❌ No            | ❌ No       | ✅ Yes         |
| `competition_scores`          | ❌ No       | ❌ No            | ✅ Own rows | ✅ Yes (read)  |
| `competition_judges`          | ✅ Yes      | ❌ No            | ❌ No       | ✅ Yes         |

Scores are private until the organiser publishes results — add `is_published` flag on division.

---

## API endpoints / SvelteKit actions needed

### Load functions
- `/competition` → `+page.server.ts` load: fetch all competitions (with registration count)
- `/competition/[competitionId]` → load: competition + divisions + counts per division
- `/competition/[competitionId]/register` → load: check if registration open, pull profile data
- `/competition/[competitionId]/heats` → load: heats per division/round
- `/competition/[competitionId]/judges/[judgeId]` → load: competitors to score for this judge

### Actions
- `register` — insert into `competition_registrations`, check capacity limits per role
- `withdrawRegistration` — set status to 'withdrawn'
- `drawHeats` — admin action: shuffle registered competitors into heats, assign bib numbers
  - Leaders drawn separately from Followers
  - Group size: typically 5–8 per heat (configurable)
- `submitScore` — judge posts placements/callbacks for a round
- `publishResults` — head judge / admin marks a round's results as final

### Admin actions (in `/admin/competition/[competitionId]`)
- Create/edit competition
- Create/edit/delete divisions
- Open/close registration per division
- Draw heats (random)
- Advance competitors to next round (based on callbacks)
- Publish final results

---

## Front-end pages still to wire up

| Route                                            | Status         |
|--------------------------------------------------|----------------|
| `/competition`                                   | ✅ Mock UI done |
| `/competition/[id]`                              | ✅ Mock UI done |
| `/competition/[id]/register`                     | ✅ Mock UI done (no POST action yet) |
| `/competition/[id]/heats`                        | 🔲 Stub         |
| `/competition/[id]/marshalling`                  | 🔲 Stub         |
| `/competition/[id]/judges`                       | 🔲 Stub         |
| `/competition/[id]/judges/head`                  | 🔲 Stub         |
| `/competition/[id]/judges/[judgeId]`             | 🔲 Stub         |
| `/admin/competition` (manage competitions list)  | 🔲 Not built    |
| `/admin/competition/[id]` (manage competition)   | 🔲 Not built    |

---

## Open questions / decisions

- [ ] Are competitions always tied to an event (event_id FK), or can they be standalone?
- [ ] Do we support multiple rounds (prelims → semis → finals) from day 1, or start with just finals?
- [ ] Scoring system: Relative Placement (RP) standard, or a simple points/callback system?
- [ ] Head judge interface: approve/override individual judge calls, or purely aggregate?
- [ ] Publish results automatically once all judges score, or require manual publish?
- [ ] Email notifications: notify competitors when heats are posted? When results are published?
