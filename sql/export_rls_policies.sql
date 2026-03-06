-- ============================================================
-- RLS POLICIES EXPORT
-- Run each section separately in the Supabase SQL Editor
-- to inspect all Row Level Security policies and coverage.
-- ============================================================


-- SECTION 1: RLS status per table (enabled / forced)
SELECT
    schemaname        AS schema,
    tablename         AS "table",
    rowsecurity       AS rls_enabled,
    forcerowsecurity  AS rls_forced
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND schemaname NOT LIKE 'pg_%'
ORDER BY schemaname, tablename;


-- SECTION 2: All RLS policies (human-readable)
SELECT
    schemaname  AS schema,
    tablename   AS "table",
    policyname  AS policy,
    permissive,
    roles,
    cmd         AS command,
    qual        AS using_expression,
    with_check  AS with_check_expression
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;


-- SECTION 3: Policies as recreatable DDL statements
SELECT
    'CREATE POLICY ' || quote_ident(policyname)
    || ' ON '   || quote_ident(schemaname) || '.' || quote_ident(tablename)
    || CASE WHEN permissive = 'PERMISSIVE' THEN ' AS PERMISSIVE' ELSE ' AS RESTRICTIVE' END
    || CASE WHEN cmd = 'ALL' THEN ' FOR ALL' ELSE ' FOR ' || cmd END
    || CASE
           WHEN array_length(roles, 1) IS NOT NULL
           THEN ' TO ' || array_to_string(roles, ', ')
           ELSE ''
       END
    || CASE WHEN qual       IS NOT NULL THEN ' USING ('       || qual       || ')' ELSE '' END
    || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK ('  || with_check || ')' ELSE '' END
    || ';'  AS policy_ddl
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;


-- SECTION 4: Tables WITHOUT RLS enabled (potential security gap)
SELECT
    schemaname AS schema,
    tablename  AS "table"
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND schemaname NOT LIKE 'pg_%'
  AND rowsecurity = false
ORDER BY schemaname, tablename;


-- SECTION 5: Roles referenced inside policies
SELECT DISTINCT
    schemaname AS schema,
    tablename  AS "table",
    policyname AS policy,
    unnest(roles) AS role
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, role;
