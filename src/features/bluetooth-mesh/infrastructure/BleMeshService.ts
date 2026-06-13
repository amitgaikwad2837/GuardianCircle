import { NativeModules, NativeEventEmitter } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
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
  private rotatingId = this.newRotatingId();
  private rotatingIdTimer: ReturnType<typeof setInterval> | null = null;

  get isSupported(): boolean {
    return !!native;
  }

  private newRotatingId(): string {
    // 16 pseudo-random bytes encoded as hex — not linked to device identity
    return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 0);
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
    // 4-byte hex message ID for deduplication by receivers
    const messageId = uuidv4().replace(/-/g, '').slice(0, 8);
    this.startRotating();
    await native.startBeacon(TYPE_CODES[type], this.rotatingId, messageId);
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
      this.emitter = new NativeEventEmitter(NativeModules.BluetoothMeshModule);
    }
    const sub = this.emitter.addListener('GC_MESH_BEACON_RECEIVED', cb);
    return () => sub.remove();
  }
}

export const BleMeshService = new BleMeshServiceImpl();
