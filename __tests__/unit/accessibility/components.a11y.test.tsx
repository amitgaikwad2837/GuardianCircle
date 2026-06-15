/**
 * Accessibility regression tests for shared interactive components.
 *
 * Strategy: render each component with RNTL and verify:
 *   1. Every interactive element has an accessibilityLabel.
 *   2. Buttons carry accessibilityRole="button".
 *   3. Emergency touch targets meet the 44-pt minimum (enforced via minHeight prop).
 *
 * These tests run in the existing `quality` CI job alongside unit tests and
 * fail the build if a label or role is accidentally removed.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AccessibleButton } from '@shared/components/AccessibleButton';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getBoolean: jest.fn().mockReturnValue(false),
    getString: jest.fn().mockReturnValue(undefined),
    getNumber: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// ── AccessibleButton ──────────────────────────────────────────────────────────

describe('AccessibleButton — accessibility attributes', () => {
  it('has accessibilityRole="button"', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="Confirm action">
        Confirm
      </AccessibleButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeTruthy();
  });

  it('exposes the provided accessibilityLabel', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="Delete item">
        Delete
      </AccessibleButton>,
    );
    expect(screen.getByLabelText('Delete item')).toBeTruthy();
  });

  it('exposes accessibilityHint when provided', () => {
    render(
      <AccessibleButton
        onPress={() => {}}
        accessibilityLabel="Submit"
        accessibilityHint="Double-tap to confirm your submission"
      >
        Submit
      </AccessibleButton>,
    );
    const btn = screen.getByLabelText('Submit');
    expect(btn.props.accessibilityHint).toBe('Double-tap to confirm your submission');
  });

  it('sets accessibilityState.disabled=true when disabled', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="Save" disabled>
        Save
      </AccessibleButton>,
    );
    const btn = screen.getByLabelText('Save');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('sets accessibilityState.disabled=false when enabled', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="Save">
        Save
      </AccessibleButton>,
    );
    const btn = screen.getByLabelText('Save');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('applies minimum touch target height (44pt default)', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="Action">
        Action
      </AccessibleButton>,
    );
    const btn = screen.getByLabelText('Action');
    // minHeight is applied via style — flatten and check
    const flatStyle = Array.isArray(btn.props.style)
      ? Object.assign({}, ...btn.props.style.filter(Boolean))
      : btn.props.style ?? {};
    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('uses the provided minHeight for emergency buttons (120pt)', () => {
    render(
      <AccessibleButton onPress={() => {}} accessibilityLabel="SOS" minHeight={120}>
        SOS
      </AccessibleButton>,
    );
    const btn = screen.getByLabelText('SOS');
    const flatStyle = Array.isArray(btn.props.style)
      ? Object.assign({}, ...btn.props.style.filter(Boolean))
      : btn.props.style ?? {};
    expect(flatStyle.minHeight).toBe(120);
  });

  it('renders ghost variant without throwing', () => {
    expect(() =>
      render(
        <AccessibleButton onPress={() => {}} accessibilityLabel="Skip" variant="ghost">
          Skip
        </AccessibleButton>,
      ),
    ).not.toThrow();
  });

  it('renders danger variant without throwing', () => {
    expect(() =>
      render(
        <AccessibleButton onPress={() => {}} accessibilityLabel="Delete" variant="danger">
          Delete
        </AccessibleButton>,
      ),
    ).not.toThrow();
  });
});
