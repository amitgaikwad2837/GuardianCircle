export type TrustLevel = 1 | 2 | 3;
// 1 = Basic (phone number only)
// 2 = Verified (cryptographic key exchange via QR/invite)
// 3 = Emergency-only (alerted but not shown in normal guardian list)

export interface Guardian {
  id: string;
  displayName: string;
  phoneNumber: string;          // E.164 format e.g. +919876543210
  /** ECDSA signing key (base64) — used to verify FCM message signatures. Present if trustLevel === 2. */
  signingPublicKey?: string;
  /** ECDH encryption key (base64) — used to encrypt FCM payloads for this guardian. Present if trustLevel === 2. */
  encryptionPublicKey?: string;
  fcmToken?: string;            // FCM token — present if guardian has app installed
  fcmTokenUpdatedAt?: Date;
  trustLevel: TrustLevel;
  notificationPriority: number; // 1 = first to be called
  isActive: boolean;
  isDecoy: boolean;             // shown only in decoy mode
  addedAt: Date;
  lastAlertAt?: Date;
  notes?: string;
  removalScheduledAt?: Date;    // delayed removal (24 h DV safety feature)
  createdAt: Date;
  updatedAt: Date;
}
