-- Migration 006: Audit log
-- Sanitised security-relevant events. No PII stored here.

CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  occurred_at  INTEGER NOT NULL,
  details      TEXT DEFAULT '{}'
);

-- Retention: auto-purge entries older than 90 days via application-level cleanup job.
-- No user-configurable retention for audit log (security requirement).

CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
