-- Migration 001: Core tables — guardians, incidents, incident_alerts

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

CREATE INDEX IF NOT EXISTS idx_alerts_incident ON incident_alerts(incident_id);
