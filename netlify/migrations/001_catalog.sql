CREATE TABLE IF NOT EXISTS catalogs (id text PRIMARY KEY, data text NOT NULL, revision integer NOT NULL);
CREATE TABLE IF NOT EXISTS drawings (id bigint PRIMARY KEY, name text NOT NULL, data text NOT NULL, part_count integer NOT NULL, revision integer NOT NULL, deleted integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ai_scan_usage (bucket bigint PRIMARY KEY, count integer NOT NULL);
CREATE TABLE IF NOT EXISTS ai_jobs (id bigint PRIMARY KEY, name text NOT NULL, model text NOT NULL, tiles text NOT NULL, status text NOT NULL, response_id text, result text, error text, created_at bigint NOT NULL, updated_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (bucket text PRIMARY KEY, count integer NOT NULL);
CREATE TABLE IF NOT EXISTS scan_requests (id uuid PRIMARY KEY, response_id text NOT NULL, tiles text NOT NULL, status text NOT NULL, result text, created_at bigint NOT NULL);
