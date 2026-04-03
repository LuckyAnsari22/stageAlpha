-- ============================================================
-- StageAlpha — Event Equipment Rental Platform
-- db/schema.sql
-- 18 tables · 3NF · dependency-safe order · PostgreSQL 14+
-- ============================================================
-- Run:  psql $DATABASE_URL -f db/schema.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- CLEAN SLATE (reverse dependency order)
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS notifications       CASCADE;
DROP TABLE IF EXISTS quote_items         CASCADE;
DROP TABLE IF EXISTS quotes              CASCADE;
DROP TABLE IF EXISTS package_items       CASCADE;
DROP TABLE IF EXISTS packages            CASCADE;
DROP TABLE IF EXISTS staff_assignments   CASCADE;
DROP TABLE IF EXISTS audit_log           CASCADE;
DROP TABLE IF EXISTS revenue_snapshots   CASCADE;
DROP TABLE IF EXISTS backtest_results    CASCADE;
DROP TABLE IF EXISTS demand_forecasts    CASCADE;
DROP TABLE IF EXISTS elasticity_estimates CASCADE;
DROP TABLE IF EXISTS price_history       CASCADE;
DROP TABLE IF EXISTS pricing_rules       CASCADE;
DROP TABLE IF EXISTS reviews             CASCADE;
DROP TABLE IF EXISTS payments            CASCADE;
DROP TABLE IF EXISTS booking_staff       CASCADE;
DROP TABLE IF EXISTS booking_items       CASCADE;
DROP TABLE IF EXISTS bookings            CASCADE;
DROP TABLE IF EXISTS equipment           CASCADE;
DROP TABLE IF EXISTS staff               CASCADE;
DROP TABLE IF EXISTS customers           CASCADE;
DROP TABLE IF EXISTS venues              CASCADE;
DROP TABLE IF EXISTS categories          CASCADE;

-- ═══════════════════════════════════════════════
-- LAYER 1 — Independent tables (no FKs)
-- ═══════════════════════════════════════════════

-- 1. categories
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  icon_slug   VARCHAR(30),
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. venues
CREATE TABLE venues (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  city       VARCHAR(60)  NOT NULL,
  state      VARCHAR(60)  NOT NULL DEFAULT 'Maharashtra',
  address    TEXT,
  capacity   INT CHECK (capacity > 0),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. customers
CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(72)  NOT NULL,
  phone_hash    VARCHAR(72),
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'admin')),
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. staff
CREATE TABLE staff (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  phone_hash   VARCHAR(72),
  role         VARCHAR(50)  NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- LAYER 2 — Depends on Layer 1
-- ═══════════════════════════════════════════════

-- 5. equipment
CREATE TABLE equipment (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)   NOT NULL,
  category_id   INT            NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  base_price    DECIMAL(10,2)  NOT NULL CHECK (base_price > 0),
  current_price DECIMAL(10,2)  NOT NULL CHECK (current_price > 0),
  stock_qty     INT            NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  description   TEXT,
  specs         JSONB,
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- LAYER 3 — Transactional
-- ═══════════════════════════════════════════════

-- 6. bookings
CREATE TABLE bookings (
  id                  SERIAL PRIMARY KEY,
  customer_id         INT           NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_date          DATE          NOT NULL,
  venue_id            INT           REFERENCES venues(id) ON DELETE SET NULL,
  event_type          VARCHAR(50)   DEFAULT 'general',
  status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_pct             DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
  tax_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_requests    TEXT,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 7. booking_items
CREATE TABLE booking_items (
  id                         SERIAL PRIMARY KEY,
  booking_id                 INT           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  equipment_id               INT           NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  qty                        INT           NOT NULL CHECK (qty > 0),
  base_price_at_booking      DECIMAL(10,2) NOT NULL,
  algorithm_price_at_booking DECIMAL(10,2) NOT NULL,
  final_price                DECIMAL(10,2) NOT NULL,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, equipment_id)
);

-- 8. booking_staff
CREATE TABLE booking_staff (
  booking_id    INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id      INT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  role_at_event VARCHAR(50),
  PRIMARY KEY (booking_id, staff_id)
);

-- 9. payments
CREATE TABLE payments (
  id           SERIAL PRIMARY KEY,
  booking_id   INT           NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
  amount       DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  method       VARCHAR(30)   CHECK (method IN ('cash', 'upi', 'card', 'bank_transfer')),
  reference_no VARCHAR(100),
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'completed', 'refunded')),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 10. reviews
CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_visible  BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- LAYER 4 — Quantitative Engine
-- ═══════════════════════════════════════════════

-- 11. pricing_rules
CREATE TABLE pricing_rules (
  id              SERIAL PRIMARY KEY,
  equipment_id    INT REFERENCES equipment(id) ON DELETE CASCADE,
  rule_type       VARCHAR(30) NOT NULL
                  CHECK (rule_type IN ('seasonal', 'inventory', 'demand', 'event_type')),
  parameter_name  VARCHAR(50) NOT NULL,
  parameter_value DECIMAL(8,4) NOT NULL,
  effective_from  DATE,
  effective_to    DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 12. price_history
CREATE TABLE price_history (
  id             SERIAL PRIMARY KEY,
  equipment_id   INT           NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  old_price      DECIMAL(10,2) NOT NULL,
  new_price      DECIMAL(10,2) NOT NULL,
  change_pct     DECIMAL(6,2)  GENERATED ALWAYS AS (
                   ROUND((new_price - old_price) / old_price * 100, 2)
                 ) STORED,
  change_reason  VARCHAR(100),
  trigger_type   VARCHAR(20)   CHECK (trigger_type IN ('ALGORITHM', 'MANUAL', 'BATCH', 'SEASONAL')),
  changed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 13. elasticity_estimates
CREATE TABLE elasticity_estimates (
  id                SERIAL PRIMARY KEY,
  equipment_id      INT           NOT NULL REFERENCES equipment(id) ON DELETE CASCADE UNIQUE,
  elasticity_coeff  DECIMAL(8,4)  NOT NULL DEFAULT -1.5,
  demand_intercept  DECIMAL(10,4) DEFAULT 2.0,
  r_squared         DECIMAL(5,4)  DEFAULT 0 CHECK (r_squared BETWEEN 0 AND 1),
  sample_size       INT           DEFAULT 0,
  confidence_level  VARCHAR(10)   GENERATED ALWAYS AS (
                      CASE
                        WHEN r_squared >= 0.7 THEN 'HIGH'
                        WHEN r_squared >= 0.4 THEN 'MEDIUM'
                        ELSE 'LOW'
                      END
                    ) STORED,
  estimated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. demand_forecasts
CREATE TABLE demand_forecasts (
  id                 SERIAL PRIMARY KEY,
  equipment_id       INT           NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  forecast_week      DATE          NOT NULL,
  predicted_bookings DECIMAL(8,2),
  actual_bookings    INT,
  model_version      VARCHAR(20)   DEFAULT 'v1',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (equipment_id, forecast_week)
);

-- ═══════════════════════════════════════════════
-- LAYER 5 — Analytics & Audit
-- ═══════════════════════════════════════════════

-- 15. backtest_results
CREATE TABLE backtest_results (
  id                SERIAL PRIMARY KEY,
  period_start      DATE          NOT NULL,
  period_end        DATE          NOT NULL,
  n_bookings        INT,
  actual_revenue    DECIMAL(12,2),
  algorithm_revenue DECIMAL(12,2),
  improvement_pct   DECIMAL(6,2)  GENERATED ALWAYS AS (
                      CASE
                        WHEN actual_revenue > 0
                        THEN ROUND((algorithm_revenue - actual_revenue) / actual_revenue * 100, 2)
                        ELSE 0
                      END
                    ) STORED,
  notes             TEXT,
  run_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 16. revenue_snapshots
CREATE TABLE revenue_snapshots (
  id                   SERIAL PRIMARY KEY,
  snapshot_date        DATE          NOT NULL,
  period               VARCHAR(10)   NOT NULL CHECK (period IN ('day', 'week', 'month')),
  total_bookings       INT           DEFAULT 0,
  total_revenue        DECIMAL(12,2) DEFAULT 0,
  avg_booking_value    DECIMAL(10,2) DEFAULT 0,
  algorithm_uplift_pct DECIMAL(6,2)  DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (snapshot_date, period)
);

-- 17. audit_log
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation  VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id  INT         NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by INT         REFERENCES customers(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- LAYER 6 — Packages, Quotes, Notifications
-- ═══════════════════════════════════════════════

-- 19. Packages
CREATE TABLE packages (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  event_type  VARCHAR(50),
  discount_pct DECIMAL(5,2) DEFAULT 0 CHECK(discount_pct >= 0 AND discount_pct <= 50),
  is_featured BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE packages IS 'Pre-built event equipment bundles (Wedding Package, Corporate Setup, etc.)';

-- 20. Package Items
CREATE TABLE package_items (
  id           SERIAL PRIMARY KEY,
  package_id   INT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  equipment_id INT NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  qty          INT NOT NULL DEFAULT 1 CHECK(qty > 0),
  sort_order   INT DEFAULT 0,
  UNIQUE(package_id, equipment_id)
);

-- 21. Quotes
CREATE TABLE quotes (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_date   DATE NOT NULL,
  venue_id     INT REFERENCES venues(id) ON DELETE SET NULL,
  event_type   VARCHAR(50) DEFAULT 'general',
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK(status IN ('pending','sent','accepted','rejected','expired','converted')),
  subtotal     DECIMAL(10,2) DEFAULT 0,
  tax_amount   DECIMAL(10,2) DEFAULT 0,
  total_price  DECIMAL(10,2) DEFAULT 0,
  valid_until  TIMESTAMPTZ,
  notes        TEXT,
  admin_notes  TEXT,
  converted_booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE quotes IS 'Customer quote requests before committing to a booking';

-- 22. Quote Items
CREATE TABLE quote_items (
  id           SERIAL PRIMARY KEY,
  quote_id     INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  equipment_id INT NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  qty          INT NOT NULL CHECK(qty > 0),
  unit_price   DECIMAL(10,2) NOT NULL,
  UNIQUE(quote_id, equipment_id)
);

-- 23. Notifications
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(150) NOT NULL,
  message     TEXT NOT NULL,
  link        VARCHAR(200),
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Staff Assignments (enhanced from booking_staff)
-- Keep booking_staff for the M:N, add this for richer data
CREATE TABLE staff_assignments (
  id           SERIAL PRIMARY KEY,
  booking_id   INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id     INT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  role_at_event VARCHAR(50),
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  notes        TEXT,
  UNIQUE(booking_id, staff_id)
);

-- Full-text search on equipment (ALTER existing table)
-- Add tsvector column for fast full-text search
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- ═══════════════════════════════════════════════
-- INDEXES (created after all tables)
-- ═══════════════════════════════════════════════

-- equipment lookups
CREATE INDEX idx_equipment_category      ON equipment (category_id);
CREATE INDEX idx_equipment_active_price  ON equipment (is_active, current_price);

-- booking queries
CREATE INDEX idx_bookings_customer       ON bookings (customer_id);
CREATE INDEX idx_bookings_date           ON bookings (event_date);
CREATE INDEX idx_bookings_status         ON bookings (status);
CREATE INDEX idx_bookings_customer_date  ON bookings (customer_id, created_at DESC);

-- booking items
CREATE INDEX idx_booking_items_booking   ON booking_items (booking_id);
CREATE INDEX idx_booking_items_equipment ON booking_items (equipment_id);

-- price history (time-series)
CREATE INDEX idx_price_history_equipment ON price_history (equipment_id, changed_at DESC);

-- audit log
CREATE INDEX idx_audit_log_table_record  ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_time          ON audit_log (changed_at DESC);

-- notifications
CREATE INDEX idx_notifications_customer ON notifications(customer_id, is_read, created_at DESC);

-- equipment fts
CREATE INDEX idx_equipment_fts ON equipment USING GIN(search_vector);
COMMENT ON COLUMN equipment.search_vector IS 
  'Full-text search vector. A-weight on name, B-weight on description. Uses GIN index.';

-- ═══════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type   = 'BASE TABLE';

  RAISE NOTICE '✓ % tables created', cnt;

  IF cnt < 23 THEN
    RAISE EXCEPTION 'Expected 23 tables, got %', cnt;
  END IF;
END $$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
