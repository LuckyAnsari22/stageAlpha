-- StageAlpha PostgreSQL Notify Function for Real-time Socket Synchronization
-- Matches the architecture outlined in github.com/awaissaddiqui/inventory-live-tracker

-- 1. Create a generic notification function that formats the event exactly how Node.js expects
CREATE OR REPLACE FUNCTION notify_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        payload = json_build_object('action', 'DELETE', 'data', row_to_json(OLD));
    ELSIF (TG_OP = 'UPDATE') THEN
        payload = json_build_object('action', 'UPDATE', 'data', row_to_json(NEW));
    ELSIF (TG_OP = 'INSERT') THEN
        payload = json_build_object('action', 'INSERT', 'data', row_to_json(NEW));
    END IF;
    PERFORM pg_notify('inventory_change', payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the function to track changes exclusively on the vital equipment inventory
DROP TRIGGER IF EXISTS trg_notify_equipment_change ON equipment;
CREATE TRIGGER trg_notify_equipment_change
    AFTER INSERT OR UPDATE OR DELETE ON equipment
    FOR EACH ROW EXECUTE FUNCTION notify_inventory_change();


-- 3. Dedicated Financial Tracker (Protected Information)
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload = json_build_object('action', 'INSERT', 'data', row_to_json(NEW));
    PERFORM pg_notify('price_change', payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_price_change ON price_audit_log;
CREATE TRIGGER trg_notify_price_change
    AFTER INSERT ON price_audit_log
    FOR EACH ROW EXECUTE FUNCTION notify_price_change();

