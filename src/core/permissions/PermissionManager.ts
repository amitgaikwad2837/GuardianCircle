import { PermissionsAndroid, Linking } from 'react-native';

export type AppPermission =
  | 'sms'
  | 'call'
  | 'location'
  | 'backgroundLocation'
  | 'contacts'
  | 'microphone'
  | 'camera'
  | 'notifications'
  | 'bluetoothScan'
  | 'bluetoothAdvertise';

import type { Permission } from 'react-native';

const ANDROID_PERMISSIONS: Record<AppPermission, Permission | null> = {
  sms: PermissionsAndroid.PERMISSIONS.SEND_SMS as Permission,
  call: PermissionsAndroid.PERMISSIONS.CALL_PHONE as Permission,
  location: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as Permission,
  backgroundLocation: PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION as Permission,
  contacts: PermissionsAndroid.PERMISSIONS.READ_CONTACTS as Permission,
  microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission,
  camera: PermissionsAndroid.PERMISSIONS.CAMERA as Permission,
  notifications: null, // Handled via Notifee on Android 13+
  // Android 12+ (API 31+) — required for BLE advertising and scanning
  bluetoothScan: 'android.permission.BLUETOOTH_SCAN' as Permission,
  bluetoothAdvertise: 'android.permission.BLUETOOTH_ADVERTISE' as Permission,
};

export const PermissionManager = {
  async request(permission: AppPermission): Promise<boolean> {
    const androidPerm = ANDROID_PERMISSIONS[permission];
    if (!androidPerm) {return true;} // handled elsewhere

    const result = await PermissionsAndroid.request(androidPerm);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  },

  async check(permission: AppPermission): Promise<boolean> {
    const androidPerm = ANDROID_PERMISSIONS[permission];
    if (!androidPerm) {return true;}

    const result = await PermissionsAndroid.check(androidPerm);
    return result;
  },

  async requestMultiple(permissions: AppPermission[]): Promise<Record<AppPermission, boolean>> {
    const results = {} as Record<AppPermission, boolean>;
    for (const perm of permissions) {
      results[perm] = await this.request(perm);
    }
    return results;
  },

  openSettings(): void {
    void Linking.openSettings();
  },
};
