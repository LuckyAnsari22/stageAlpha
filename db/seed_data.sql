-- ============================================
-- StageAlpha: Seed Data
-- Realistic customers, categories, equipment, bookings
-- Password hash is bcrypt of "Password@123"
-- ============================================

-- Admin account (password: Admin@123)
INSERT INTO customers (name, email, phone, password_hash, role) VALUES
('Admin User', 'admin@stagealpha.com', '9000000001', '$2a$10$26fUXNxT2dFZUfO71lC5ZOOA.V6lL5Dhxum2JqhsHlEJkPRCv2rLq', 'admin');

-- Customer accounts (password: Password@123)
INSERT INTO customers (name, email, phone, password_hash, role) VALUES
('Rahul Sharma', 'rahul@example.com', '9876543210', '$2a$10$26fUXNxT2dFZUfO71lC5ZOOA.V6lL5Dhxum2JqhsHlEJkPRCv2rLq', 'customer'),
('Priya Patel', 'priya@example.com', '8765432109', '$2a$10$26fUXNxT2dFZUfO71lC5ZOOA.V6lL5Dhxum2JqhsHlEJkPRCv2rLq', 'customer'),
('Amit Desai', 'amit@example.com', '7654321098', '$2a$10$26fUXNxT2dFZUfO71lC5ZOOA.V6lL5Dhxum2JqhsHlEJkPRCv2rLq', 'customer');

-- Categories
INSERT INTO categories (name, description) VALUES 
('Sound Systems', 'Professional JBL speakers, amplifiers, mixers, and wireless microphones'),
('Lighting', 'LED Pars, moving heads, strobes, and architectural wash lights'),
('Staging', 'Aluminium truss, podiums, platforms, and backdrops'),
('Visual', 'LED walls, projectors, and display screens');

-- Equipment (realistic Indian event rental pricing in ₹)
INSERT INTO equipment (category_id, name, price_per_day, stock, image_url) VALUES 
(1, 'JBL VTX V20 Line Array (pair)', 8000.00, 6, ''),
(1, 'JBL EON 615 Portable Speaker', 2500.00, 10, ''),
(1, 'Yamaha MG16XU 16-Channel Mixer', 1500.00, 5, ''),
(1, 'Shure SM58 Wireless Mic Kit', 800.00, 15, ''),
(2, 'LED Par 54x3W RGBW (set of 8)', 500.00, 30, ''),
(2, 'Moving Head Beam 230W', 1200.00, 12, ''),
(2, 'Follow Spot 1200W', 2000.00, 4, ''),
(3, 'Aluminium Box Truss 20x20ft', 5000.00, 3, ''),
(3, 'Portable Stage Platform 8x4ft', 3000.00, 8, ''),
(3, 'DJ Console Stand with Facade', 1800.00, 6, ''),
(4, 'Absen 2.5mm Indoor LED Wall (per panel)', 12000.00, 20, ''),
(4, 'Epson EB-L1755U Projector 15000lm', 6000.00, 3, '');


-- Sample bookings
INSERT INTO bookings (customer_id, start_date, end_date, total_amount, status) VALUES 
(2, CURRENT_DATE + 5, CURRENT_DATE + 7, 24000.00, 'Confirmed'),
(3, CURRENT_DATE + 10, CURRENT_DATE + 11, 7500.00, 'Pending'),
(4, CURRENT_DATE - 3, CURRENT_DATE - 1, 15000.00, 'Completed'),
(2, CURRENT_DATE + 20, CURRENT_DATE + 22, 30000.00, 'Pending');

-- Booking items for above bookings
INSERT INTO booking_items (booking_id, equipment_id, quantity, price) VALUES 
(1, 1, 1, 8000.00),
(1, 5, 8, 500.00),
(1, 6, 4, 1200.00),
(2, 3, 1, 1500.00),
(2, 4, 3, 800.00),
(2, 9, 1, 3000.00),
(3, 2, 2, 2500.00),
(3, 8, 1, 5000.00),
(3, 10, 2, 1800.00),
(4, 11, 2, 12000.00),
(4, 6, 3, 1200.00);

-- Quant simulation agent for elasticity testing
INSERT INTO customers (name, email, phone, password_hash, role) VALUES
('Simulation Agent', 'quant@stagealpha.local', '0000000000', '$2a$10$XQCg1z4YL1HGJQOu8ISJaOTHhL1m2OY0E3cNsVZzYXqB0F3sT1XYy', 'customer');
