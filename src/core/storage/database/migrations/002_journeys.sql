-- Migration 002: Journeys, waypoints, check-ins

CREATE TABLE IF NOT EXISTS journeys (
  id                        TEXT PRIMARY KEY,
  destination_label         TEXT,
  destination_lat           REAL,
  destination_lng           REAL,
  started_at                INTEGER NOT NULL,
  expected_arrival_at       INTEGER,
  arrived_at                INTEGER,
  status                    TEXT NOT NULL DEFAULT 'active',
  guardian_ids              TEXT NOT NULL DEFAULT '[]',
  update_interval_minutes   INTEGER NOT NULL DEFAULT 15,
  deviation_threshold_m     INTEGER NOT NULL DEFAULT 500,
  created_at                INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);

CREATE TABLE IF NOT EXISTS journey_waypoints (
  id           TEXT PRIMARY KEY,
  journey_id   TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  accuracy     REAL,
  speed        REAL,
  recorded_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waypoints_journey ON journey_waypoints(journey_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS checkins (
  id                        TEXT PRIMARY KEY,
  label                     TEXT,
  type                      TEXT NOT NULL DEFAULT 'one_time',
  scheduled_at              INTEGER NOT NULL,
  completed_at              INTEGER,
  missed_at                 INTEGER,
  recurrence_rule           TEXT,
  guardian_ids              TEXT NOT NULL DEFAULT '[]',
  escalation_delay_minutes  INTEGER NOT NULL DEFAULT 15,
  status                    TEXT NOT NULL DEFAULT 'pending',
  journey_id                TEXT REFERENCES journeys(id) ON DELETE SET NULL,
  created_at                INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_scheduled ON checkins(scheduled_at);
