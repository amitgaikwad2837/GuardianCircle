import React, { useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { useTheme } from '@core/theme/ThemeProvider';
import { useSOSStore } from '../store/sosStore';
import { useSOSActions } from '../hooks/useSOSActions';
import { Logger } from '@core/logger/Logger';

const TAG = 'HomeScreen';
const HOLD_DURATION_MS   = 3000;
const CANCEL_WINDOW_SECS = 10;
const VIBRATE_HOLD_START = [0, 200, 100, 200];
const VIBRATE_SOS_FIRED  = [0, 500, 200, 500, 200, 500];

export default function HomeScreen(): React.JSX.Element {
  const theme   = useTheme();
  const store   = useSOSStore();
  const actions = useSOSActions();

  // Hold-to-trigger animation state
  const holdProgress   = useRef(new Animated.Value(0)).current;
  const holdAnimation  = useRef<Animated.CompositeAnimation | null>(null);
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancellation countdown ticker
  const cancelTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearCancelTicker();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If SOS becomes active via an external event (e.g. distress detection),
  // clear the countdown ticker and update UI accordingly
  useEffect(() => {
    if (store.status === 'active' || store.status === 'cancelled' || store.status === 'resolved') {
      clearCancelTicker();
    }
  }, [store.status]);

  const clearHoldTimer = (): void => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdAnimation.current?.stop();
    holdProgress.setValue(0);
  };

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
    } catch (err) {
      store.reset();
      Logger.error(TAG, 'fireSOS failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert(
        'Alert Failed',
        'Could not send emergency alert. Please call emergency services directly.',
      );
    }
  }, [actions, store]);

  const onHoldStart = useCallback((isSilent: boolean): void => {
    if (store.status !== 'idle' && store.status !== 'cancelled' && store.status !== 'resolved') return;

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
      if (finished) {
        ReactNativeHapticFeedback.trigger('notificationError');
        store.startCountdown(isSilent);
        startCancelCountdown();
      }
    });
  }, [holdProgress, store, startCancelCountdown]);

  const onHoldEnd = useCallback((): void => {
    // Only cancel the hold animation — the SOS is only cancelled if user
    // explicitly taps Cancel during the countdown, not by releasing early
    if (store.status === 'idle' || store.status === 'cancelled' || store.status === 'resolved') {
      clearHoldTimer();
    }
  }, [store.status]);

  const handleCancelSOS = useCallback((): void => {
    clearCancelTicker();

    if (store.status === 'countdown') {
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
  }, [store, actions]);

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

        {/* Animated pulse ring */}
        <View style={styles.ringContainer}>
          <Animated.View style={[
            styles.pulseRing,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
              backgroundColor: theme.colors.sosRedLight,
            },
          ]} />

          <TouchableOpacity
            style={[styles.sosButton, isActive && styles.sosButtonActive]}
            onPressIn={() => onHoldStart(false)}
            onPressOut={onHoldEnd}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="SOS emergency button"
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

      {/* ─── Quick actions ───────────────────────────────────────────── */}
      {isIdle && (
        <View style={styles.quickActions}>
          <QuickActionButton
            label="Check In"
            symbol="✓"
            color={theme.colors.safe}
            onPress={() => { /* Phase 3 */ }}
            accessibilityHint="Send a check-in to let guardians know you are safe"
          />
          <QuickActionButton
            label="Journey"
            symbol="→"
            color={theme.colors.info}
            onPress={() => { /* Phase 3 */ }}
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
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
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
