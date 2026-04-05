-- ============================================================
-- StageAlpha — Event Equipment Rental Platform
-- db/triggers.sql
-- 5 Triggers: Stock, Audit, Timestamps, Totals
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Timestamp Auto-Updater
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to mutable tables
DROP TRIGGER IF EXISTS update_venues_modtime ON venues;
CREATE TRIGGER update_venues_modtime BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();

DROP TRIGGER IF EXISTS update_customers_modtime ON customers;
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();

DROP TRIGGER IF EXISTS update_equipment_modtime ON equipment;
CREATE TRIGGER update_equipment_modtime BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();

DROP TRIGGER IF EXISTS update_bookings_modtime ON bookings;
CREATE TRIGGER update_bookings_modtime BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();

DROP TRIGGER IF EXISTS update_packages_modtime ON packages;
CREATE TRIGGER update_packages_modtime BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();

DROP TRIGGER IF EXISTS update_quotes_modtime ON quotes;
CREATE TRIGGER update_quotes_modtime BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION trg_update_modified_column();


-- ─────────────────────────────────────────────
-- 2. Stock Management (Auto Reserve/Release)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_manage_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE equipment SET stock_qty = stock_qty - NEW.qty WHERE id = NEW.equipment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE equipment SET stock_qty = stock_qty + OLD.qty WHERE id = OLD.equipment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manage_stock_on_booking ON booking_items;
CREATE TRIGGER manage_stock_on_booking
AFTER INSERT OR DELETE ON booking_items
FOR EACH ROW EXECUTE FUNCTION trg_manage_stock();


-- ─────────────────────────────────────────────
-- 3. Audit Logging (JSONB Diff)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_audit_logger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_values)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_values)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_pricing_rules ON pricing_rules;
CREATE TRIGGER audit_pricing_rules
AFTER INSERT OR UPDATE OR DELETE ON pricing_rules
FOR EACH ROW EXECUTE FUNCTION trg_audit_logger();


-- ─────────────────────────────────────────────
-- 4. Calculate Booking Totals
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_calculate_booking_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_bid INT;
BEGIN
    IF TG_OP = 'DELETE' THEN v_bid := OLD.booking_id;
    ELSE v_bid := NEW.booking_id; END IF;

    WITH totals AS (
        SELECT COALESCE(SUM(qty * final_price), 0) as st 
        FROM booking_items WHERE booking_id = v_bid
    )
    UPDATE bookings 
    SET subtotal = totals.st,
        tax_amount = ROUND(totals.st * (tax_pct/100.0), 2),
        total_price = ROUND(totals.st * (1 + tax_pct/100.0), 2),
        updated_at = NOW()
    FROM totals
    WHERE id = v_bid;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_totals ON booking_items;
CREATE TRIGGER trigger_booking_totals
AFTER INSERT OR UPDATE OR DELETE ON booking_items
FOR EACH ROW EXECUTE FUNCTION trg_calculate_booking_totals();


-- ─────────────────────────────────────────────
-- 5. Prevent Overbooking Constraints
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_check_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_stock INT;
BEGIN
    SELECT stock_qty INTO v_stock FROM equipment WHERE id = NEW.equipment_id;
    IF v_stock < NEW.qty THEN
        RAISE EXCEPTION 'Insufficient stock. Only % available.', v_stock;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_availability_before_insert ON booking_items;
CREATE TRIGGER check_availability_before_insert
BEFORE INSERT ON booking_items
FOR EACH ROW EXECUTE FUNCTION trg_check_availability();
