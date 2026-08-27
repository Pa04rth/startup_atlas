-- Person-to-person edges for the warm-path graph (CLAUDE.md FR-13/§11, v2).
-- Undirected: stored once per pair, traversed both ways (see graph/warm_path.ts).

CREATE TABLE connections (
  person_id_a UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_id_b UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  source TEXT NOT NULL,           -- e.g. 'linkedin_import','manual','shared_company'
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (person_id_a, person_id_b),
  CHECK (person_id_a <> person_id_b));
CREATE INDEX connections_b_idx ON connections(person_id_b);
