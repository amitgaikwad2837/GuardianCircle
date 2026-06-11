export type TrustLevel = 1 | 2 | 3;
// 1 = Basic (phone number only)
// 2 = Verified (cryptographic key exchange via QR/invite)
// 3 = Emergency-only (alerted but not shown in normal guardian list)

export interface Guardian {
  id: string;
  displayName: string;
  phoneNumber: string;        // E.164 format e.g. +919876543210
  publicKey?: string;         // Ed25519 base64 — present if trustLevel === 2
  fcmToken?: string;          // FCM token — present if guardian has app installed
  fcmTokenUpdatedAt?: Date;
  trustLevel: TrustLevel;
  notificationPriority: number; // 1 = first to be called
  isActive: boolean;
  isDecoy: boolean;           // shown only in decoy mode
  addedAt: Date;
  lastAlertAt?: Date;
  notes?: string;
  removalScheduledAt?: Date;  // delayed removal
  createdAt: Date;
  updatedAt: Date;
}
