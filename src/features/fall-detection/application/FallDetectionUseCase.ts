import { NativeEventEmitter, NativeModules } from 'react-native';
import { v4 as uuid } from 'uuid';
import { EventBus } from '@core/events/EventBus';
import { FALL_CONFIDENCE_THRESHOLD } from '../domain/entities/FallEvent';
import { Logger } from '@core/logger/Logger';

const TAG = 'FallDetectionUseCase';

interface AccelSample {
  x: number; y: number; z: number; timestamp: number;
}

// Physics thresholds
const FREEFALL_G_THRESHOLD = 0.5;      // magnitude < 0.5g indicates freefall
const FREEFALL_MIN_DURATION_MS = 80;   // freefall must last at least 80ms
const IMPACT_G_THRESHOLD = 2.5;        // magnitude > 2.5g indicates impact
const STILLNESS_G_THRESHOLD = 0.3;     // variance < 0.3 post-impact = stillness
const STILLNESS_WINDOW_MS = 2_000;     // evaluate stillness over 2s post-impact

type Phase = 'idle' | 'freefall' | 'impact_detected';

class FallDetectionUseCaseClass {
  private emitter: NativeEventEmitter | null = null;
  private accelSub: ReturnType<NativeEventEmitter['addListener']> | null = null;

  private phase: Phase = 'idle';
  private freefallStart = 0;
  private freefallDurationMs = 0;
  private impactMagnitude = 0;
  private postImpactSamples: AccelSample[] = [];
  private postImpactStart = 0;
  private isRunning = false;
  private cooldownUntil = 0;

  start(): void {
    if (this.isRunning) return;
    this.emitter = new NativeEventEmitter(NativeModules.SensorModule as object);
    this.accelSub = this.emitter.addListener('GC_ACCELEROMETER_DATA', this.onSample);
    this.isRunning = true;
    Logger.info(TAG, 'Fall detection started');
  }

  stop(): void {
    if (!this.isRunning) return;
    this.accelSub?.remove();
    this.phase = 'idle';
    this.isRunning = false;
    Logger.info(TAG, 'Fall detection stopped');
  }

  private onSample = (sample: AccelSample): void => {
    const now = sample.timestamp;
    if (now < this.cooldownUntil) return;

    const mag = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) / 9.81;

    switch (this.phase) {
      case 'idle':
        if (mag < FREEFALL_G_THRESHOLD) {
          this.phase = 'freefall';
          this.freefallStart = now;
        }
        break;

      case 'freefall':
        if (mag < FREEFALL_G_THRESHOLD) {
          // still in freefall
          const elapsed = now - this.freefallStart;
          if (elapsed >= FREEFALL_MIN_DURATION_MS && mag > IMPACT_G_THRESHOLD) {
            // impact spike detected mid-freefall tracking — rare edge case
          }
        } else if (mag > IMPACT_G_THRESHOLD) {
          // impact detected after freefall
          this.freefallDurationMs = now - this.freefallStart;
          this.impactMagnitude = mag;
          this.phase = 'impact_detected';
          this.postImpactStart = now;
          this.postImpactSamples = [];
        } else {
          // freefall ended without impact — reset
          this.phase = 'idle';
        }
        break;

      case 'impact_detected':
        this.postImpactSamples.push(sample);

        if (now - this.postImpactStart >= STILLNESS_WINDOW_MS) {
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
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    const variance = mags.reduce((sum, m) => sum + (m - mean) ** 2, 0) / mags.length;

    const postImpactStillnessMs = variance < STILLNESS_G_THRESHOLD
      ? STILLNESS_WINDOW_MS
      : Math.max(0, STILLNESS_WINDOW_MS * (1 - variance));

    // Confidence model: weighted product of three sub-scores
    const freefallScore  = Math.min(1.0, this.freefallDurationMs / 500);
    const impactScore    = Math.min(1.0, (this.impactMagnitude - IMPACT_G_THRESHOLD) / 4.0);
    const stillnessScore = Math.min(1.0, postImpactStillnessMs / STILLNESS_WINDOW_MS);

    const confidence = freefallScore * 0.35 + impactScore * 0.45 + stillnessScore * 0.20;

    Logger.debug(TAG, `Fall evaluated: ff=${freefallScore.toFixed(2)} impact=${impactScore.toFixed(2)} still=${stillnessScore.toFixed(2)} → conf=${confidence.toFixed(2)}`);

    if (confidence >= FALL_CONFIDENCE_THRESHOLD) {
      const eventId = uuid();
      this.cooldownUntil = Date.now() + 120_000; // 2 min cooldown after a detected fall
      EventBus.emit('fall:detected', {
        eventId,
        confidence,
        impactMagnitude: this.impactMagnitude,
      });
      Logger.warn(TAG, `Fall detected — confidence ${confidence.toFixed(2)}`);
    }
  }
}

export const FallDetectionUseCase = new FallDetectionUseCaseClass();
