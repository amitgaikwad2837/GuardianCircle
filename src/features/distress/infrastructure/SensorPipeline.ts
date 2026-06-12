import { NativeEventEmitter, NativeModules } from 'react-native';
import type { DistressSignal } from '@core/events/EventTypes';
import { EventBus } from '@core/events/EventBus';
import { v4 as uuid } from 'uuid';
import { ConfidenceScoringUseCase } from '../application/ConfidenceScoringUseCase';
import { SQLiteDistressRepository } from './SQLiteDistressRepository';
import { Container, DI_TOKENS } from '@core/di/Container';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { SensitivityLevel } from '../domain/entities/DistressEvent';
import { Logger } from '@core/logger/Logger';

const TAG = 'SensorPipeline';

interface AccelSample {
  x: number; y: number; z: number; timestamp: number;
}

const WINDOW_MS = 3_000;
const SAMPLE_RATE_HZ = 25;
const AGITATION_THRESHOLD = 2.0;
const STILLNESS_THRESHOLD = 0.3;
const FACE_DOWN_THRESHOLD = -8.5;

const scorer = new ConfidenceScoringUseCase();

class SensorPipelineClass {
  private emitter: NativeEventEmitter | null = null;
  private accelSub: ReturnType<NativeEventEmitter['addListener']> | null = null;
  private window: AccelSample[] = [];
  private cooldownUntil = 0;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.emitter = new NativeEventEmitter(NativeModules.SensorModule as object);
    NativeModules.SensorModule?.startListening(SAMPLE_RATE_HZ);
    this.accelSub = this.emitter.addListener('GC_ACCELEROMETER_DATA', this.onSample);
    this.isRunning = true;
    Logger.info(TAG, 'Pipeline started');
  }

  stop(): void {
    if (!this.isRunning) return;
    this.accelSub?.remove();
    NativeModules.SensorModule?.stopListening();
    this.window = [];
    this.isRunning = false;
    Logger.info(TAG, 'Pipeline stopped');
  }

  private onSample = (sample: AccelSample): void => {
    const now = Date.now();

    // Evict samples older than the window
    this.window = this.window.filter((s) => now - s.timestamp <= WINDOW_MS);
    this.window.push(sample);

    if (this.window.length < 10) return; // need enough samples
    if (now < this.cooldownUntil) return; // suppress after an alert

    const signals = this.extractSignals(now);
    const confidence = scorer.compute(signals);

    if (scorer.shouldAlert(confidence)) {
      this.cooldownUntil = now + 60_000; // 60s cooldown
      this.emitDetection(confidence, signals);
    }
  };

  private extractSignals(now: number): DistressSignal[] {
    const recent = this.window.slice(-30); // last ~1.2s at 25Hz
    const magnitudes = recent.map((s) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z));
    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance =
      magnitudes.reduce((sum, m) => sum + (m - mean) ** 2, 0) / magnitudes.length;

    const signals: DistressSignal[] = [];

    // Agitation: high variance in acceleration magnitude
    const agitationValue = Math.min(1.0, variance / AGITATION_THRESHOLD);
    if (agitationValue > 0.1) {
      signals.push({
        type: 'motion_agitation',
        value: agitationValue,
        weight: 0.45,
        timestamp: now,
      });
    }

    // Stillness: very low variance (device dropped / person frozen)
    if (variance < STILLNESS_THRESHOLD && this.window.length >= 50) {
      signals.push({
        type: 'motion_stillness',
        value: 1.0 - variance / STILLNESS_THRESHOLD,
        weight: 0.25,
        timestamp: now,
      });
    }

    // Face-down: negative Z dominates (device flipped)
    const avgZ = recent.reduce((sum, s) => sum + s.z, 0) / recent.length;
    if (avgZ < FACE_DOWN_THRESHOLD) {
      signals.push({
        type: 'device_face_down',
        value: Math.min(1.0, Math.abs(avgZ) / 9.81),
        weight: 0.30,
        timestamp: now,
      });
    }

    return signals;
  }

  private emitDetection(confidence: number, signals: DistressSignal[]): void {
    const eventId = uuid();
    const level = (PreferencesStore.getString(PREF_KEYS.SENSITIVITY_LEVEL) ?? 'medium') as SensitivityLevel;

    // Persist async — do not await in the hot sensor path
    try {
      const repo = Container.resolve<SQLiteDistressRepository>(DI_TOKENS.IDistressRepository);
      void repo.saveEvent({
        detectedAt: new Date(),
        confidence,
        signals,
        sensitivityLevel: level,
      });
    } catch {
      // Repo may not be registered in tests — tolerate gracefully
    }

    EventBus.emit('distress:detected', { eventId, confidence, signals });
    Logger.warn(TAG, `Distress detected — confidence ${confidence.toFixed(2)}`);
  }
}

export const SensorPipeline = new SensorPipelineClass();
