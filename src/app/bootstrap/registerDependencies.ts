import { DatabaseManager } from '@core/storage/database/DatabaseManager';
import { Container, DI_TOKENS } from '@core/di/Container';
import { Logger } from '@core/logger/Logger';

import { SQLiteSOSRepository }       from '@features/sos/infrastructure/SQLiteSOSRepository';
import { SQLiteGuardianRepository }  from '@features/guardian/infrastructure/SQLiteGuardianRepository';
import { SQLiteJourneyRepository }   from '@features/journey/infrastructure/SQLiteJourneyRepository';
import { SQLiteCheckInRepository }   from '@features/checkin/infrastructure/SQLiteCheckInRepository';
import { SQLiteGeofenceRepository }  from '@features/geofence/infrastructure/SQLiteGeofenceRepository';
import { SQLiteDistressRepository }  from '@features/distress/infrastructure/SQLiteDistressRepository';
import { SQLiteEvidenceRepository }  from '@features/evidence/infrastructure/SQLiteEvidenceRepository';
import { AlertDispatcher }           from '@features/sos/infrastructure/AlertDispatcher';

const TAG = 'registerDependencies';

/**
 * Registers all concrete implementations in the DI Container.
 * Called once during app bootstrap, after DatabaseManager.initialize().
 * Guards against double-registration on React Native fast-refresh.
 */
export function registerDependencies(): void {
  // Guard against double-registration on React Native fast-refresh.
  // Check the LAST token registered so a partial-reset that leaves only early tokens
  // still triggers a full re-registration rather than silently skipping missing tokens.
  if (Container.isRegistered(DI_TOKENS.IAlertDispatcher)) {
    Logger.debug(TAG, 'Already registered — skipping (hot reload)');
    return;
  }

  const db = DatabaseManager.getDB();

  // ── Repositories ────────────────────────────────────────────────────────────
  Container.register(DI_TOKENS.ISOSRepository,       new SQLiteSOSRepository(db));
  Container.register(DI_TOKENS.IGuardianRepository,  new SQLiteGuardianRepository(db));
  Container.register(DI_TOKENS.IJourneyRepository,   new SQLiteJourneyRepository(db));
  Container.register(DI_TOKENS.ICheckInRepository,   new SQLiteCheckInRepository(db));
  Container.register(DI_TOKENS.IGeofenceRepository,  new SQLiteGeofenceRepository(db));
  Container.register(DI_TOKENS.IDistressRepository,  new SQLiteDistressRepository(db));
  Container.register(DI_TOKENS.IEvidenceRepository,  new SQLiteEvidenceRepository(db));

  // ── Dispatchers ─────────────────────────────────────────────────────────────
  Container.register(DI_TOKENS.IAlertDispatcher, new AlertDispatcher());

  Logger.info(TAG, 'All dependencies registered');
}
