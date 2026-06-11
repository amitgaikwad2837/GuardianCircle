# Database Schema

**Engine:** SQLite via op-sqlite with SQLCipher AES-256  
**Key storage:** Android Keystore (hardware-backed)  
**Migration strategy:** Versioned append-only SQL files

## Tables

| Table | Purpose |
|---|---|
| `guardians` | Trusted contacts who receive emergency alerts |
| `incidents` | SOS events and their status |
| `incident_alerts` | Per-guardian alert delivery tracking |
| `journeys` | Active and historical journey records |
| `journey_waypoints` | GPS points recorded during journeys |
| `checkins` | Scheduled and completed check-ins |
| `geofences` | Safe/unsafe zone definitions |
| `geofence_events` | Entry/exit event log |
| `distress_events` | Distress detection events and outcomes |
| `evidence` | Audio, photo, video, and text evidence records |
| `audit_log` | Security-relevant app events (sanitised) |

## Migration Files

Located at `src/core/storage/database/migrations/`.

| File | Version | Description |
|---|---|---|
| `001_initial.sql` | 1 | Core tables: guardians, incidents, incident_alerts |
| `002_journeys.sql` | 2 | Journeys, waypoints, check-ins |
| `003_detection.sql` | 3 | Distress events, fall events |
| `004_geofence.sql` | 4 | Geofences and geofence events |
| `005_evidence.sql` | 5 | Evidence vault |
| `006_audit.sql` | 6 | Audit log |

## Retention Policy

| Table | Default | Configurable |
|---|---|---|
| `incidents` | 90 days | 30/60/90/180/forever |
| `journey_waypoints` | 30 days | Yes |
| `distress_events` | 30 days | Yes |
| `audit_log` | 90 days | No |
| `evidence` | Forever | Manual delete only |
| `checkins` | 60 days | Yes |
| `geofence_events` | 30 days | Yes |

## Decoy Mode Schema

Decoy records use `is_decoy = 1` flag. When decoy mode is active (duress PIN entered), queries filter to `WHERE is_decoy = 1`. Real data is hidden but not deleted.

Full schema SQL: see `src/core/storage/database/migrations/001_initial.sql`.
