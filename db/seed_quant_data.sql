-- StageAlpha Quantitative Seed Generator
-- Simulates historical elasticity constraints specifically avoiding 
-- 'price_variants = 1' which causes Native PostgreSQL REGR_SLOPE functions to yield NaN.

-- 1. Insert Base Equipment Clusters if they don't exist
INSERT INTO categories (name, description) VALUES 
('Quantum Acoustics', 'High fidelity array structures'),
('Visual Dynamics', 'LED walls and laser metrics')
ON CONFLICT DO NOTHING;

INSERT INTO equipment (category_id, name, base_price, current_price, stock_qty, image_url) VALUES 
(1, 'L-Acoustics K2 Line Array', 8500.00, 8500.00, 24, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&q=80'),
(2, 'Absen 2.5mm LED Module', 12000.00, 12000.00, 50, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, email, phone_hash, password_hash) VALUES
('Algorithmic Simulation Agent', 'quant@stagealpha.local', '0000000000', '$2a$10$XQCg1z4YL1HGJQOu8ISJaOTHhL1m2OY0E3cNsVZzYXqB0F3sT1XYy')
ON CONFLICT DO NOTHING;

-- 2. Massive Elasticity Simulation (15 bookings per node minimum)
DO $$
DECLARE
    eq_record RECORD;
    cust_id INT;
    i INT;
    random_price DECIMAL(10,2);
    random_qty INT;
    new_booking_id INT;
BEGIN
    SELECT id INTO cust_id FROM customers WHERE email = 'quant@stagealpha.local' LIMIT 1;
    
    FOR eq_record IN SELECT id, base_price FROM equipment LOOP
        FOR i IN 1..15 LOOP
            -- Introduce synthetic elastic variance (±20% Base Price Margin)
            -- This explicitly solves the OLS regression fault (price_variants > 3 requirement)
            random_price := eq_record.base_price * (0.8 + random() * 0.4);
            
            -- If price drops, quantity likely increases (simulating -1.5 < ε < -0.5 Log-Log elasticity)
            IF random_price < eq_record.base_price THEN
                random_qty := floor(random() * 5 + 4); -- Higher yield: 4-8 units
            ELSE
                random_qty := floor(random() * 3 + 1); -- Lower yield: 1-3 units
            END IF;

            -- Insert the synthetic transaction
            INSERT INTO bookings (customer_id, event_date, venue_id, status, subtotal, tax_amount, total_price)
            VALUES (cust_id, CURRENT_DATE - (i || ' days')::interval, 1, 'completed', random_price * random_qty, 0, random_price * random_qty)
            RETURNING id INTO new_booking_id;

            INSERT INTO booking_items (booking_id, equipment_id, qty, base_price_at_booking, algorithm_price_at_booking, final_price)
            VALUES (new_booking_id, eq_record.id, random_qty, eq_record.base_price, random_price, random_price);

        END LOOP;
    END LOOP;
END $$;
