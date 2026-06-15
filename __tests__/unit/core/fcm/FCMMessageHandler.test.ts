import { FCMMessageHandler } from '@core/fcm/FCMMessageHandler';
import { EventBus } from '@core/events/EventBus';

// ── Mock Firebase messaging ──────────────────────────────────────────────────
const mockOnMessage          = jest.fn();
const mockGetInitialNotification = jest.fn().mockResolvedValue(null);
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

describe('FCMMessageHandler', () => {
  let emittedEvents: Array<{ event: string; payload: unknown }>;
  let offListener: (() => void) | null = null;

  beforeEach(() => {
    emittedEvents = [];
    offListener = EventBus.on('sos:acknowledged', (payload) => {
      emittedEvents.push({ event: 'sos:acknowledged', payload });
    });
    // Reset the module-level `registered` flag between tests by re-importing.
    jest.resetModules();
  });

  afterEach(() => {
    offListener?.();
    jest.clearAllMocks();
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

    // Capture the foreground message handler
    const foregroundHandler = mockOnMessage.mock.calls[0][0] as (
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
    expect(emittedEvents[0]!.payload).toMatchObject({
      incidentId: 'incident-123',
      guardianId: 'guardian-456',
      guardianName: 'Alice',
      etaMinutes: 10,
    });
  });

  it('does not emit sos:acknowledged for an unrecognised message type', async () => {
    FCMMessageHandler.register();

    const foregroundHandler = mockOnMessage.mock.calls[0][0] as (
      msg: { data: Record<string, string> },
    ) => Promise<void>;

    await foregroundHandler({
      data: { type: 'unknown_type', incidentId: 'x', guardianId: 'y', guardianName: 'z' },
    });

    expect(emittedEvents).toHaveLength(0);
  });

  it('handles missing etaMinutes gracefully', async () => {
    FCMMessageHandler.register();

    const foregroundHandler = mockOnMessage.mock.calls[0][0] as (
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

    expect(emittedEvents[0]!.payload).toMatchObject({ etaMinutes: undefined });
  });
});
