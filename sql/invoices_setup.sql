-- =============================================================
-- INVOICES TABLE + SEQUENTIAL INVOICE NUMBERS
-- Norwegian accounting compliance (bokføringsloven)
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Global sequence for invoice numbers (persists across years)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- 2. Function to generate invoice number: DP-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'DP-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
END;
$$;

-- 3. Invoices table — one row per Stripe checkout session
CREATE TABLE IF NOT EXISTS invoices (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number           text         NOT NULL UNIQUE DEFAULT generate_invoice_number(),
  participant_id           uuid         REFERENCES event_participants(id),
  stripe_payment_intent_id text,
  stripe_session_id        text,
  buyer_name               text,
  buyer_email              text,
  total_excl_mva           numeric(10,2) NOT NULL DEFAULT 0,
  total_mva                numeric(10,2) NOT NULL DEFAULT 0,
  total_incl_mva           numeric(10,2) NOT NULL DEFAULT 0,
  currency                 text         NOT NULL DEFAULT 'NOK',
  created_at               timestamptz  NOT NULL DEFAULT now()
);

-- 4. Link participant_products to their invoice
ALTER TABLE participant_products
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id);

-- 5. Also add mva_rate and mva_amount if not yet added from previous session
ALTER TABLE participant_products
  ADD COLUMN IF NOT EXISTS mva_rate    numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mva_amount  numeric(10,2) NOT NULL DEFAULT 0;

-- 6. Add mva_rate to products table if not yet added
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mva_rate numeric(5,2) NOT NULL DEFAULT 0;

-- 7. RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM event_participants WHERE user_id = auth.uid()
    )
  );

-- Admins/owners can view all invoices
CREATE POLICY "Owners and Super Users have full access to invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles."userRole" ->> 'name' = 'Owner'
        OR profiles."userRole" ->> 'name' = 'Super User'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles."userRole" ->> 'name' = 'Owner'
        OR profiles."userRole" ->> 'name' = 'Super User'
      )
    )
  );

-- 8. Organizer info on profiles (used as seller on receipts)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organizer_name        text,
  ADD COLUMN IF NOT EXISTS organizer_org_number  text,
  ADD COLUMN IF NOT EXISTS organizer_address     text,
  ADD COLUMN IF NOT EXISTS organizer_email       text;

-- 9. Optional: backfill MVA for existing Party Pass records
-- UPDATE participant_products
-- SET mva_rate = 25,
--     mva_amount = ROUND(subtotal * 25.0 / 125.0, 2)
-- WHERE product_name ILIKE '%party pass%'
--   AND mva_rate = 0;
