/**
 * VehicleCrashDetectionUseCase unit tests.
 *
 * The FSM: idle → moving (when GPS speed ≥ 8.3 m/s) → impact_detected (G > 3.0g)
 * → evaluatePostImpact → emit 'fall:detected' if confidence ≥ 0.75.
 *
 * We bypass NativeEventEmitter by calling the private onSample and evaluatePostImpact
 * methods directly via (use as any).
 */

import { EventBus } from '../../../../src/core/events/EventBus';
import { VehicleCrashDetectionUseCase as _VehicleCrashDetectionUseCase } from '../../../../src/features/vehicle-crash/application/VehicleCrashDetectionUseCase';

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
  NativeModules: { SensorModule: {} },
}));

jest.mock('../../../../src/core/logger/Logger', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUseCase = any;

describe('VehicleCrashDetectionUseCase', () => {
  let useCase: AnyUseCase;

  beforeEach(() => {
    useCase = _VehicleCrashDetectionUseCase;
    useCase.start();
  });

  afterEach(() => {
    useCase.stop();
  });

  it('stays idle when speed is below threshold', () => {
    useCase.updateSpeed({ lat: 0, lng: 0, speed: 5 }); // < 8.3 m/s
    expect(useCase.phase).toBe('idle');
  });

  it('transitions to moving when speed ≥ 30 km/h (8.3 m/s)', () => {
    useCase.updateSpeed({ lat: 0, lng: 0, speed: 10 });
    expect(useCase.phase).toBe('moving');
  });

  it('detects crash above G threshold when moving', () => {
    useCase.updateSpeed({ lat: 0, lng: 0, speed: 15 });
    const highGSample = { x: 30, y: 0, z: 0, timestamp: Date.now() }; // ~3.06g
    useCase.onSample(highGSample);
    expect(useCase.phase).toBe('impact_detected');
  });

  it('emits crash:detected when confidence exceeds threshold', () => {
    const spy = jest.spyOn(EventBus, 'emit');

    // Set up: moving at 20 m/s (72 km/h) with very high impact (8g)
    useCase.phase = 'moving';
    useCase.speedBeforeMs = 20;
    useCase.impactMagnitude = 8.0;  // 5g above threshold → impactScore=1.0
    useCase.postImpactSamples = Array.from({ length: 10 }, (_, i) => ({
      x: 0, y: 9.81, z: 0, timestamp: Date.now() + i * 100, // ~1g — still
    }));

    useCase.evaluatePostImpact();

    expect(spy).toHaveBeenCalledWith('crash:detected', expect.objectContaining({
      eventId: 'test-uuid',
      confidence: expect.any(Number),
    }));

    const callArgs = spy.mock.calls[0][1] as { confidence: number };
    expect(callArgs.confidence).toBeGreaterThanOrEqual(0.75);

    spy.mockRestore();
  });

  it('does NOT emit when confidence is below threshold', () => {
    const spy = jest.spyOn(EventBus, 'emit');

    // Slow speed + weak impact = low confidence
    useCase.phase = 'moving';
    useCase.speedBeforeMs = 9;      // ~32 km/h — low speed score
    useCase.impactMagnitude = 3.1;  // barely above threshold — low impact score
    useCase.postImpactSamples = Array.from({ length: 10 }, (_, i) => ({
      x: 5, y: 5, z: 5, timestamp: Date.now() + i * 100, // noisy — low still score
    }));

    useCase.evaluatePostImpact();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
