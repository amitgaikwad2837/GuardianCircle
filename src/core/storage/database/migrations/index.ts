import migration001 from './001_initial.sql';
import migration002 from './002_journeys.sql';
import migration003 from './003_detection.sql';
import migration004 from './004_geofence.sql';
import migration005 from './005_evidence.sql';
import migration006 from './006_audit.sql';
import migration007 from './007_guardian_key_split.sql';

export const migrations = [
  { version: 1, sql: migration001 },
  { version: 2, sql: migration002 },
  { version: 3, sql: migration003 },
  { version: 4, sql: migration004 },
  { version: 5, sql: migration005 },
  { version: 6, sql: migration006 },
  { version: 7, sql: migration007 },
];
