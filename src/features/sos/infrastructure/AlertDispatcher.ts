import type { IAlertDispatcher, AlertPayload } from '../domain/interfaces/IAlertDispatcher';
import type { Guardian } from '@features/guardian/domain/entities/Guardian';
import { SmsService, SmsTemplates } from '@core/sms/SMSService';
import { EncryptionService } from '@core/crypto/EncryptionService';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { SecureStore } from '@core/storage/secure/SecureStore';
import { Logger } from '@core/logger/Logger';
import { Linking } from 'react-native';

const TAG = 'AlertDispatcher';

// Circuit breaker: skip push after 2 consecutive failures to avoid blocking SOS on dead relay.
// Resets when a push succeeds.
let consecutivePushFailures = 0;
const PUSH_CIRCUIT_OPEN_AFTER = 2;

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
    if (!guardian.fcmToken) {return 'no_token';}
    if (!guardian.encryptionPublicKey) {
      // Push without E2E encryption is not permitted — relay requires encrypted payload.
      // Guardian receives SMS only until they pair via QR (Level 2 trust).
      Logger.debug(TAG, 'dispatchPushNotification — no encryptionPublicKey, skipping push');
      return 'no_token';
    }

    const relayEndpoint = await SecureStore.get('relay_endpoint');
    if (!relayEndpoint) {
      Logger.debug(TAG, 'dispatchPushNotification — relay endpoint not configured');
      return 'no_token';
    }

    if (consecutivePushFailures >= PUSH_CIRCUIT_OPEN_AFTER) {
      Logger.warn(TAG, 'dispatchPushNotification — circuit open, skipping push after consecutive failures');
      return 'failed';
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetch(relayEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientFcmToken: guardian.fcmToken,
            encryptedPayload,
            signature,
            senderPublicKey,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        consecutivePushFailures += 1;
        Logger.warn(TAG, 'dispatchPushNotification relay error', { status: response.status, consecutivePushFailures });
        return 'failed';
      }

      consecutivePushFailures = 0;
      Logger.info(TAG, 'dispatchPushNotification sent');
      return 'sent';
    } catch (err) {
      consecutivePushFailures += 1;
      Logger.error(TAG, 'dispatchPushNotification failed', {
        error: err instanceof Error ? err.message : String(err),
        consecutivePushFailures,
      });
      return 'failed';
    }
  }
}
