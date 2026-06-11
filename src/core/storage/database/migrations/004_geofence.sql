-- Migration 004: Geofences and geofence events

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

CREATE INDEX IF NOT EXISTS idx_geofence_events ON geofence_events(geofence_id, occurred_at DESC);
