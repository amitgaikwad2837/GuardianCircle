/**
 * Jest global setup — runs after the test framework is installed.
 * Extends Jest matchers with react-native-testing-library assertions.
 */
import '@testing-library/jest-native/extend-expect';

// Silence specific React Native warnings that are irrelevant in test environment
const originalWarn = console.warn.bind(console);
beforeAll(() => {
  console.warn = (msg: unknown, ...args: unknown[]) => {
    const str = String(msg);
    // Suppress known non-actionable warnings in test env
    if (
      str.includes('Sending `onAnimatedValueUpdate`') ||
      str.includes('act(') ||
      str.includes('Each child in a list should have a unique')
    ) {
      return;
    }
    originalWarn(msg, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// Mock MMKV — native module not available in Jest environment
jest.mock('react-native-mmkv', () => {
  const store: Record<string, unknown> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: (key: string, value: unknown) => { store[key] = value; },
      getString: (key: string) => (typeof store[key] === 'string' ? store[key] : undefined),
      getBoolean: (key: string) => (typeof store[key] === 'boolean' ? store[key] : undefined),
      getNumber: (key: string) => (typeof store[key] === 'number' ? store[key] : undefined),
      delete: (key: string) => { delete store[key]; },
      clearAll: () => { Object.keys(store).forEach(k => { delete store[k]; }); },
    })),
  };
});

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue({ username: 'key', password: 'value' }),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  SECURITY_LEVEL: { SECURE_HARDWARE: 'SECURE_HARDWARE', ANY: 'ANY' },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock native CryptoModule (Android Keystore — not available in Jest)
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.CryptoModule = {
    generateKeyPair: jest.fn().mockResolvedValue({ publicKey: 'mock_pubkey', keyAlias: 'identity_private_key' }),
    generateAESKey: jest.fn().mockResolvedValue(undefined),
    getKeyMaterial: jest.fn().mockResolvedValue('mock_db_key_base64'),
    sign: jest.fn().mockResolvedValue('mock_signature'),
    verify: jest.fn().mockResolvedValue(true),
    encrypt: jest.fn().mockResolvedValue({ ciphertext: 'mock_cipher', iv: 'mock_iv' }),
    decrypt: jest.fn().mockResolvedValue('mock_plaintext'),
    isHardwareBacked: jest.fn().mockResolvedValue(true),
    deleteKey: jest.fn().mockResolvedValue(undefined),
  };
  RN.NativeModules.SmsModule = {
    sendSms: jest.fn().mockResolvedValue('sent'),
    sendBatch: jest.fn().mockResolvedValue([]),
  };
  RN.NativeModules.ContactPickerModule = {
    pickContact: jest.fn().mockResolvedValue({ displayName: 'Test Contact', phoneNumbers: ['+919876543210'] }),
  };
  RN.NativeModules.SensorModule = {
    startListening: jest.fn(),
    stopListening: jest.fn(),
  };
  return RN;
});

// Mock @op-engineering/op-sqlite
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn().mockReturnValue({
    execute: jest.fn().mockReturnValue({ rows: { _array: [] } }),
    close: jest.fn(),
  }),
}));

// Mock Firebase Messaging
jest.mock('@react-native-firebase/messaging', () => () => ({
  getToken: jest.fn().mockResolvedValue('mock_fcm_token'),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  requestPermission: jest.fn().mockResolvedValue(1),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  PERMISSIONS: {
    ANDROID: {
      SEND_SMS: 'android.permission.SEND_SMS',
      CALL_PHONE: 'android.permission.CALL_PHONE',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      READ_CONTACTS: 'android.permission.READ_CONTACTS',
      ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_ADVERTISE: 'android.permission.BLUETOOTH_ADVERTISE',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
}));
