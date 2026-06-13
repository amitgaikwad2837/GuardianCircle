import React, { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { EventBus } from '@core/events/EventBus';
import { useDistressStore } from '@features/distress/presentation/store/distressStore';
import type { DistressSignal } from '@core/events/EventTypes';
import DistressAlertScreen from '@features/distress/presentation/screens/DistressAlertScreen';
import FallResponseScreen from '@features/fall-detection/presentation/screens/FallResponseScreen';
import CrashResponseScreen from '@features/vehicle-crash/presentation/screens/CrashResponseScreen';

type FallPayload = { eventId: string; confidence: number; impactMagnitude: number };

/**
 * Renders emergency modals above the entire nav tree.
 * Priority: distress > fall > crash (only one shown at a time).
 *
 * Uses separate EventBus channels:
 *   distress:detected  → DistressAlertScreen
 *   fall:detected      → FallResponseScreen
 *   crash:detected     → CrashResponseScreen
 */
export function RootModalManager(): React.JSX.Element {
  const active      = useDistressStore((s) => s.active);
  const activeFall  = useDistressStore((s) => s.activeFall);
  const activeCrash = useDistressStore((s) => s.activeCrash);

  useEffect(() => {
    const onDistress = (payload: { eventId: string; confidence: number; signals: DistressSignal[] }): void => {
      useDistressStore.getState().setActive({ ...payload, detectedAt: Date.now() });
    };

    const onFall = (payload: FallPayload): void => {
      if (useDistressStore.getState().active !== null) {return;}
      useDistressStore.getState().setActiveFall(payload);
    };

    const onCrash = (payload: FallPayload): void => {
      if (useDistressStore.getState().active !== null) {return;}
      if (useDistressStore.getState().activeFall !== null) {return;}
      useDistressStore.getState().setActiveCrash(payload);
    };

    EventBus.on('distress:detected', onDistress);
    EventBus.on('fall:detected', onFall);
    EventBus.on('crash:detected', onCrash);

    return () => {
      EventBus.off('distress:detected', onDistress);
      EventBus.off('fall:detected', onFall);
      EventBus.off('crash:detected', onCrash);
    };
  }, []);

  const showDistress = active !== null && active !== undefined;
  const showFall     = !showDistress && activeFall !== null && activeFall !== undefined;
  const showCrash    = !showDistress && !showFall && activeCrash !== null && activeCrash !== undefined;

  return (
    <>
      <Modal visible={showDistress} animationType="slide" statusBarTranslucent
        onRequestClose={() => {}} accessibilityViewIsModal>
        <View style={styles.fill}><DistressAlertScreen /></View>
      </Modal>

      <Modal visible={showFall} animationType="slide" statusBarTranslucent
        onRequestClose={() => {}} accessibilityViewIsModal>
        <View style={styles.fill}><FallResponseScreen /></View>
      </Modal>

      <Modal visible={showCrash} animationType="slide" statusBarTranslucent
        onRequestClose={() => {}} accessibilityViewIsModal>
        <View style={styles.fill}><CrashResponseScreen /></View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
