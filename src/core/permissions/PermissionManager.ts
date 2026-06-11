import { PermissionsAndroid, Linking } from 'react-native';

export type AppPermission =
  | 'sms'
  | 'call'
  | 'location'
  | 'backgroundLocation'
  | 'contacts'
  | 'microphone'
  | 'camera'
  | 'notifications';

const ANDROID_PERMISSIONS: Record<AppPermission, string | null> = {
  sms: PermissionsAndroid.PERMISSIONS.SEND_SMS,
  call: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  location: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  backgroundLocation: PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  contacts: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  camera: PermissionsAndroid.PERMISSIONS.CAMERA,
  notifications: null, // Handled via Notifee on Android 13+
};

export const PermissionManager = {
  async request(permission: AppPermission): Promise<boolean> {
    const androidPerm = ANDROID_PERMISSIONS[permission];
    if (!androidPerm) return true; // handled elsewhere

    const result = await PermissionsAndroid.request(androidPerm);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  },

  async check(permission: AppPermission): Promise<boolean> {
    const androidPerm = ANDROID_PERMISSIONS[permission];
    if (!androidPerm) return true;

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
