export type EvidenceType = 'photo' | 'audio' | 'video' | 'note' | 'location_snapshot';

export interface Evidence {
  id: string;
  incidentId?: string;
  type: EvidenceType;
  fileUri?: string;
  contentHash: string;
  capturedAt: Date;
  lat?: number;
  lng?: number;
  metadata: Record<string, unknown>;
  isEncrypted: boolean;
  createdAt: Date;
}
