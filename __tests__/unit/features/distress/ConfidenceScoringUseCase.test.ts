import { ConfidenceScoringUseCase } from '@features/distress/application/ConfidenceScoringUseCase';

jest.mock('@core/storage/preferences/PreferencesStore', () => ({
  PreferencesStore: { getString: jest.fn().mockReturnValue('medium') },
  PREF_KEYS: { SENSITIVITY_LEVEL: 'sensitivity_level' },
}));

describe('ConfidenceScoringUseCase', () => {
  const useCase = new ConfidenceScoringUseCase();

  it('returns 0 for empty signal list', () => {
    expect(useCase.compute([])).toBe(0);
  });

  it('computes weighted average of signals', () => {
    const signals = [
      { type: 'motion_agitation' as const, value: 0.8, weight: 0.5, timestamp: Date.now() },
      { type: 'motion_stillness' as const, value: 0.6, weight: 0.5, timestamp: Date.now() },
    ];
    const score = useCase.compute(signals);
    // raw = (0.8*0.5 + 0.6*0.5) / 1.0 = 0.70, medium multiplier = 1.0
    expect(score).toBeCloseTo(0.70, 2);
  });

  it('clamps result to 1.0 for high sensitivity with strong signals', async () => {
    const { PreferencesStore } = await import('@core/storage/preferences/PreferencesStore');
    jest.mocked(PreferencesStore.getString).mockReturnValueOnce('high');
    const signals = [
      { type: 'motion_agitation' as const, value: 1.0, weight: 1.0, timestamp: Date.now() },
    ];
    expect(useCase.compute(signals)).toBeLessThanOrEqual(1.0);
  });

  it('medium sensitivity: alerts at 0.70', () => {
    expect(useCase.shouldAlert(0.71)).toBe(true);
    expect(useCase.shouldAlert(0.69)).toBe(false);
  });
});
