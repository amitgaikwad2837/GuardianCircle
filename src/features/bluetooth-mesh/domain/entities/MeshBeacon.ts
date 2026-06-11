export type BeaconMessageType = 'SOS' | 'OK' | 'RELAY';

/**
 * BLE Advertisement payload — 28 bytes, fits single BLE advertisement packet.
 *
 * Layout:
 *   [2]  Magic: 0x4743 ("GC")
 *   [16] Rotating pseudonymous ID (changes every 15 minutes)
 *   [1]  Message type
 *   [4]  Timestamp (Unix seconds, uint32)
 *   [4]  Message ID (deduplication)
 *   [1]  Hop count (max 5)
 */
export interface MeshBeacon {
  magic: number;              // 0x4743
  rotatingId: string;         // 16-byte hex — changes every 15 min, not linked to identity
  messageType: BeaconMessageType;
  timestamp: number;          // Unix seconds
  messageId: string;          // 4-byte hex — for deduplication
  hopCount: number;           // 0–5
}

export const MESH_MAGIC = 0x4743;
export const MAX_HOP_COUNT = 5;
export const ROTATING_ID_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
