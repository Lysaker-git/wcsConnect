-- Participant Products Junction Table
-- Tracks which products each participant selected with their quantities
-- Used for: reporting, payment processing, confirmation emails, order history

CREATE TABLE IF NOT EXISTS participant_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Product Details at time of registration (denormalized for historical accuracy)
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    currency_type VARCHAR(3) NOT NULL DEFAULT 'EUR',
    subtotal DECIMAL(12, 2) NOT NULL, -- quantity_ordered * unit_price
    
    -- Status tracking for payment and confirmations
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',           -- Awaiting payment
        'paid',              -- Payment received
        'refunded',          -- Payment refunded
        'cancelled'          -- Item cancelled
    )),
    confirmation_status VARCHAR(50) DEFAULT 'pending' CHECK (confirmation_status IN (
        'pending',           -- Confirmation email not sent
        'sent',              -- Confirmation email sent
        'acknowledged',      -- User acknowledged/confirmed
        'cancelled'          -- Item cancelled
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_participant_product UNIQUE(participant_id, product_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_participant_products_participant_id 
    ON participant_products(participant_id);

CREATE INDEX IF NOT EXISTS idx_participant_products_product_id 
    ON participant_products(product_id);

CREATE INDEX IF NOT EXISTS idx_participant_products_payment_status 
    ON participant_products(payment_status);

CREATE INDEX IF NOT EXISTS idx_participant_products_confirmation_status 
    ON participant_products(confirmation_status);

-- Composite index for reporting/filtering
CREATE INDEX IF NOT EXISTS idx_participant_products_status_composite 
    ON participant_products(participant_id, payment_status, confirmation_status);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on participant_products table
ALTER TABLE participant_products ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owners and Super Users have full access to all participant_products
CREATE POLICY "Owners and Super Users have full access to participant_products"
    ON participant_products FOR ALL
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

-- Policy 2: Event Directors and Super Users have full access to participant products for their events
CREATE POLICY "Event Directors and Super Users manage their event products"
    ON participant_products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            JOIN events e ON ep.event_id = e.id
            WHERE ep.id = participant_id 
            AND (
                (ep.event_role = 'Event Director' OR ep.event_role = 'Super User')
                AND ep.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_participants ep
            JOIN events e ON ep.event_id = e.id
            WHERE ep.id = participant_id 
            AND (
                (ep.event_role = 'Event Director' OR ep.event_role = 'Super User')
                AND ep.user_id = auth.uid()
            )
        )
    );

-- Policy 3: Users can view their own participant_products
CREATE POLICY "Users can view their own participant_products"
    ON participant_products FOR SELECT
    USING (
        participant_id IN (
            SELECT id FROM event_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 4: Users can insert their own participant_products (during registration)
CREATE POLICY "Users can insert their own participant_products"
    ON participant_products FOR INSERT
    WITH CHECK (
        participant_id IN (
            SELECT id FROM event_participants 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- PRODUCTS TABLE RLS POLICIES (for Event Directors/Super Users)
-- ============================================================

-- Enable RLS on products table (if not already enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owners and Super Users have full access to all products
CREATE POLICY "Owners and Super Users have full access to products"
    ON products FOR ALL
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

-- Policy 2: Event Directors and Super Users manage products for their events
CREATE POLICY "Event Directors and Super Users manage products"
    ON products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = products.event_id 
            AND (
                (ep.event_role = 'Event Director' OR ep.event_role = 'Super User')
                AND ep.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = products.event_id 
            AND (
                (ep.event_role = 'Event Director' OR ep.event_role = 'Super User')
                AND ep.user_id = auth.uid()
            )
        )
    );

-- Policy 3: All authenticated users can view active products
CREATE POLICY "Authenticated users can view active products"
    ON products FOR SELECT
    USING (is_active = true);

-- Policy 4: Authenticated users can update quantity_sold during registration
-- This is intentionally permissive to allow the registration process to update inventory
-- The application layer enforces business logic (availability checks, etc.)
CREATE POLICY "Authenticated users can update product quantity_sold"
    ON products FOR UPDATE
    USING (true)  -- Allow all authenticated users to attempt update
    WITH CHECK (true)
    -- This policy allows updates but doesn't restrict by row
    -- Application logic validates product availability before calling this
;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant permissions to authenticated users
-- GRANT ALL ON participant_products TO authenticated;
-- GRANT ALL ON products TO authenticated;

-- Notes for application logic:
-- 1. When creating participant_products records:
--    - Use actual product name/type at time of registration (for historical records)
--    - Calculate subtotal = quantity_ordered * unit_price
--    - Set payment_status = 'pending', confirmation_status = 'pending'
--
-- 2. For payment processing:
--    - Update payment_status when payment is processed
--    - Use subtotal values to calculate participant's total owed
--
-- 3. For confirmation emails:
--    - Update confirmation_status when email is sent
--    - Use product details to populate email content
--
-- 4. For reporting:
--    - Query with various filters: participant_id, product_id, payment_status, confirmation_status
--    - Use created_at for date range filtering
--    - Sum subtotal for revenue reporting
--
-- 5. For profiles/history:
--    - Join with event_participants to get participant details
--    - Join with products to get current product info
--    - Join with events to get event context
