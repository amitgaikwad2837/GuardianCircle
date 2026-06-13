// SQL inlined as TS strings — Metro cannot import .sql files as text (they are treated as assets).

const m001 = `
CREATE TABLE IF NOT EXISTS guardians (
  id                    TEXT PRIMARY KEY,
  display_name          TEXT NOT NULL,
  phone_number          TEXT NOT NULL,
  public_key            TEXT,
  fcm_token             TEXT,
  fcm_token_updated_at  INTEGER,
  trust_level           INTEGER NOT NULL DEFAULT 1,
  notification_priority INTEGER NOT NULL DEFAULT 1,
  is_active             INTEGER NOT NULL DEFAULT 1,
  is_decoy              INTEGER NOT NULL DEFAULT 0,
  added_at              INTEGER NOT NULL,
  last_alert_at         INTEGER,
  notes                 TEXT,
  removal_scheduled_at  INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardians_phone ON guardians(phone_number) WHERE is_decoy = 0;
CREATE INDEX IF NOT EXISTS idx_guardians_active ON guardians(is_active, is_decoy);
CREATE TABLE IF NOT EXISTS incidents (
  id                       TEXT PRIMARY KEY,
  type                     TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'active',
  triggered_at             INTEGER NOT NULL,
  resolved_at              INTEGER,
  escalation_level         INTEGER NOT NULL DEFAULT 0,
  location_lat             REAL,
  location_lng             REAL,
  location_accuracy        REAL,
  is_silent                INTEGER NOT NULL DEFAULT 0,
  is_duress                INTEGER NOT NULL DEFAULT 0,
  cancelled_reason         TEXT,
  notes                    TEXT,
  created_at               INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_triggered_at ON incidents(triggered_at DESC);
CREATE TABLE IF NOT EXISTS incident_alerts (
  id               TEXT PRIMARY KEY,
  incident_id      TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  guardian_id      TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  alert_method     TEXT NOT NULL,
  sent_at          INTEGER NOT NULL,
  delivered_at     INTEGER,
  acknowledged_at  INTEGER,
  sms_content      TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alerts_incident ON incident_alerts(incident_id)
`;

const m002 = `
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
CREATE INDEX IF NOT EXISTS idx_checkins_scheduled ON checkins(scheduled_at)
`;

const m003 = `
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
  id                 TEXT PRIMARY KEY,
  detected_at        INTEGER NOT NULL,
  impact_magnitude_g REAL NOT NULL,
  speed_before_ms    REAL NOT NULL,
  speed_after_ms     REAL NOT NULL,
  confidence         REAL NOT NULL,
  user_action        TEXT,
  action_at          INTEGER,
  linked_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL
)
`;

const m004 = `
CREATE TABLE IF NOT EXISTS geofences (
  id                  TEXT PRIMARY KEY,
  label               TEXT NOT NULL,
  center_lat          REAL NOT NULL,
  center_lng          REAL NOT NULL,
  radius_m            REAL NOT NULL,
  type                TEXT NOT NULL DEFAULT 'safe',
  alert_on            TEXT NOT NULL DEFAULT 'both',
  is_active           INTEGER NOT NULL DEFAULT 1,
  guardian_ids        TEXT NOT NULL DEFAULT '[]',
  loitering_delay_ms  INTEGER NOT NULL DEFAULT 180000,
  created_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);
CREATE TABLE IF NOT EXISTS geofence_events (
  id           TEXT PRIMARY KEY,
  geofence_id  TEXT NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  occurred_at  INTEGER NOT NULL,
  lat          REAL,
  lng          REAL
);
CREATE INDEX IF NOT EXISTS idx_geofence_events ON geofence_events(geofence_id, occurred_at DESC)
`;

const m005 = `
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
CREATE INDEX IF NOT EXISTS idx_evidence_captured ON evidence(captured_at DESC)
`;

const m006 = `
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  occurred_at  INTEGER NOT NULL,
  details      TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type)
`;

const m007 = `
ALTER TABLE guardians ADD COLUMN signing_public_key TEXT;
ALTER TABLE guardians ADD COLUMN encryption_public_key TEXT;
UPDATE guardians SET signing_public_key = public_key WHERE public_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardians_signing_key ON guardians(signing_public_key)
  WHERE signing_public_key IS NOT NULL
`;

export const migrations: { version: number; sql: string }[] = [
  { version: 1, sql: m001 },
  { version: 2, sql: m002 },
  { version: 3, sql: m003 },
  { version: 4, sql: m004 },
  { version: 5, sql: m005 },
  { version: 6, sql: m006 },
  { version: 7, sql: m007 },
];
