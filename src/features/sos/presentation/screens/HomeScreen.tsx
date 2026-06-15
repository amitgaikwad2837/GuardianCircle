import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  AccessibilityInfo,
  StatusBar,
  Alert,
  Linking,
  NativeEventEmitter,
  NativeModules,
  type NativeModule,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// ringContainer = touchTargets.emergency(120) + 80 = 200; arc sits 8px inside edge
const HOLD_RING_RADIUS = 92;
const HOLD_RING_CIRC   = 2 * Math.PI * HOLD_RING_RADIUS;

import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParams } from '@core/navigation/NavigationTypes';
import { useTheme } from '@core/theme/ThemeProvider';
import { useSOSStore } from '../store/sosStore';
import { useSOSActions } from '../hooks/useSOSActions';
import { EventBus } from '@core/events/EventBus';
import { Logger } from '@core/logger/Logger';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { SetupChecklist } from '@shared/components/SetupChecklist';

type HomeNav = BottomTabNavigationProp<MainTabParams, 'Home'>;

interface GuardianAck {
  guardianId: string;
  guardianName: string;
  etaMinutes?: number;
}

const TAG = 'HomeScreen';
const HOLD_DURATION_MS   = 3000;
const CANCEL_WINDOW_SECS = 15;
const VIBRATE_HOLD_START = [0, 200, 100, 200];
const VIBRATE_SOS_FIRED  = [0, 500, 200, 500, 200, 500];

export default function HomeScreen(): React.JSX.Element {
  const theme      = useTheme();
  const store      = useSOSStore();
  const actions    = useSOSActions();
  const navigation = useNavigation<HomeNav>();

  // Hold-to-trigger animation state
  const holdProgress   = useRef(new Animated.Value(0)).current;
  const holdAnimation  = useRef<Animated.CompositeAnimation | null>(null);
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Haptic pulse interval during hold — fires at 750ms, 1500ms, 2250ms
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancellation countdown ticker
  const cancelTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Degraded capability warnings (location unavailable, BLE unavailable, etc.)
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(null);

  // Animated strokeDashoffset: full circumference (invisible) → 0 (full arc)
  const holdArcOffset = useRef(
    holdProgress.interpolate({
      inputRange:  [0, 1],
      outputRange: [HOLD_RING_CIRC, 0],
    }),
  ).current;

  // Guardian acknowledgements received during an active incident
  const [acknowledgements, setAcknowledgements] = React.useState<GuardianAck[]>([]);

  // BLE mesh status
  const [bleBeaconing, setBleBeaconing] = useState(false);
  const [bleRelaying, setBleRelaying]   = useState(false);

  // Clear all timers and listeners on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearCancelTicker();
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for degraded capabilities (location denied, BLE unavailable, etc.)
  useEffect(() => {
    const off = EventBus.on('system:capability_degraded', ({ capability, reason }) => {
      const labels: Record<string, string> = {
        location: 'Location unavailable — SOS will not include coordinates',
        ble:      'Offline BLE relay unavailable',
        volume_sos: 'Volume button SOS unavailable',
        storage:  'Storage warning',
      };
      setCapabilityWarning(labels[capability] ?? reason);
      // Auto-dismiss after 8 s
      setTimeout(() => setCapabilityWarning(null), 8_000);
    });
    return () => off();
  }, []);

  // Volume-button hardware SOS trigger (Vol-Down + Vol-Up held 3 s)
  useEffect(() => {
    if (!NativeModules.BackgroundTaskModule) {return;}
    const emitter = new NativeEventEmitter(NativeModules.BackgroundTaskModule as NativeModule);
    const sub = emitter.addListener('GC_VOLUME_SOS_TRIGGER', () => {
      Logger.info(TAG, 'Volume SOS trigger received');
      if (store.status === 'idle' || store.status === 'cancelled' || store.status === 'resolved') {
        store.startCountdown(false);
        startCancelCountdown();
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status]);

  // Listen for guardian acknowledgements while an incident is active
  useEffect(() => {
    if (store.status !== 'active' && store.status !== 'escalated') {
      setAcknowledgements([]);
      return;
    }
    const off = EventBus.on('sos:acknowledged', ({ guardianId, guardianName, etaMinutes }) => {
      setAcknowledgements((prev) =>
        prev.some((a) => a.guardianId === guardianId)
          ? prev
          : [...prev, { guardianId, guardianName, etaMinutes }],
      );
      Vibration.vibrate(200);
    });
    return () => off();
  }, [store.status]);

  // If SOS becomes active via an external event (e.g. distress detection),
  // clear the countdown ticker and update UI accordingly
  useEffect(() => {
    if (store.status === 'active' || store.status === 'cancelled' || store.status === 'resolved') {
      clearCancelTicker();
    }
  }, [store.status]);

  // BLE mesh status events
  useEffect(() => {
    const offStart   = EventBus.on('ble:beacon_started', () => setBleBeaconing(true));
    const offStop    = EventBus.on('ble:beacon_stopped', () => { setBleBeaconing(false); setBleRelaying(false); });
    const offRelay   = EventBus.on('ble:relaying', () => setBleRelaying(true));
    return () => { offStart(); offStop(); offRelay(); };
  }, []);

  const clearHoldTimer = useCallback((): void => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    holdAnimation.current?.stop();
    holdProgress.setValue(0);
  }, [holdProgress]);

  const clearCancelTicker = (): void => {
    if (cancelTickRef.current) {
      clearInterval(cancelTickRef.current);
      cancelTickRef.current = null;
    }
  };

  const startCancelCountdown = useCallback((): void => {
    store.setCountdown(CANCEL_WINDOW_SECS);
    clearCancelTicker();

    cancelTickRef.current = setInterval(() => {
      useSOSStore.setState((s) => {
        const next = s.countdownSeconds - 1;
        if (next <= 0) {
          clearCancelTicker();
          // Trigger SOS after countdown expires
          void fireSOS(s.isSilentMode);
          return { countdownSeconds: 0 };
        }
        return { countdownSeconds: next };
      });
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fireSOS = useCallback(async (isSilent: boolean): Promise<void> => {
    try {
      const event = await actions.triggerUseCase.execute({
        method: 'long_press',
        isSilent,
      });
      store.setActive(event.id);
      Vibration.vibrate(VIBRATE_SOS_FIRED);
      AccessibilityInfo.announceForAccessibility('Emergency alert sent to all guardians.');
      Logger.info(TAG, 'SOS fired', { incidentId: event.id });

      if ((event as typeof event & { allDispatchFailed?: boolean }).allDispatchFailed) {
        Alert.alert(
          'Guardians unreachable',
          'Your SOS was recorded but we could not reach any guardian right now. Call emergency services.',
          [
            { text: 'Call 112', onPress: () => void Linking.openURL('tel:112'), style: 'destructive' },
            { text: 'Dismiss', style: 'cancel' },
          ],
        );
      }
    } catch (err) {
      store.reset();
      Logger.error(TAG, 'fireSOS failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert(
        'Alert failed',
        'Could not send emergency alert. Please call emergency services directly.',
        [
          { text: 'Call 112', onPress: () => void Linking.openURL('tel:112'), style: 'destructive' },
          { text: 'Dismiss', style: 'cancel' },
        ],
      );
    }
  }, [actions, store]);

  const onHoldStart = useCallback((isSilent: boolean): void => {
    if (store.status !== 'idle' && store.status !== 'cancelled' && store.status !== 'resolved') {return;}

    store.reset();
    Vibration.vibrate(VIBRATE_HOLD_START);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    holdProgress.setValue(0);
    holdAnimation.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    });
    holdAnimation.current.start(({ finished }) => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      if (finished) {
        ReactNativeHapticFeedback.trigger('notificationError');
        store.startCountdown(isSilent);
        startCancelCountdown();
      }
    });

    // Pulse haptic feedback at 750ms intervals so the user feels progress
    hapticIntervalRef.current = setInterval(() => {
      ReactNativeHapticFeedback.trigger('impactMedium');
    }, 750);
  }, [holdProgress, store, startCancelCountdown]);

  const onHoldEnd = useCallback((): void => {
    // Only cancel the hold animation — the SOS is only cancelled if user
    // explicitly taps Cancel during the countdown, not by releasing early
    if (store.status === 'idle' || store.status === 'cancelled' || store.status === 'resolved') {
      clearHoldTimer();
    }
  }, [store.status, clearHoldTimer]);

  const handleCancelSOS = useCallback((): void => {
    clearCancelTicker();

    if (store.status === 'countdown') {
      // First cancelled countdown = user did a test SOS
      PreferencesStore.setBoolean(PREF_KEYS.CHECKLIST_TEST_SOS_DONE, true);
      store.cancel();
      clearHoldTimer();
      Vibration.cancel();
      AccessibilityInfo.announceForAccessibility('Emergency alert cancelled.');
    } else if (store.status === 'active' && store.activeIncidentId) {
      void actions.cancelUseCase.execute(store.activeIncidentId, 'user').then(() => {
        store.cancel();
        AccessibilityInfo.announceForAccessibility('Emergency alert cancelled.');
      });
    }
  }, [store, actions, clearHoldTimer]);

  const styles = makeStyles(theme);

  const ringScale = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const ringOpacity = holdProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.3, 0.6],
  });

  const isActive    = store.status === 'active' || store.status === 'escalated';
  const isCountdown = store.status === 'countdown';
  const isIdle      = store.status === 'idle' || store.status === 'cancelled' || store.status === 'resolved';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          GuardianCircle
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isActive ? theme.colors.sosRedLight : '#E8F5E9' },
        ]}>
          <Text style={[
            styles.statusText,
            { color: isActive ? theme.colors.sosRed : theme.colors.safe },
          ]}>
            {isActive ? 'SOS ACTIVE' : isCountdown ? 'SENDING…' : 'Protected'}
          </Text>
        </View>
      </View>

      {/* ─── SOS button area ─────────────────────────────────────────── */}
      <View style={styles.sosArea}>

        {/* Animated pulse ring + SVG hold-progress arc */}
        <View style={styles.ringContainer}>
          <Animated.View style={[
            styles.pulseRing,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
              backgroundColor: theme.colors.sosRedLight,
            },
          ]} />

          {/* Arc that sweeps from 0→360° over the 3s hold, giving clear visual progress */}
          <Svg
            width={200}
            height={200}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Circle
              cx={100}
              cy={100}
              r={HOLD_RING_RADIUS}
              stroke={theme.colors.sosRedLight}
              strokeWidth={5}
              fill="none"
            />
            <AnimatedCircle
              cx={100}
              cy={100}
              r={HOLD_RING_RADIUS}
              stroke={theme.colors.sosRed}
              strokeWidth={5}
              fill="none"
              strokeDasharray={[HOLD_RING_CIRC, HOLD_RING_CIRC]}
              strokeDashoffset={holdArcOffset}
              strokeLinecap="round"
              rotation={-90}
              origin="100, 100"
            />
          </Svg>

          <TouchableOpacity
            style={[styles.sosButton, isActive && styles.sosButtonActive]}
            onPressIn={() => onHoldStart(false)}
            onPressOut={onHoldEnd}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="SOS Emergency Button"
            accessibilityHint={
              isActive
                ? 'SOS is active. Tap Cancel SOS below to cancel.'
                : 'Hold for 3 seconds to send an emergency alert to all your guardians'
            }
          >
            <Text style={styles.sosLabel}>SOS</Text>
            {isIdle && <Text style={styles.sosHint}>Hold 3s</Text>}
            {isCountdown && (
              <Text style={styles.sosHint}>{store.countdownSeconds}s</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Status description */}
        <Text style={styles.sosDescription}>
          {isActive
            ? 'Emergency alert sent. Guardians notified.'
            : isCountdown
            ? `Sending alert in ${store.countdownSeconds} seconds…`
            : 'Hold the button for 3 seconds to alert your guardians'}
        </Text>

        {/* Non-blocking capability warning (auto-dismisses after 8s) */}
        {capabilityWarning !== null && capabilityWarning !== undefined && (
          <View
            style={styles.capabilityWarning}
            accessibilityLiveRegion="polite"
            accessibilityLabel={capabilityWarning}
          >
            <Text style={styles.capabilityWarningText}>{capabilityWarning}</Text>
          </View>
        )}

        {/* Guardian acknowledgement feedback */}
        {isActive && acknowledgements.length > 0 && (
          <View style={styles.ackBanner} accessibilityLiveRegion="polite">
            {acknowledgements.map((ack) => {
              const etaLabel = ack.etaMinutes !== null && ack.etaMinutes !== undefined ? ` — ETA ${ack.etaMinutes} min` : ' — on the way';
              return (
                <Text
                  key={ack.guardianId}
                  style={styles.ackText}
                  accessibilityLabel={`${ack.guardianName} acknowledged${etaLabel}`}
                >
                  ✓ {ack.guardianName}{etaLabel}
                </Text>
              );
            })}
          </View>
        )}

        {/* Cancel button — shown during countdown and when active */}
        {(isCountdown || isActive) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSOS}
            accessibilityRole="button"
            accessibilityLabel={isActive ? 'Cancel SOS' : 'Cancel sending SOS'}
          >
            <Text style={styles.cancelButtonText}>
              {isActive ? '✕  Cancel SOS' : '✕  Cancel'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── BLE mesh status ─────────────────────────────────────────── */}
      {(bleBeaconing || bleRelaying) && (
        <View style={[styles.bleBanner, bleRelaying && styles.bleBannerRelay]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={bleRelaying ? 'Relaying nearby SOS via Bluetooth' : 'Broadcasting offline SOS via Bluetooth'}>
          <Text style={styles.bleBannerText}>
            {bleRelaying
              ? '📡 Relaying nearby SOS via Bluetooth'
              : '📡 Broadcasting offline SOS via Bluetooth'}
          </Text>
        </View>
      )}

      {/* ─── Setup checklist (hidden once all steps complete) ───────── */}
      {isIdle && <SetupChecklist />}

      {/* ─── Quick actions ───────────────────────────────────────────── */}
      {isIdle && (
        <View style={styles.quickActions}>
          <QuickActionButton
            label="Check In"
            symbol="✓"
            color={theme.colors.safe}
            onPress={() => navigation.navigate('Journey', { screen: 'CheckIn' } as never)}
            accessibilityHint="Send a check-in to let guardians know you are safe"
          />
          <QuickActionButton
            label="Journey"
            symbol="→"
            color={theme.colors.info}
            onPress={() => navigation.navigate('Journey')}
            accessibilityHint="Start a monitored journey to your destination"
          />
          <QuickActionButton
            label="Silent SOS"
            symbol="!"
            color={theme.colors.warning}
            onPress={() => onHoldStart(true)}
            accessibilityHint="Hold 3 seconds to send a silent emergency alert with no sound"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

interface QuickActionButtonProps {
  label: string;
  symbol: string;
  color: string;
  onPress: () => void;
  accessibilityHint: string;
}

function QuickActionButton({
  label, symbol, color, onPress, accessibilityHint,
}: QuickActionButtonProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[qaStyles.button, { borderColor: color }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[qaStyles.symbol, { color }]}>{symbol}</Text>
      <Text style={[qaStyles.label, { color: theme.colors.onSurface }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.full,
    },
    statusText: {
      ...theme.typography.labelMedium,
      fontWeight: '700',
    },
    sosArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    ringContainer: {
      width: theme.touchTargets.emergency + 80,
      height: theme.touchTargets.emergency + 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    pulseRing: {
      position: 'absolute',
      width: theme.touchTargets.emergency + 80,
      height: theme.touchTargets.emergency + 80,
      borderRadius: (theme.touchTargets.emergency + 80) / 2,
    },
    sosButton: {
      width: theme.touchTargets.emergency,
      height: theme.touchTargets.emergency,
      borderRadius: theme.touchTargets.emergency / 2,
      backgroundColor: theme.colors.sosRed,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: theme.colors.sosRed,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    sosButtonActive: {
      backgroundColor: theme.colors.sosRedDark,
    },
    sosLabel: {
      ...theme.typography.displayMedium,
      color: '#FFFFFF',
      fontWeight: '800',
    },
    sosHint: {
      ...theme.typography.labelMedium,
      color: 'rgba(255,255,255,0.85)',
    },
    sosDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    cancelButton: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      borderColor: theme.colors.sosRed,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.sosRed,
    },
    capabilityWarning: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.warning + '18',
      borderWidth: 1,
      borderColor: theme.colors.warning,
      alignSelf: 'stretch',
    },
    capabilityWarningText: {
      ...theme.typography.bodySmall,
      color: theme.colors.warning,
      textAlign: 'center',
    },
    ackBanner: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.safe + '22',
      borderWidth: 1,
      borderColor: theme.colors.safe,
    },
    ackText: {
      ...theme.typography.labelMedium,
      color: theme.colors.safe,
      textAlign: 'center',
    },
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    bleBanner: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary + '18',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      alignItems: 'center',
    },
    bleBannerRelay: {
      backgroundColor: theme.colors.sosRed + '18',
      borderColor: theme.colors.sosRed,
    },
    bleBannerText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
  });
}

const qaStyles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 72,
  },
  symbol: { fontSize: 20, marginBottom: 4, fontWeight: '700' },
  label:  { fontSize: 12, fontWeight: '600' },
});
