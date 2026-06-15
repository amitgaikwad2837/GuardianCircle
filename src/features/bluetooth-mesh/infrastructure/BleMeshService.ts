import { NativeModules, NativeEventEmitter } from 'react-native';
import type { BeaconMessageType } from '../domain/entities/MeshBeacon';
import { ROTATING_ID_INTERVAL_MS } from '../domain/entities/MeshBeacon';

const native = NativeModules.BluetoothMeshModule as {
  startBeacon(typeCode: number, rotatingId: string, messageId: string): Promise<string>;
  stopBeacon(): Promise<string>;
  startScanning(): Promise<string>;
  stopScanning(): Promise<string>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
} | undefined;

const TYPE_CODES: Record<BeaconMessageType, number> = {
  SOS: 1,
  OK: 2,
  RELAY: 3,
};

export interface ReceivedBeacon {
  messageType: number;  // 1=SOS, 2=OK, 3=RELAY
  hopCount: number;
}

type BeaconCallback = (beacon: ReceivedBeacon) => void;

class BleMeshServiceImpl {
  private emitter: NativeEventEmitter | null = null;
  // Lazily generated so the class can be instantiated at module load time
  // without needing crypto.getRandomValues (not available until bridge is up).
  private rotatingId = '';
  private rotatingIdTimer: ReturnType<typeof setInterval> | null = null;

  get isSupported(): boolean {
    return !!native;
  }

  private newRotatingId(): string {
    // Math.random() is sufficient — this ID is pseudonymous, not a secret.
    // It rotates every 15 min purely to prevent physical tracking.
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  }

  private getRotatingId(): string {
    if (!this.rotatingId) { this.rotatingId = this.newRotatingId(); }
    return this.rotatingId;
  }

  private startRotating(): void {
    this.stopRotating();
    this.rotatingIdTimer = setInterval(() => {
      this.rotatingId = this.newRotatingId();
    }, ROTATING_ID_INTERVAL_MS);
  }

  private stopRotating(): void {
    if (this.rotatingIdTimer) {
      clearInterval(this.rotatingIdTimer);
      this.rotatingIdTimer = null;
    }
  }

  async startBeacon(type: BeaconMessageType): Promise<void> {
    if (!native) { return; }
    // 8-char hex message ID for deduplication — no crypto needed
    const messageId = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
    this.startRotating();
    await native.startBeacon(TYPE_CODES[type], this.getRotatingId(), messageId);
  }

  async stopBeacon(): Promise<void> {
    if (!native) { return; }
    this.stopRotating();
    await native.stopBeacon();
  }

  async startScanning(): Promise<void> {
    if (!native) { return; }
    await native.startScanning();
  }

  async stopScanning(): Promise<void> {
    if (!native) { return; }
    await native.stopScanning();
  }

  onBeaconReceived(cb: BeaconCallback): () => void {
    if (!native || !NativeModules.BluetoothMeshModule) { return () => {}; }
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(native);
    }
    const sub = this.emitter.addListener('GC_MESH_BEACON_RECEIVED', cb);
    return () => sub.remove();
  }
}

export const BleMeshService = new BleMeshServiceImpl();
