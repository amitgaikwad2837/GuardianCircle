-- Migration 005: Evidence vault

CREATE TABLE IF NOT EXISTS evidence (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  file_uri      TEXT,
  content_hash  TEXT NOT NULL,
  captured_at   INTEGER NOT NULL,
  lat           REAL,
  lng           REAL,
  metadata      TEXT DEFAULT '{}',
  is_encrypted  INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_incident ON evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_evidence_captured ON evidence(captured_at DESC);
