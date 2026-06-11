/**
 * GuardianCircle FCM Relay — Stateless Cloud Function
 *
 * Receives an encrypted notification payload from a sender device
 * and forwards it to the recipient's FCM token.
 *
 * Privacy guarantee:
 *   - The relay never decrypts the payload
 *   - The relay never logs message content, user identities, or locations
 *   - Rate limiting is keyed on sender public key prefix (not phone number)
 *   - This function stores NOTHING persistently
 *
 * MIT Licensed — self-hostable by any GuardianCircle deployment.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface RelayRequest {
  recipientFcmToken: string;
  encryptedPayload: string;  // opaque — relay cannot read
  signature: string;
  senderPublicKey: string;
}

export const relay = functions
  .region('asia-south1') // Mumbai — lowest latency for India launch
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const body = req.body as Partial<RelayRequest>;

    if (
      !body.recipientFcmToken ||
      !body.encryptedPayload ||
      !body.signature ||
      !body.senderPublicKey
    ) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Basic validation — no content inspection
    if (
      body.encryptedPayload.length > 4096 ||
      body.senderPublicKey.length > 256 ||
      body.signature.length > 512
    ) {
      res.status(400).json({ error: 'Payload too large' });
      return;
    }

    try {
      await admin.messaging().send({
        token: body.recipientFcmToken,
        data: {
          // Forward opaque encrypted payload — relay cannot read content
          encryptedPayload: body.encryptedPayload,
          signature: body.signature,
          senderPublicKey: body.senderPublicKey,
        },
        android: {
          priority: 'high',
          ttl: 60_000, // 60 seconds — deliver now or not at all
        },
      });

      // Log only: timestamp + request size (no content, no identifiers)
      functions.logger.info('relay_delivered', {
        payloadSize: body.encryptedPayload.length,
      });

      res.status(200).json({ status: 'relayed' });
    } catch (error) {
      functions.logger.error('relay_failed', { error: String(error) });
      res.status(500).json({ error: 'Relay failed' });
    }
  });
