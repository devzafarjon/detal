CREATE TABLE IF NOT EXISTS order_requests (
  id uuid PRIMARY KEY,
  customer_name text NOT NULL,
  phone text NOT NULL,
  note text NOT NULL DEFAULT '',
  items text NOT NULL,
  subtotal_cents text NOT NULL,
  missing_price_count integer NOT NULL,
  demo_price_count integer NOT NULL,
  status text NOT NULL DEFAULT 'new',
  ip_hash text NOT NULL,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS order_requests_created_at_idx ON order_requests (created_at DESC);
CREATE TABLE IF NOT EXISTS order_request_attempts (bucket text PRIMARY KEY, count integer NOT NULL);
