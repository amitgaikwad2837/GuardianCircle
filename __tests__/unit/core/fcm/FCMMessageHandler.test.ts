// FCMMessageHandler has module-level `registered` state, so we use
// jest.resetModules() + dynamic require in beforeEach to get a fresh module
// with registered=false before every test. We also re-require EventBus so
// the test and FCMMessageHandler share the SAME fresh instance — otherwise
// spies and listeners are registered on a different EventBus than the one
// the handler emits to.

// ── Mock Firebase messaging ──────────────────────────────────────────────────
const mockOnMessage               = jest.fn();
const mockGetInitialNotification  = jest.fn().mockResolvedValue(null);
const mockOnNotificationOpenedApp = jest.fn();

jest.mock('@react-native-firebase/messaging', () => () => ({
  onMessage: mockOnMessage,
  getInitialNotification: mockGetInitialNotification,
  onNotificationOpenedApp: mockOnNotificationOpenedApp,
}));

// ── Mock Notifee ─────────────────────────────────────────────────────────────
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('guardian_ack'),
    displayNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock Logger ───────────────────────────────────────────────────────────────
jest.mock('@core/logger/Logger', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

// ── Mock DI Container ────────────────────────────────────────────────────────
jest.mock('@core/di/Container', () => ({
  Container: { resolve: jest.fn().mockReturnValue({ getById: jest.fn().mockResolvedValue(null) }) },
  DI_TOKENS: { IGuardianRepository: 'IGuardianRepository' },
}));

// ── Mock IdentityManager ──────────────────────────────────────────────────────
jest.mock('@core/crypto/IdentityManager', () => ({
  IdentityManager: { verify: jest.fn().mockResolvedValue(true) },
}));

describe('FCMMessageHandler', () => {
  let FCMMessageHandler: { register: () => void };
  let EventBus: { on: (e: string, cb: (p: unknown) => void) => () => void };

  let emittedEvents: Array<{ event: string; payload: unknown }>;
  let offListener: (() => void) | null = null;

  beforeEach(() => {
    jest.resetModules();

    // Re-require both modules so they share the same fresh EventBus instance.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    EventBus = (require('@core/events/EventBus') as { EventBus: typeof EventBus }).EventBus;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    FCMMessageHandler = (require('@core/fcm/FCMMessageHandler') as {
      FCMMessageHandler: { register: () => void };
    }).FCMMessageHandler;

    emittedEvents = [];
    offListener = EventBus.on('sos:acknowledged', (payload) => {
      emittedEvents.push({ event: 'sos:acknowledged', payload });
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    offListener?.();
  });

  it('registers FCM handlers on first call', () => {
    FCMMessageHandler.register();
    expect(mockOnMessage).toHaveBeenCalledTimes(1);
    expect(mockOnNotificationOpenedApp).toHaveBeenCalledTimes(1);
    expect(mockGetInitialNotification).toHaveBeenCalledTimes(1);
  });

  it('does not register handlers twice when called again (dedup guard)', () => {
    FCMMessageHandler.register();
    FCMMessageHandler.register();
    expect(mockOnMessage).toHaveBeenCalledTimes(1);
    expect(mockOnNotificationOpenedApp).toHaveBeenCalledTimes(1);
  });

  it('emits sos:acknowledged for a valid ack payload', async () => {
    FCMMessageHandler.register();

    const foregroundHandler = mockOnMessage.mock.calls[0]?.[0] as (
      msg: { data: Record<string, string> },
    ) => Promise<void>;

    await foregroundHandler({
      data: {
        type: 'sos_ack',
        incidentId: 'incident-123',
        guardianId: 'guardian-456',
        guardianName: 'Alice',
        etaMinutes: '10',
      },
    });

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]?.payload).toMatchObject({
      incidentId: 'incident-123',
      guardianId: 'guardian-456',
      guardianName: 'Alice',
      etaMinutes: 10,
    });
  });

  it('does not emit sos:acknowledged for an unrecognised message type', async () => {
    FCMMessageHandler.register();

    const foregroundHandler = mockOnMessage.mock.calls[0]?.[0] as (
      msg: { data: Record<string, string> },
    ) => Promise<void>;

    await foregroundHandler({
      data: { type: 'unknown_type', incidentId: 'x', guardianId: 'y', guardianName: 'z' },
    });

    expect(emittedEvents).toHaveLength(0);
  });

  it('handles missing etaMinutes gracefully', async () => {
    FCMMessageHandler.register();

    const foregroundHandler = mockOnMessage.mock.calls[0]?.[0] as (
      msg: { data: Record<string, string> },
    ) => Promise<void>;

    await foregroundHandler({
      data: {
        type: 'sos_ack',
        incidentId: 'i1',
        guardianId: 'g1',
        guardianName: 'Bob',
      },
    });

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]?.payload).toMatchObject({ etaMinutes: undefined });
  });
});
