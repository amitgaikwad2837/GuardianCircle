import { TriggerSOSUseCase } from '@features/sos/application/TriggerSOSUseCase';
import type { ISOSRepository } from '@features/sos/domain/interfaces/ISOSRepository';
import type { IAlertDispatcher } from '@features/sos/domain/interfaces/IAlertDispatcher';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSOSRepo: jest.Mocked<ISOSRepository> = {
  createIncident: jest.fn().mockResolvedValue(undefined),
  updateIncident: jest.fn().mockResolvedValue(undefined),
  getActiveIncident: jest.fn().mockResolvedValue(null),
  getIncidentById: jest.fn().mockResolvedValue(null),
  getIncidentHistory: jest.fn().mockResolvedValue([]),
};

const mockDispatcher: jest.Mocked<IAlertDispatcher> = {
  dispatchSMS: jest.fn().mockResolvedValue('sent'),
  dispatchCall: jest.fn().mockResolvedValue('initiated'),
  dispatchPushNotification: jest.fn().mockResolvedValue('sent'),
};

const mockGuardianRepo: jest.Mocked<IGuardianRepository> = {
  getAll: jest.fn().mockResolvedValue([]),
  getActiveGuardians: jest.fn().mockResolvedValue([
    {
      id: 'guardian-1',
      displayName: 'Priya',
      phoneNumber: '+919876543210',
      trustLevel: 1 as const,
      notificationPriority: 1,
      isActive: true,
      isDecoy: false,
      addedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getById: jest.fn().mockResolvedValue(null),
  findByPublicKey: jest.fn().mockResolvedValue(null),
  findByPhone: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  scheduleRemoval: jest.fn().mockResolvedValue(undefined),
  count: jest.fn().mockResolvedValue(1),
};

// Mock LocationService
jest.mock('@core/location/LocationService', () => ({
  LocationService: {
    getCurrentLocation: jest.fn().mockResolvedValue({
      lat: 28.6139,
      lng: 77.209,
      accuracy: 10,
      timestamp: Date.now(),
    }),
  },
}));

// Mock EventBus
jest.mock('@core/events/EventBus', () => ({
  EventBus: { emit: jest.fn() },
}));

// Mock PreferencesStore
jest.mock('@core/storage/preferences/PreferencesStore', () => ({
  PreferencesStore: { getString: jest.fn().mockReturnValue('Test User') },
  PREF_KEYS: { USER_DISPLAY_NAME: 'user_display_name' },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TriggerSOSUseCase', () => {
  let useCase: TriggerSOSUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new TriggerSOSUseCase(mockSOSRepo, mockGuardianRepo, mockDispatcher);
  });

  it('creates an incident in the repository', async () => {
    await useCase.execute({ method: 'long_press', isSilent: false });
    expect(mockSOSRepo.createIncident).toHaveBeenCalledOnce();
  });

  it('dispatches SMS to all active guardians', async () => {
    await useCase.execute({ method: 'long_press', isSilent: false });
    expect(mockDispatcher.dispatchSMS).toHaveBeenCalledTimes(1);
    expect(mockDispatcher.dispatchSMS).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+919876543210' }),
      expect.objectContaining({ isSilent: false }),
    );
  });

  it('marks incident as silent when isSilent=true', async () => {
    await useCase.execute({ method: 'shake', isSilent: true });
    expect(mockSOSRepo.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ isSilent: true }),
    );
  });

  it('marks incident as duress when isDuress=true', async () => {
    await useCase.execute({ method: 'long_press', isSilent: true, isDuress: true });
    expect(mockSOSRepo.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ isDuress: true }),
    );
  });

  it('emits sos:triggered event on EventBus', async () => {
    const { EventBus } = await import('@core/events/EventBus');
    await useCase.execute({ method: 'manual_tap', isSilent: false });
    expect(EventBus.emit).toHaveBeenCalledWith('sos:triggered', expect.objectContaining({
      method: 'manual_tap',
    }));
  });

  it('still creates incident even if location fails', async () => {
    const { LocationService } = await import('@core/location/LocationService');
    jest.mocked(LocationService.getCurrentLocation).mockRejectedValueOnce(new Error('GPS unavailable'));

    await useCase.execute({ method: 'long_press', isSilent: false });

    expect(mockSOSRepo.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ location: null }),
    );
  });

  it('still creates incident even if SMS dispatch fails', async () => {
    mockDispatcher.dispatchSMS.mockRejectedValueOnce(new Error('SMS failed'));
    await expect(
      useCase.execute({ method: 'long_press', isSilent: false }),
    ).resolves.toBeDefined();
  });
});
