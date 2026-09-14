-- Seed the launch cities. Centroids are approximate city-center points and
-- bboxes cover the metro region (mirrors packages/config/src/cities.ts).

INSERT INTO cities (id, name, state, center_lat, center_lng, bbox, default_zoom) VALUES
  ('pune',      'Pune',      'Maharashtra', 18.5204, 73.8567, ST_MakeEnvelope(73.6, 18.3, 74.3, 18.85, 4326), 12),
  ('bengaluru', 'Bengaluru', 'Karnataka',   12.9716, 77.5946, ST_MakeEnvelope(77.3, 12.7, 77.95, 13.3, 4326), 12),
  ('mumbai',    'Mumbai',    'Maharashtra', 19.0760, 72.8777, ST_MakeEnvelope(72.75, 18.85, 73.25, 19.35, 4326), 12)
ON CONFLICT (id) DO NOTHING;
