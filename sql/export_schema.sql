-- ============================================================
-- DATABASE SCHEMA EXPORT
-- Run each section separately in the Supabase SQL Editor
-- to inspect the current database structure.
-- ============================================================


-- SECTION 1: All Tables & Views
SELECT
    table_schema   AS schema,
    table_name     AS "table",
    table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND table_schema NOT LIKE 'pg_%'
ORDER BY table_schema, table_name;


-- SECTION 2: Columns (type, nullability, default)
SELECT
    c.table_schema         AS schema,
    c.table_name           AS "table",
    c.column_name,
    c.ordinal_position     AS position,
    c.data_type,
    c.udt_name             AS custom_type,
    c.character_maximum_length AS max_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
JOIN information_schema.tables t
    ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND c.table_schema NOT LIKE 'pg_%'
  AND t.table_type = 'BASE TABLE'
ORDER BY c.table_schema, c.table_name, c.ordinal_position;


-- SECTION 3: Primary Keys
SELECT
    tc.table_schema  AS schema,
    tc.table_name    AS "table",
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema   = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name;


-- SECTION 4: Foreign Keys
SELECT
    tc.table_schema   AS schema,
    tc.table_name     AS "table",
    kcu.column_name,
    ccu.table_schema  AS foreign_schema,
    ccu.table_name    AS foreign_table,
    ccu.column_name   AS foreign_column,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema   = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema   = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name;


-- SECTION 5: Indexes
SELECT
    schemaname AS schema,
    tablename  AS "table",
    indexname  AS index,
    indexdef   AS definition
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND schemaname NOT LIKE 'pg_%'
ORDER BY schemaname, tablename, indexname;


-- SECTION 6: Unique Constraints
SELECT
    tc.table_schema  AS schema,
    tc.table_name    AS "table",
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema   = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name;


-- SECTION 7: Check Constraints
SELECT
    tc.table_schema  AS schema,
    tc.table_name    AS "table",
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name  = cc.constraint_name
    AND tc.table_schema    = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name;


-- SECTION 8: Enums
SELECT
    n.nspname                                             AS schema,
    t.typname                                             AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder)      AS enum_values
FROM pg_type t
JOIN pg_enum      e ON t.oid         = e.enumtypid
JOIN pg_namespace n ON n.oid         = t.typnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;


-- SECTION 9: Views (with definition)
SELECT
    table_schema    AS schema,
    table_name      AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;


-- SECTION 10: Functions & Procedures
SELECT
    n.nspname                            AS schema,
    p.proname                            AS function_name,
    pg_get_function_arguments(p.oid)     AS arguments,
    pg_get_function_result(p.oid)        AS return_type,
    l.lanname                            AS language,
    p.prosrc                             AS source
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language  l ON l.oid = p.prolang
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname, p.proname;


-- SECTION 11: Triggers
SELECT
    trigger_schema          AS schema,
    trigger_name,
    event_object_table      AS "table",
    event_manipulation      AS event,
    action_timing           AS timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY trigger_schema, event_object_table, trigger_name;


-- SECTION 12: Sequences
SELECT
    sequence_schema AS schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY sequence_schema, sequence_name;
