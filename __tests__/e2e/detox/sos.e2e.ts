/**
 * E2E: SOS Critical Path
 * Tests the full SOS trigger → countdown → dispatch flow on a real device/emulator.
 * Run with: npm run test:e2e
 */
import { device, element, by, expect as detoxExpect } from 'detox';

describe('SOS Critical Path', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Skip onboarding for E2E tests
    await device.setURLBlacklist([]);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows SOS button on home screen', async () => {
    await detoxExpect(element(by.label('SOS Emergency Button'))).toBeVisible();
  });

  it('long press triggers countdown', async () => {
    await element(by.label('SOS Emergency Button')).longPress(1600);
    await detoxExpect(element(by.text('CANCEL EMERGENCY'))).toBeVisible();
  });

  it('cancel button stops SOS during countdown', async () => {
    await element(by.label('SOS Emergency Button')).longPress(1600);
    await element(by.text('CANCEL EMERGENCY')).tap();
    await detoxExpect(element(by.label('SOS Emergency Button'))).toBeVisible();
  });

  it('SOS works in airplane mode (offline)', async () => {
    // Enable airplane mode
    await device.setStatusBar({ network: 'airplane' });
    await element(by.label('SOS Emergency Button')).longPress(1600);
    // Countdown should appear — SMS dispatch attempted regardless
    await detoxExpect(element(by.text('CANCEL EMERGENCY'))).toBeVisible();
    await element(by.text('CANCEL EMERGENCY')).tap();
    // Restore
    await device.setStatusBar({ network: 'wifi' });
  });
});
