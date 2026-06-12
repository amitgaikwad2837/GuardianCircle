import type { IAlertDispatcher, AlertPayload } from '../domain/interfaces/IAlertDispatcher';
import type { Guardian } from '@features/guardian/domain/entities/Guardian';
import { SmsService, SmsTemplates } from '@core/sms/SMSService';
import { EncryptionService } from '@core/crypto/EncryptionService';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { Logger } from '@core/logger/Logger';
import { NativeModules, Linking } from 'react-native';

const TAG = 'AlertDispatcher';

interface NativePhoneModule {
  call(phoneNumber: string): Promise<void>;
}

export class AlertDispatcher implements IAlertDispatcher {
  async dispatchSMS(
    guardian: Guardian,
    payload: AlertPayload,
  ): Promise<'sent' | 'failed'> {
    const message = payload.escalationLevel > 0
      ? SmsTemplates.escalationUpdate(
          payload.senderName,
          payload.location,
          payload.escalationLevel,
          payload.incidentId,
        )
      : SmsTemplates.sosAlert(
          payload.senderName,
          payload.location,
          payload.incidentId,
        );

    const result = await SmsService.send(guardian.phoneNumber, message);
    Logger.info(TAG, 'dispatchSMS', {
      result,
      phone: guardian.phoneNumber.slice(0, 6) + '****',
      level: payload.escalationLevel,
    });
    return result;
  }

  async dispatchCall(guardian: Guardian): Promise<'initiated' | 'failed'> {
    try {
      const url = `tel:${guardian.phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Logger.warn(TAG, 'dispatchCall — tel: not supported');
        return 'failed';
      }
      await Linking.openURL(url);
      Logger.info(TAG, 'dispatchCall initiated', {
        phone: guardian.phoneNumber.slice(0, 6) + '****',
      });
      return 'initiated';
    } catch (err) {
      Logger.error(TAG, 'dispatchCall failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 'failed';
    }
  }

  async dispatchPushNotification(
    guardian: Guardian,
    payload: AlertPayload,
  ): Promise<'sent' | 'no_token' | 'failed'> {
    if (!guardian.fcmToken) return 'no_token';
    if (!guardian.encryptionPublicKey) {
      // Push without E2E encryption is not permitted — relay requires encrypted payload.
      // Guardian receives SMS only until they pair via QR (Level 2 trust).
      Logger.debug(TAG, 'dispatchPushNotification — no encryptionPublicKey, skipping push');
      return 'no_token';
    }

    const relayEndpoint = PreferencesStore.getString(PREF_KEYS.RELAY_ENDPOINT);
    if (!relayEndpoint) {
      Logger.debug(TAG, 'dispatchPushNotification — relay endpoint not configured');
      return 'no_token';
    }

    try {
      const plaintextJson = JSON.stringify({
        incidentId: payload.incidentId,
        senderName: payload.senderName,
        locationLat: payload.location?.lat ?? null,
        locationLng: payload.location?.lng ?? null,
        escalationLevel: payload.escalationLevel,
        isSilent: payload.isSilent,
        sentAt: Date.now(),
      });

      // Encrypt with guardian's ECDH key — only they can decrypt with their private key
      const encryptedPayload = await EncryptionService.encryptForRecipient(
        plaintextJson,
        guardian.encryptionPublicKey,
      );

      const senderPublicKey = IdentityManager.getPublicKey();
      const signature       = await IdentityManager.sign(encryptedPayload);

      const response = await fetch(relayEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientFcmToken: guardian.fcmToken,
          encryptedPayload,
          signature,
          senderPublicKey,
        }),
      });

      if (!response.ok) {
        Logger.warn(TAG, 'dispatchPushNotification relay error', { status: response.status });
        return 'failed';
      }

      Logger.info(TAG, 'dispatchPushNotification sent');
      return 'sent';
    } catch (err) {
      Logger.error(TAG, 'dispatchPushNotification failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 'failed';
    }
  }
}
