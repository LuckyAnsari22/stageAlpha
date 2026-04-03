-- ============================================================
-- StageAlpha — Event Equipment Rental Platform
-- db/seed.sql
-- Realistic Indian market data with price tier variance
-- ============================================================
-- Run:  psql $DATABASE_URL -f db/seed.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. CLEAN SLATE & RESET
-- ─────────────────────────────────────────────
TRUNCATE 
    notifications, quote_items, quotes, package_items, packages, staff_assignments,
    audit_log, revenue_snapshots, backtest_results, demand_forecasts, 
    elasticity_estimates, price_history, pricing_rules, reviews, payments, 
    booking_staff, booking_items, bookings, equipment, staff, customers, 
    venues, categories 
RESTART IDENTITY CASCADE;

-- Disable all triggers during seed to prevent historical data from depleting stock
SET session_replication_role = 'replica';

-- ─────────────────────────────────────────────
-- 2. STATIC LOOKUP DATA (LAYER 1 & 2)
-- ─────────────────────────────────────────────

INSERT INTO categories (id, name, description, icon_slug, sort_order) VALUES
(1, 'PA Systems',         'Professional audio amplification', 'speaker',   1),
(2, 'DJ Equipment',       'Mixers, controllers, CDJs',        'music',     2),
(3, 'Stage Lighting',     'LED pars, moving heads, wash',     'lightbulb', 3),
(4, 'Microphones',        'Wired, wireless, lapel mics',      'mic',       4),
(5, 'Cables & Stands',    'Power, audio, speaker stands',     'cable',     5);

INSERT INTO venues (id, name, city, state, capacity) VALUES
(1, 'Sai Mangal Karyalay',    'Shirpur',   'Maharashtra', 800),
(2, 'Rajwada Lawns',          'Dhule',     'Maharashtra', 1500),
(3, 'Hotel Grand Pratap',     'Nashik',    'Maharashtra', 400),
(4, 'Silver Oak Banquet',     'Shirpur',   'Maharashtra', 600),
(5, 'Community Hall, MPSTME', 'Shirpur',   'Maharashtra', 1200),
(6, 'Green Valley Resort',    'Nandurbar', 'Maharashtra', 2000),
(7, 'Siddhi Vinayak Lawn',    'Dhule',     'Maharashtra', 2500),
(8, 'Regal Garden',           'Shirpur',   'Maharashtra', 1000);

INSERT INTO staff (id, name, role) VALUES
(1, 'Ganesh Patil',   'Operator'),
(2, 'Raju Sonawane',  'Driver'),
(3, 'Prakash More',   'Technician'),
(4, 'Sunil Borse',    'Assistant');

INSERT INTO equipment (id, category_id, name, base_price, current_price, stock_qty) VALUES
(1,  1, 'JBL SRX812P Speaker',      2500, 2750, 6 ),
(2,  1, 'JBL SRX818SP Subwoofer',   3500, 3850, 4 ),
(3,  1, 'Yamaha MG20XU Mixer',      1800, 1980, 3 ),
(4,  1, 'Crown XTi 2002 Amplifier', 1500, 1650, 4 ),
(5,  2, 'Pioneer CDJ-2000NXS',      4500, 5400, 2 ),
(6,  2, 'Pioneer DJM-900NXS2',      4000, 4800, 2 ),
(7,  2, 'Numark NS7III Controller', 2000, 2200, 3 ),
(8,  2, 'Denon SC6000 Prime',       3000, 3300, 2 ),
(9,  3, 'Chauvet Intimidator 120',  1200, 1320, 10),
(10, 3, 'ADJ Mega Tri Par Profile', 400,  440,  20),
(11, 3, 'Martin MAC Aura',          2200, 2640, 6 ),
(12, 3, 'Chauvet DJ FX Laser',      800,  880,  8 ),
(13, 4, 'Shure SM58 Mic',           400,  400,  15),
(14, 4, 'Shure Beta 87A Condenser', 900,  900,  8 ),
(15, 4, 'Sennheiser ew135 G4',      1200, 1320, 6 ),
(16, 4, 'Shure ULXD2 Wireless',     1800, 1980, 4 ),
(17, 5, 'XLR Cable 6m',             80,   80,   50),
(18, 5, 'Speaker Stand Heavy Duty', 150,  150,  20),
(19, 5, 'Power Strip Extension',    60,   60,   30),
(20, 5, 'Stage Monitor Wedge',      600,  660,  8 );

INSERT INTO customers (id, name, email, password_hash, role) VALUES
(1,  'Lucky Admin',     'admin@stagealpha.com',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'admin'),
(2,  'Rajesh Sharma',   'rajesh.sharma@gmail.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(3,  'Priya Patel',     'priya.patel@yahoo.com',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(4,  'Mohammed Shaikh', 'm.shaikh@gmail.com',        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(5,  'Anita Desai',     'anita.desai@gmail.com',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(6,  'Vikram Nair',     'vikram.nair@gmail.com',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(7,  'Sunita Joshi',    'sunita.joshi@gmail.com',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(8,  'Arun Kumar',      'arun.kumar@gmail.com',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(9,  'Deepa Mehta',     'deepa.mehta@gmail.com',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(10, 'Sanjay Patil',    'sanjay.patil@gmail.com',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(11, 'Rekha Gupta',     'rekha.gupta@gmail.com',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer'),
(12, 'Abhishek Singh',  'abhi.singh@gmail.com',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJlUDK8jcI1HJTP0P7M8iVY79Vu', 'customer');

-- Sync sequences for explicit ID inserts
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('venues_id_seq',     (SELECT MAX(id) FROM venues));
SELECT setval('staff_id_seq',      (SELECT MAX(id) FROM staff));
SELECT setval('equipment_id_seq',  (SELECT MAX(id) FROM equipment));
SELECT setval('customers_id_seq',  (SELECT MAX(id) FROM customers));

-- ─────────────────────────────────────────────
-- 3. PROCEDURAL GENERATION: Bookings & Items
-- ─────────────────────────────────────────────
DO $$
DECLARE
    cur_booking_id INT;
    bk_date DATE;
    bk_month INT;
    cust_id INT;
    ven_id INT;
    evt_type VARCHAR;
    evt_status VARCHAR;
    season_mult DECIMAL;
    create_offset INT;
    
    eq_id INT;
    eq_base DECIMAL;
    eq_qty INT;
    alg_price DECIMAL;
    
    rand_val FLOAT;
    i INT;
    j INT;
    n_items INT;
    eq_record RECORD;
BEGIN
    FOR i IN 1..250 LOOP
        -- DATES: Skewed towards Wedding/Festive (Q1/Q4)
        rand_val := random();
        IF rand_val < 0.20 THEN bk_month := floor(random() * 2) + 1;       -- Jan, Feb (20%)
        ELSIF rand_val < 0.45 THEN bk_month := floor(random() * 2) + 11;   -- Nov, Dec (25%)
        ELSIF rand_val < 0.80 THEN bk_month := floor(random() * 3) + 3;    -- Mar, Apr, May (35%)
        ELSE bk_month := floor(random() * 5) + 6;                          -- Jun-Oct (20%)
        END IF;
        
        bk_date := make_date(2025, bk_month, 1) + (floor(random() * 28)::int);
        create_offset := floor(random() * 30 + 5)::int; -- Booked 5-35 days in advance
        
        -- RELATIONSHIPS
        cust_id := floor(random() * 11) + 2; -- 2 through 12
        ven_id := floor(random() * 8) + 1;
        
        -- EVENT TYPES
        rand_val := random();
        IF rand_val < 0.3 THEN evt_type := 'wedding';
        ELSIF rand_val < 0.5 THEN evt_type := 'birthday';
        ELSIF rand_val < 0.7 THEN evt_type := 'corporate';
        ELSIF rand_val < 0.85 THEN evt_type := 'concert';
        ELSE evt_type := 'college_fest';
        END IF;

        -- STATUS
        rand_val := random();
        IF rand_val < 0.70 THEN evt_status := 'completed';
        ELSIF rand_val < 0.80 THEN evt_status := 'cancelled';
        ELSIF rand_val < 0.90 THEN evt_status := 'confirmed';
        ELSE evt_status := 'pending';
        END IF;

        -- INSERT BOOKING HEADER
        INSERT INTO bookings (customer_id, event_date, venue_id, event_type, status, created_at, updated_at)
        VALUES (
            cust_id, 
            bk_date, 
            ven_id, 
            evt_type, 
            evt_status, 
            (bk_date - create_offset) + time '10:00:00' + (random() * interval '8 hours'),
            (bk_date - create_offset + 1) + time '10:00:00' + (random() * interval '8 hours')
        ) RETURNING id INTO cur_booking_id;

        -- GENERATE ITEMS (2-5 per booking)
        n_items := floor(random() * 4) + 2;
        
        -- SEASONAL PRICING MULTIPLIER (Elasticity setup)
        IF bk_month IN (1, 2, 11, 12) THEN season_mult := 1.25; -- Peak Season (+25%)
        ELSIF bk_month IN (3, 4, 5, 10) THEN season_mult := 1.0; -- Normal Season 
        ELSE season_mult := 0.85;                                -- Off-Season (-15%)
        END IF;

        -- For tracking uniqueness in items loop
        -- We will just use an ORDER BY random() query
        FOR eq_record IN (SELECT id, base_price FROM equipment ORDER BY random() LIMIT n_items) LOOP
            eq_id := eq_record.id;
            eq_base := eq_record.base_price;
            
            -- Apply random noise to the specific booking's item price (-5% to +10%)
            alg_price := eq_base * season_mult * (0.95 + random() * 0.15);
            alg_price := ROUND(alg_price, 2);
            
            -- Quantity inverse to price (rudimentary demand curve)
            IF alg_price > eq_base * 1.1 THEN eq_qty := 1;
            ELSIF alg_price < eq_base * 0.9 THEN eq_qty := floor(random() * 2) + 2; -- 2 or 3
            ELSE eq_qty := floor(random() * 2) + 1; -- 1 or 2
            END IF;

            INSERT INTO booking_items (booking_id, equipment_id, qty, base_price_at_booking, algorithm_price_at_booking, final_price)
            VALUES (cur_booking_id, eq_id, eq_qty, eq_base, alg_price, alg_price);
        END LOOP;

        -- UPDATE BOOKING TOTALS BASED ON ITEMS
        WITH totals AS (
            SELECT SUM(qty * final_price) as st 
            FROM booking_items WHERE booking_id = cur_booking_id
        )
        UPDATE bookings 
        SET subtotal = COALESCE(totals.st, 0),
            tax_amount = ROUND(COALESCE(totals.st, 0) * (tax_pct/100.0), 2),
            total_price = ROUND(COALESCE(totals.st, 0) * (1 + tax_pct/100.0), 2)
        FROM totals
        WHERE id = cur_booking_id;

    END LOOP;
END $$;


-- ─────────────────────────────────────────────
-- 4. DEPENDENT DATA: PAYMENTS & REVIEWS
-- ─────────────────────────────────────────────

-- PAYMENTS for all COMPLETED bookings (45% upi, 30% cash, 15% bank, 10% card)
INSERT INTO payments (booking_id, amount, method, status, paid_at, created_at)
SELECT 
    id,
    total_price,
    CASE 
        WHEN random() < 0.45 THEN 'upi'
        WHEN random() < 0.75 THEN 'cash'
        WHEN random() < 0.90 THEN 'bank_transfer'
        ELSE 'card'
    END,
    'completed',
    event_date,
    event_date - (floor(random()*3) || ' days')::interval
FROM bookings 
WHERE status = 'completed';

-- REVIEWS for ~55% of completed bookings
INSERT INTO reviews (booking_id, customer_id, rating, comment, created_at)
SELECT 
    b.id,
    b.customer_id,
    CASE 
        WHEN random() < 0.40 THEN 5
        WHEN random() < 0.75 THEN 4
        WHEN random() < 0.95 THEN 3
        WHEN random() < 0.99 THEN 2
        ELSE 1
    END as generated_rating,
    CASE (floor(random() * 3)::int)
        WHEN 0 THEN 'Great experience, the sound system worked flawlessly.'
        WHEN 1 THEN 'Setup was on time and professional.'
        ELSE 'Good equipment, fair pricing.'
    END as generated_comment,
    b.event_date + (floor(random()*5) + 1 || ' days')::interval
FROM bookings b
WHERE b.status = 'completed' AND random() < 0.55;

-- Update specific review comments based on ratings
UPDATE reviews SET comment = 'Absolutely fantastic! The JBL speakers were pristine and the bass shook the entire venue. Highly recommended for weddings!' WHERE rating = 5 AND random() < 0.3;
UPDATE reviews SET comment = 'Very good service. The stage lighting was slightly delayed in setup but looked great during the event.' WHERE rating = 4 AND random() < 0.3;
UPDATE reviews SET comment = 'Decent equipment but the mixer had a scratchy fader. Did the job but could be maintained better.' WHERE rating = 3 AND random() < 0.3;
UPDATE reviews SET comment = 'Disappointing. The wireless mics kept cutting out during the speech.' WHERE rating < 3 AND random() < 0.5;


-- ─────────────────────────────────────────────
-- 5. ANALYTICS DATA: PRICE HISTORY
-- ─────────────────────────────────────────────
DO $$
DECLARE
    eq_rec RECORD;
    i INT;
    p_old DECIMAL;
    p_new DECIMAL;
    reason_arr VARCHAR[] := ARRAY['Inventory Low', 'Wedding Season Spike', 'Off-season Discount', 'Manual Adjustment'];
BEGIN
    FOR eq_rec IN SELECT id, base_price FROM equipment LOOP
        p_old := eq_rec.base_price;
        -- Generate 5 price changes per equipment over the year
        FOR i IN 1..5 LOOP
            p_new := ROUND((eq_rec.base_price * (0.8 + random() * 0.4))::numeric, 2);
            
            INSERT INTO price_history (equipment_id, old_price, new_price, change_reason, trigger_type, changed_at)
            VALUES (
                eq_rec.id, 
                p_old, 
                p_new, 
                reason_arr[floor(random() * 4) + 1], 
                CASE WHEN random() > 0.3 THEN 'ALGORITHM' ELSE 'MANUAL' END,
                make_date(2025, i*2, 1) + (floor(random()*20)::int) -- Spread out bi-monthly
            );
            p_old := p_new;
        END LOOP;
        
        -- Sync equipment's current_price with the last price_history entry
        UPDATE equipment SET current_price = p_new, updated_at = NOW() WHERE id = eq_rec.id;
    END LOOP;
END $$;


-- ─────────────────────────────────────────────
-- 5B. PACKAGES SEED
-- ─────────────────────────────────────────────
-- Seed packages
INSERT INTO packages (name, slug, description, event_type, discount_pct, is_featured) VALUES
  ('Wedding Essential', 'wedding-essential', 
   'Complete audio-visual setup for a 200-500 guest wedding: PA system, mixer, wireless mics, basic lighting', 
   'wedding', 5, true),
  ('DJ Night Setup', 'dj-night-setup',
   'Full DJ rig: CDJs, mixer, controller, subs, LED lighting effects',
   'concert', 8, true),
  ('Corporate Conference', 'corporate-conference', 
   'Professional conference audio: podium mic, lapel mics, speakers, clean lighting',
   'corporate', 5, false),
  ('College Fest Pack', 'college-fest-pack',
   'High-energy fest setup: powerful PA, DJ equipment, stage lighting',
   'college_fest', 10, true);

-- Link packages to equipment (adjust IDs to match your seed data)
INSERT INTO package_items (package_id, equipment_id, qty, sort_order) VALUES
  (1, 1, 2, 1), (1, 3, 1, 2), (1, 13, 2, 3), (1, 15, 2, 4),  -- Wedding
  (2, 5, 2, 1), (2, 6, 1, 2), (2, 2, 2, 3), (2, 9, 8, 4),    -- DJ Night
  (3, 1, 1, 1), (3, 3, 1, 2), (3, 13, 4, 3), (3, 16, 1, 4),  -- Corporate
  (4, 1, 4, 1), (4, 5, 1, 2), (4, 6, 1, 3), (4, 9, 12, 4);   -- College Fest


-- ─────────────────────────────────────────────
-- 6. VERIFICATION SUMMARY
-- ─────────────────────────────────────────────
SELECT 'categories' AS tbl, COUNT(*) FROM categories
UNION ALL SELECT 'venues', COUNT(*) FROM venues
UNION ALL SELECT 'staff', COUNT(*) FROM staff
UNION ALL SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'booking_items', COUNT(*) FROM booking_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'price_history', COUNT(*) FROM price_history
UNION ALL SELECT 'packages', COUNT(*) FROM packages
UNION ALL SELECT 'package_items', COUNT(*) FROM package_items;

-- Re-enable triggers
SET session_replication_role = 'origin';
