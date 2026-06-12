import { Container, DI_TOKENS } from '@core/di/Container';
import type { IGeofenceRepository } from '../domain/interfaces/IGeofenceRepository';
import type { Geofence, GeofenceType, GeofenceAlertOn } from '../domain/entities/Geofence';
import type { Coordinates } from '@core/location/LocationService';

export interface CreateGeofenceInput {
  label: string;
  center: Coordinates;
  radiusMeters: number;
  type?: GeofenceType;
  alertOn?: GeofenceAlertOn;
  guardianIds?: string[];
  loiteringDelayMs?: number;
}

export class CreateGeofenceUseCase {
  private readonly repo: IGeofenceRepository;

  constructor() {
    this.repo = Container.resolve<IGeofenceRepository>(DI_TOKENS.IGeofenceRepository);
  }

  async execute(input: CreateGeofenceInput): Promise<Geofence> {
    if (input.label.trim().length === 0) throw new Error('Geofence label is required.');
    if (input.radiusMeters < 50) throw new Error('Radius must be at least 50 metres.');
    if (input.radiusMeters > 50_000) throw new Error('Radius cannot exceed 50 km.');

    return this.repo.create({
      label: input.label.trim(),
      center: input.center,
      radiusMeters: input.radiusMeters,
      type: input.type ?? 'safe',
      alertOn: input.alertOn ?? 'both',
      isActive: true,
      guardianIds: input.guardianIds ?? [],
      loiteringDelayMs: input.loiteringDelayMs ?? 180_000,
    });
  }
}
