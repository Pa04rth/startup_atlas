-- Adds Bengaluru as a live city. Idempotent, so it is safe on a database
-- that was seeded from seed/cities.sql after this row was added there.
-- Brands, offices, jobs etc. need nothing else: every table keys on
-- cities.id, and the pipeline/app read the rest from packages/config.
INSERT INTO cities (id, name, state, center_lat, center_lng, bbox, default_zoom) VALUES
  ('bengaluru', 'Bengaluru', 'Karnataka', 12.9716, 77.5946,
   ST_MakeEnvelope(77.3, 12.7, 77.95, 13.3, 4326), 12)
ON CONFLICT (id) DO NOTHING;
