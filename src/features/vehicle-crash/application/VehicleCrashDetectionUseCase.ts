import { NativeEventEmitter, NativeModules } from 'react-native';
import { v4 as uuid } from 'uuid';
import { EventBus } from '@core/events/EventBus';
import { CRASH_CONFIDENCE_THRESHOLD } from '../domain/entities/CrashEvent';
import { Logger } from '@core/logger/Logger';
import type { Coordinates } from '@core/location/LocationService';

const TAG = 'VehicleCrashDetection';

interface AccelSample {
  x: number; y: number; z: number; timestamp: number;
}

// A crash requires prior motion — ignore impacts when stationary
const MIN_SPEED_FOR_CRASH_MS = 8.3;   // 30 km/h in m/s
const CRASH_IMPACT_G = 3.0;           // peak G-force threshold for crash
const POST_CRASH_WINDOW_MS = 3_000;   // 3s post-impact assessment window

type Phase = 'idle' | 'moving' | 'impact_detected';

class VehicleCrashDetectionUseCaseClass {
  private emitter: NativeEventEmitter | null = null;
  private accelSub: ReturnType<NativeEventEmitter['addListener']> | null = null;

  private phase: Phase = 'idle';
  private speedBeforeMs    = 0;
  private impactMagnitude  = 0;
  private postImpactSamples: AccelSample[] = [];
  private postImpactStartWall = 0; // wall-clock ms (Date.now()) — NOT sensor timestamp
  private lastDetectionWall   = 0; // wall-clock ms of last confirmed detection
  private isRunning           = false;

  private static readonly COOLDOWN_MS = 180_000;

  start(): void {
    if (this.isRunning) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.emitter  = new NativeEventEmitter(NativeModules.SensorModule as any);
    this.accelSub = this.emitter.addListener('GC_ACCELEROMETER_DATA', this.onSample);
    this.isRunning = true;
    Logger.info(TAG, 'Vehicle crash detection started');
  }

  stop(): void {
    if (!this.isRunning) return;
    this.accelSub?.remove();
    this.phase = 'idle';
    this.isRunning = false;
    Logger.info(TAG, 'Vehicle crash detection stopped');
  }

  /** Call this whenever a GPS location update arrives (e.g. from LocationService). */
  updateSpeed(location: Coordinates): void {
    if (!this.isRunning) return;
    const speedMs = location.speed ?? 0;
    if (this.phase === 'idle' && speedMs >= MIN_SPEED_FOR_CRASH_MS) {
      this.phase = 'moving';
      this.speedBeforeMs = speedMs;
    } else if (this.phase === 'moving') {
      this.speedBeforeMs = speedMs;
    }
  }

  private onSample = (sample: AccelSample): void => {
    // Use wall clock for cooldown — sensor timestamps use boot-time nanoseconds,
    // not Unix epoch milliseconds, and must not be compared to Date.now().
    const wallNow = Date.now();
    if (wallNow - this.lastDetectionWall < VehicleCrashDetectionUseCaseClass.COOLDOWN_MS) return;

    const mag = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) / 9.81;

    switch (this.phase) {
      case 'idle':
        break; // Not moving — ignore

      case 'moving':
        if (mag > CRASH_IMPACT_G) {
          this.phase = 'impact_detected';
          this.impactMagnitude     = mag;
          this.postImpactStartWall = wallNow;
          this.postImpactSamples   = [];
        }
        break;

      case 'impact_detected':
        this.postImpactSamples.push(sample);
        if (wallNow - this.postImpactStartWall >= POST_CRASH_WINDOW_MS) {
          this.evaluatePostImpact();
          this.phase = 'idle';
        }
        break;
    }
  };

  private evaluatePostImpact(): void {
    const mags = this.postImpactSamples.map(
      (s) => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2) / 9.81,
    );
    const mean = mags.length > 0 ? mags.reduce((a, b) => a + b, 0) / mags.length : 0;
    const variance =
      mags.length > 0
        ? mags.reduce((sum, m) => sum + (m - mean) ** 2, 0) / mags.length
        : 0;

    // Confidence model:
    const speedScore   = Math.min(1.0, this.speedBeforeMs / 25);       // 90 km/h = max
    const impactScore  = Math.min(1.0, (this.impactMagnitude - CRASH_IMPACT_G) / 5.0);
    const stillScore   = Math.min(1.0, 1.0 - variance / 2.0);          // low variance post-impact = still

    const confidence = speedScore * 0.30 + impactScore * 0.50 + stillScore * 0.20;

    Logger.debug(TAG,
      `Crash eval: speed=${speedScore.toFixed(2)} impact=${impactScore.toFixed(2)} still=${stillScore.toFixed(2)} → conf=${confidence.toFixed(2)}`,
    );

    if (confidence >= CRASH_CONFIDENCE_THRESHOLD) {
      const eventId = uuid();
      this.lastDetectionWall = Date.now();
      EventBus.emit('crash:detected', {
        eventId,
        confidence,
        impactMagnitude: this.impactMagnitude,
      });
      Logger.warn(TAG, `Vehicle crash detected — confidence ${confidence.toFixed(2)}`);
    }

    this.speedBeforeMs = 0;
  }
}

export const VehicleCrashDetectionUseCase = new VehicleCrashDetectionUseCaseClass();
