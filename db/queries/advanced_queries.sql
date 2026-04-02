-- =============================================================================
-- ADVANCED SQL QUERIES FOR STAGEALPHA
-- =============================================================================
-- These two queries complete the 20-query requirement from SQL-01
-- Missing components: Full Text Search + JSONB queries
-- =============================================================================

-- =============================================================================
-- QUERY 19: FULL TEXT SEARCH on Equipment Description
-- =============================================================================
-- Business question: 
-- Find all equipment matching a customer's search for "powerful speakers with wireless"
-- Must handle typos and partial matches (FTS advantage over LIKE)
--
-- DBMS concept demonstrated: 
-- Full-text search (tsvector + tsquery), query ranking, relevance ordering
-- Course CO: CO2 (Advanced SQL and Information Systems)
--
-- SQL Features:
-- - tsvector: tokenized, stemmed text index
-- - to_tsquery: converts natural language to PostgreSQL query format
-- - ts_rank: relevance scoring (where in document, frequency)
-- - ILIKE: case-insensitive LIKE for fallback
--
-- Performance notes:
-- - With GIN index on tsvector: <10ms for large corpus
-- - Without index: would require full table scan (expensive)

CREATE INDEX idx_equipment_description_fts ON equipment 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

SELECT 
  equipment_id,
  name,
  description,
  category_id,
  base_price,
  current_price,
  stock_qty,
  -- Relevance score: higher = better match
  ts_rank(
    to_tsvector('english', name || ' ' || COALESCE(description, '')),
    to_tsquery('english', 'powerful & speakers & wireless')
  ) AS relevance_score,
  -- Debug: show which words matched
  (to_tsvector('english', name || ' ' || COALESCE(description, '')) 
   @@ to_tsquery('english', 'powerful & speakers & wireless')) AS matches_all_terms
FROM equipment
WHERE 
  -- Match: name OR description contains all query terms (AND logic)
  to_tsvector('english', name || ' ' || COALESCE(description, '')) 
  @@ to_tsquery('english', 'powerful & speakers & wireless')
  
  -- Fallback: LIKE for phrases that won't convert to tsquery
  OR name ILIKE '%powerful%' OR description ILIKE '%wireless%'
ORDER BY 
  relevance_score DESC,
  name ASC
LIMIT 20;

-- Alternative: Phrase search (terms must appear in order)
-- Useful for brand names like "Shure SM58"
SELECT 
  equipment_id,
  name,
  base_price,
  ts_rank(
    to_tsvector('english', name || ' ' || COALESCE(description, '')),
    phraseto_tsquery('english', 'Shure SM58')
  ) AS relevance_score
FROM equipment
WHERE 
  to_tsvector('english', name || ' ' || COALESCE(description, '')) 
  @@ phraseto_tsquery('english', 'Shure SM58')
ORDER BY relevance_score DESC;

---

-- =============================================================================
-- QUERY 20: JSONB Query on audit_log for Financial Compliance
-- =============================================================================
-- Business question:
-- Show all equipment price changes from management review: 
-- What prices were set, who set them, old→new comparison, timestamp?
-- This is the audit trail for financial compliance (critical for auditors).
--
-- DBMS concept demonstrated:
-- JSONB operators: @>, ->, ->>
-- Type casting, JSON path expressions
-- Document aggregation
-- Course CO: CO3 (Information Security and Governance)
--
-- SQL Features:
-- - old_values @> '{"current_price": ...}' : check if JSONB contains field
-- - old_values->>'current_price'::numeric : extract and cast to number
-- - jsonb_each(): expand JSONB to rows for analysis
-- - String concatenation: old_values || new_values
--
-- Why JSONB vs separate columns?
-- Different tables have different schemas:
-- - equipment changes: {price, stock, is_active}
-- - booking changes: {status, total_price}
-- - customer changes: {name, email}
-- Single audit_log table handles all with flexible JSONB

SELECT 
  log_id,
  changed_at,
  changed_by,
  table_name,
  record_id,
  operation,
  
  -- Extract old price (safely handle missing field)
  CASE 
    WHEN old_values IS NULL THEN NULL
    ELSE (old_values->>'current_price')::NUMERIC
  END AS old_price,
  
  -- Extract new price
  CASE 
    WHEN new_values IS NULL THEN NULL
    ELSE (new_values->>'current_price')::NUMERIC
  END AS new_price,
  
  -- Calculate price change percentage
  CASE 
    WHEN old_values IS NULL OR new_values IS NULL THEN NULL
    WHEN (old_values->>'current_price')::NUMERIC = 0 THEN NULL
    ELSE ROUND(
      (
        (new_values->>'current_price')::NUMERIC - 
        (old_values->>'current_price')::NUMERIC
      ) / (old_values->>'current_price')::NUMERIC * 100,
      2
    )
  END AS price_change_pct,
  
  -- Full JSON for inspection
  old_values AS old_state,
  new_values AS new_state
  
FROM audit_log
WHERE 
  -- Filter: only equipment table price updates
  table_name = 'equipment'
  AND operation IN ('UPDATE')
  -- Check that old_values contains current_price field (price update)
  AND old_values ? 'current_price'
  AND new_values ? 'current_price'
  -- Only show actual price changes (old ≠ new)
  AND (old_values->>'current_price') != (new_values->>'current_price')
ORDER BY 
  changed_at DESC
LIMIT 100;

-- Compliance report: Detect suspicious price changes
-- (e.g., sudden drops/increases that might indicate error or fraud)
SELECT 
  changed_at,
  record_id AS equipment_id,
  (old_values->>'current_price')::NUMERIC AS old_price,
  (new_values->>'current_price')::NUMERIC AS new_price,
  ROUND(
    (
      (new_values->>'current_price')::NUMERIC - 
      (old_values->>'current_price')::NUMERIC
    ) / (old_values->>'current_price')::NUMERIC * 100,
    1
  ) AS change_pct,
  CASE 
    WHEN (
      (new_values->>'current_price')::NUMERIC - 
      (old_values->>'current_price')::NUMERIC
    ) / (old_values->>'current_price')::NUMERIC > 0.5 
    THEN '🚨 LARGE INCREASE (>50%)'
    WHEN (
      (new_values->>'current_price')::NUMERIC - 
      (old_values->>'current_price')::NUMERIC
    ) / (old_values->>'current_price')::NUMERIC < -0.5 
    THEN '🚨 LARGE DECREASE (>50%)'
    ELSE 'Normal'
  END AS risk_flag,
  changed_by
FROM audit_log
WHERE 
  table_name = 'equipment'
  AND operation = 'UPDATE'
  AND old_values ? 'current_price'
  AND new_values ? 'current_price'
ORDER BY 
  ABS(
    (
      (new_values->>'current_price')::NUMERIC - 
      (old_values->>'current_price')::NUMERIC
    ) / (old_values->>'current_price')::NUMERIC
  ) DESC;

---

-- =============================================================================
-- QUERY 21 (Bonus): JSONB Analysis - All equipment states across time
-- =============================================================================
-- Answer: What has changed about the "JBL SRX812P" equipment over its lifetime?
-- Shows complete audit trail: every change, every person, every timestamp

SELECT 
  log_id,
  changed_at,
  changed_by,
  operation,
  
  -- For UPDATE: show what changed
  CASE operation
    WHEN 'INSERT' THEN 'New equipment added'
    WHEN 'UPDATE' THEN (
      SELECT string_agg(key || ':' || old_val || '→' || new_val, ', ')
      FROM (
        SELECT 
          key,
          old_values->>key AS old_val,
          new_values->>key AS new_val
        -- Compare keys in old vs new
        FROM jsonb_each_text(old_values)
        WHERE old_values->>key IS DISTINCT FROM new_values->>key
      ) changes
    )
    WHEN 'DELETE' THEN 'Equipment deleted'
  END AS what_changed,
  
  old_values,
  new_values
FROM audit_log
WHERE 
  table_name = 'equipment'
  -- This assumes equipment.name is indexed in equipment table
  -- To find equipment_id for "JBL SRX812P", join with equipment table
  AND record_id = (
    SELECT equipment_id 
    FROM equipment 
    WHERE name = 'JBL SRX812P'
    LIMIT 1
  )
ORDER BY changed_at ASC;

---

-- =============================================================================
-- QUERY 22 (Bonus): JSONB Aggregation - Count changes by field
-- =============================================================================
-- Answer: Which equipment fields change most frequently? 
-- (Helps identify which data is volatile/requires monitoring)

SELECT 
  jsonb_object_keys(old_values) AS field_name,
  COUNT(*) AS change_count,
  COUNT(DISTINCT changed_by) AS people_who_changed,
  MAX(changed_at) AS last_changed
FROM audit_log
WHERE 
  table_name = 'equipment'
  AND operation = 'UPDATE'
  AND old_values IS NOT NULL
GROUP BY 1
ORDER BY change_count DESC;

---

-- =============================================================================
-- QUERY 23 (Bonus): Full-text + JSON Combined
-- =============================================================================
-- Answer: Find all equipment matching search term "wireless" and show 
-- recent price history from audit log

SELECT 
  e.equipment_id,
  e.name,
  e.base_price,
  e.current_price,
  COUNT(a.log_id) AS total_changes,
  MAX(a.changed_at) AS last_change,
  array_agg(
    jsonb_build_object(
      'date', a.changed_at,
      'old_price', a.old_values->>'current_price',
      'new_price', a.new_values->>'current_price',
      'by', a.changed_by
    ) ORDER BY a.changed_at DESC
  ) FILTER (WHERE a.old_values ? 'current_price') 
    AS price_change_history
FROM equipment e
LEFT JOIN audit_log a ON (
  a.table_name = 'equipment' 
  AND a.record_id = e.equipment_id
  AND a.operation = 'UPDATE'
)
WHERE 
  -- Full text search for "wireless"
  to_tsvector('english', e.name || ' ' || COALESCE(e.description, ''))
  @@ to_tsquery('english', 'wireless')
GROUP BY e.equipment_id, e.name, e.base_price, e.current_price
ORDER BY COUNT(a.log_id) DESC;

