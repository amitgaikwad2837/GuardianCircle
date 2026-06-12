/**
 * GuardianNotificationHandler unit tests.
 *
 * The handler: receives an FCM message, verifies the sender's ECDSA signature,
 * decrypts the E2E payload, then displays a local notification via Notifee.
 * We test orchestration logic by mocking crypto and repository primitives.
 */

import { EventBus } from '../../../../src/core/events/EventBus';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/messaging', () => () => ({
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  onTokenRefresh: jest.fn(() => jest.fn()),
  getToken: jest.fn().mockResolvedValue('test_fcm_token'),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('gc_sos_alerts'),
    displayNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidCategory: { ALARM: 'alarm' },
}));

const mockDecrypt          = jest.fn();
const mockVerify           = jest.fn();
const mockFindBySigningKey = jest.fn();
const mockGetActiveGuardians = jest.fn();

jest.mock('../../../../src/core/crypto/IdentityManager', () => ({
  IdentityManager: {
    decryptFCMPayload: mockDecrypt,
    verify: mockVerify,
  },
}));

jest.mock('../../../../src/core/di/Container', () => ({
  Container: {
    resolve: jest.fn(() => ({
      findBySigningKey: mockFindBySigningKey,
      getActiveGuardians: mockGetActiveGuardians,
      update: jest.fn().mockResolvedValue(undefined),
    })),
  },
  DI_TOKENS: { IGuardianRepository: 'IGuardianRepository' },
}));

jest.mock('../../../../src/core/logger/Logger', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), safeError: jest.fn() },
}));

jest.mock('../../../../src/core/sms/SMSService', () => ({
  SmsService: { sendBatch: jest.fn().mockResolvedValue(new Map()) },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFakeMessage(overrides: Record<string, string> = {}) {
  return {
    data: {
      encryptedPayload: 'encrypted_payload_base64',
      signature: 'sig_base64',
      senderPublicKey: 'alice_signing_key',
      ...overrides,
    },
  };
}

function makeGuardian(overrides = {}) {
  return {
    id: 'g1',
    displayName: 'Alice',
    phoneNumber: '+1234567890',
    signingPublicKey: 'alice_signing_key',
    encryptionPublicKey: 'alice_ecdh_key',
    isActive: true,
    isDecoy: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuardianNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports an initialize function without throwing', async () => {
    const { GuardianNotificationHandler } = await import(
      '../../../../src/features/guardian/infrastructure/GuardianNotificationHandler'
    );
    await expect(GuardianNotificationHandler.initialize()).resolves.not.toThrow();
  });

  it('handleMessage looks up sender by signingPublicKey, verifies signature, and decrypts payload', async () => {
    mockFindBySigningKey.mockResolvedValue(makeGuardian());
    mockVerify.mockResolvedValue(true);
    mockDecrypt.mockResolvedValue(
      JSON.stringify({ incidentId: 'inc_1', escalationLevel: 0, location: { lat: 12.9, lng: 77.5 } }),
    );

    const { GuardianNotificationHandler } = await import(
      '../../../../src/features/guardian/infrastructure/GuardianNotificationHandler'
    );

    await expect(
      (GuardianNotificationHandler as { handleMessage(msg: unknown): Promise<void> })
        .handleMessage(makeFakeMessage()),
    ).resolves.not.toThrow();

    expect(mockFindBySigningKey).toHaveBeenCalledWith('alice_signing_key');
    expect(mockVerify).toHaveBeenCalledWith('encrypted_payload_base64', 'sig_base64', 'alice_signing_key');
    expect(mockDecrypt).toHaveBeenCalledWith('encrypted_payload_base64');
  });

  it('handleMessage discards message from unrecognised signing key', async () => {
    mockFindBySigningKey.mockResolvedValue(null);

    const { GuardianNotificationHandler } = await import(
      '../../../../src/features/guardian/infrastructure/GuardianNotificationHandler'
    );

    await (GuardianNotificationHandler as { handleMessage(msg: unknown): Promise<void> })
      .handleMessage(makeFakeMessage({ senderPublicKey: 'unknown_key' }));

    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it('handleMessage drops message when signature verification fails', async () => {
    mockFindBySigningKey.mockResolvedValue(makeGuardian());
    mockVerify.mockResolvedValue(false);

    const { GuardianNotificationHandler } = await import(
      '../../../../src/features/guardian/infrastructure/GuardianNotificationHandler'
    );

    await (GuardianNotificationHandler as { handleMessage(msg: unknown): Promise<void> })
      .handleMessage(makeFakeMessage({ signature: 'bad_sig' }));

    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it('emits no EventBus events for malformed message (missing required fields)', async () => {
    const spy = jest.spyOn(EventBus, 'emit');

    const { GuardianNotificationHandler } = await import(
      '../../../../src/features/guardian/infrastructure/GuardianNotificationHandler'
    );

    await (GuardianNotificationHandler as { handleMessage(msg: unknown): Promise<void> })
      .handleMessage({ data: { type: 'unknown_type' } });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
