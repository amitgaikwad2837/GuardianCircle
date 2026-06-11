-- Migration 003: Distress events and fall events

CREATE TABLE IF NOT EXISTS distress_events (
  id                TEXT PRIMARY KEY,
  detected_at       INTEGER NOT NULL,
  confidence        REAL NOT NULL,
  signals           TEXT NOT NULL DEFAULT '[]',
  sensitivity_level TEXT NOT NULL DEFAULT 'medium',
  user_action       TEXT,
  action_at         INTEGER,
  created_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distress_detected_at ON distress_events(detected_at DESC);

CREATE TABLE IF NOT EXISTS fall_events (
  id                        TEXT PRIMARY KEY,
  detected_at               INTEGER NOT NULL,
  impact_magnitude_g        REAL NOT NULL,
  freefall_duration_ms      INTEGER NOT NULL,
  post_impact_stillness_ms  INTEGER NOT NULL,
  confidence                REAL NOT NULL,
  user_action               TEXT,
  action_at                 INTEGER,
  linked_incident_id        TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  created_at                INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fall_detected_at ON fall_events(detected_at DESC);

CREATE TABLE IF NOT EXISTS crash_events (
  id                TEXT PRIMARY KEY,
  detected_at       INTEGER NOT NULL,
  impact_magnitude_g REAL NOT NULL,
  speed_before_ms   REAL NOT NULL,
  speed_after_ms    REAL NOT NULL,
  confidence        REAL NOT NULL,
  user_action       TEXT,
  action_at         INTEGER,
  linked_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  created_at        INTEGER NOT NULL
);
