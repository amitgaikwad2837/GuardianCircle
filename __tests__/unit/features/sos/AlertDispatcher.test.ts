import { AlertDispatcher } from '@features/sos/infrastructure/AlertDispatcher';
import { SmsService }      from '@core/sms/SMSService';
import type { Guardian }   from '@features/guardian/domain/entities/Guardian';
import type { AlertPayload } from '@features/sos/domain/interfaces/IAlertDispatcher';

// Mock SmsService
jest.mock('@core/sms/SMSService', () => ({
  SmsService: { send: jest.fn().mockResolvedValue('sent') },
  SmsTemplates: {
    sosAlert: jest.fn().mockReturnValue('🚨 Test needs help!'),
    escalationUpdate: jest.fn().mockReturnValue('⚠️ UPDATE #1: Test still needs help'),
  },
}));

// Mock Linking for call dispatch
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL:    jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock EncryptionService + IdentityManager for push dispatch
jest.mock('@core/crypto/EncryptionService', () => ({
  EncryptionService: {
    encryptForRecipient: jest.fn().mockResolvedValue('encrypted_payload'),
  },
}));
jest.mock('@core/crypto/IdentityManager', () => ({
  IdentityManager: {
    getPublicKey: jest.fn().mockReturnValue('sender_pubkey'),
    sign:         jest.fn().mockResolvedValue('sig123'),
  },
}));
jest.mock('@core/storage/preferences/PreferencesStore', () => ({
  PreferencesStore: { getString: jest.fn().mockReturnValue(null) },
  PREF_KEYS: { RELAY_ENDPOINT: 'relay_endpoint' },
}));

function makeGuardian(overrides: Partial<Guardian> = {}): Guardian {
  return {
    id:                   'g-001',
    displayName:          'Priya',
    phoneNumber:          '+919876543210',
    trustLevel:           1,
    notificationPriority: 1,
    isActive:             true,
    isDecoy:              false,
    addedAt:              new Date(),
    createdAt:            new Date(),
    updatedAt:            new Date(),
    ...overrides,
  };
}

function makePayload(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    incidentId:      'inc-001',
    senderName:      'Test User',
    location:        { lat: 12.97, lng: 77.59, accuracy: 5, timestamp: Date.now() },
    escalationLevel: 0,
    isSilent:        false,
    ...overrides,
  };
}

describe('AlertDispatcher', () => {
  let dispatcher: AlertDispatcher;

  beforeEach(() => {
    dispatcher = new AlertDispatcher();
    jest.clearAllMocks();
  });

  describe('dispatchSMS', () => {
    it('sends SMS and returns "sent" on success', async () => {
      (SmsService.send as jest.Mock).mockResolvedValueOnce('sent');
      const result = await dispatcher.dispatchSMS(makeGuardian(), makePayload());
      expect(result).toBe('sent');
      expect(SmsService.send).toHaveBeenCalledWith('+919876543210', expect.any(String));
    });

    it('returns "failed" when SmsService fails', async () => {
      (SmsService.send as jest.Mock).mockResolvedValueOnce('failed');
      const result = await dispatcher.dispatchSMS(makeGuardian(), makePayload());
      expect(result).toBe('failed');
    });

    it('uses escalation template when level > 0', async () => {
      const { SmsTemplates } = jest.requireMock('@core/sms/SMSService') as { SmsTemplates: { escalationUpdate: jest.Mock; sosAlert: jest.Mock } };
      await dispatcher.dispatchSMS(makeGuardian(), makePayload({ escalationLevel: 1 }));
      expect(SmsTemplates.escalationUpdate).toHaveBeenCalled();
      expect(SmsTemplates.sosAlert).not.toHaveBeenCalled();
    });

    it('uses SOS template when level = 0', async () => {
      const { SmsTemplates } = jest.requireMock('@core/sms/SMSService') as { SmsTemplates: { escalationUpdate: jest.Mock; sosAlert: jest.Mock } };
      await dispatcher.dispatchSMS(makeGuardian(), makePayload({ escalationLevel: 0 }));
      expect(SmsTemplates.sosAlert).toHaveBeenCalled();
    });
  });

  describe('dispatchCall', () => {
    it('initiates phone call via Linking', async () => {
      const { Linking } = jest.requireMock('react-native') as { Linking: { canOpenURL: jest.Mock; openURL: jest.Mock } };
      const result = await dispatcher.dispatchCall(makeGuardian());
      expect(result).toBe('initiated');
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+919876543210');
    });

    it('returns "failed" when tel: is not supported', async () => {
      const { Linking } = jest.requireMock('react-native') as { Linking: { canOpenURL: jest.Mock } };
      Linking.canOpenURL.mockResolvedValueOnce(false);
      const result = await dispatcher.dispatchCall(makeGuardian());
      expect(result).toBe('failed');
    });
  });

  describe('dispatchPushNotification', () => {
    it('returns "no_token" when guardian has no FCM token', async () => {
      const result = await dispatcher.dispatchPushNotification(makeGuardian(), makePayload());
      expect(result).toBe('no_token');
    });

    it('returns "no_token" when guardian has no publicKey', async () => {
      const result = await dispatcher.dispatchPushNotification(
        makeGuardian({ fcmToken: 'tkn123' }),
        makePayload(),
      );
      expect(result).toBe('no_token');
    });

    it('returns "no_token" when relay endpoint not configured', async () => {
      const { PreferencesStore } = jest.requireMock('@core/storage/preferences/PreferencesStore') as { PreferencesStore: { getString: jest.Mock } };
      PreferencesStore.getString.mockReturnValueOnce(null);
      const result = await dispatcher.dispatchPushNotification(
        makeGuardian({ fcmToken: 'tkn123', publicKey: 'pubkey123', trustLevel: 2 }),
        makePayload(),
      );
      expect(result).toBe('no_token');
    });
  });
});
