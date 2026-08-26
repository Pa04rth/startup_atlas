-- Seed the two launch cities. Centroids are approximate city-center points;
-- bbox should be tightened once real coverage is known (see packages/config/src/cities.ts).

INSERT INTO cities (id, name, state, center_lat, center_lng, default_zoom) VALUES
  ('pune',   'Pune',   'Maharashtra', 18.5204, 73.8567, 12),
  ('mumbai', 'Mumbai', 'Maharashtra', 19.0760, 72.8777, 12)
ON CONFLICT (id) DO NOTHING;
