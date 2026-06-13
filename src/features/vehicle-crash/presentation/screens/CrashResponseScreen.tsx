import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@core/theme/ThemeProvider';
import { EventBus } from '@core/events/EventBus';
import { useDistressStore } from '@features/distress/presentation/store/distressStore';
import { TriggerSOSUseCase } from '@features/sos/application/TriggerSOSUseCase';
import { SOSFallback } from '@core/sos/SOSFallback';
import { Container, DI_TOKENS } from '@core/di/Container';
import { Logger } from '@core/logger/Logger';
import type { ISOSRepository } from '@features/sos/domain/interfaces/ISOSRepository';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import type { IAlertDispatcher } from '@features/sos/domain/interfaces/IAlertDispatcher';
import { CRASH_RESPONSE_TIMEOUT_SECONDS } from '../../domain/entities/CrashEvent';

const TAG = 'CrashResponseScreen';

export default function CrashResponseScreen(): React.JSX.Element {
  const theme   = useTheme();
  const styles  = makeStyles(theme);
  const activeCrash  = useDistressStore((s) => s.activeCrash);
  const dismissCrash = useDistressStore((s) => (): void => { s.dismissCrash(); });

  const [countdown, setCountdown] = useState(CRASH_RESPONSE_TIMEOUT_SECONDS);
  const barAnim       = useRef(new Animated.Value(1)).current;
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTriggering  = useRef(false);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Possible vehicle crash detected. Tap I'm OK within ${CRASH_RESPONSE_TIMEOUT_SECONDS} seconds or emergency SOS will trigger automatically.`,
    );
    Vibration.vibrate([0, 800, 300, 800, 300, 800]);

    Animated.timing(barAnim, {
      toValue: 0,
      duration: CRASH_RESPONSE_TIMEOUT_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        if (next === 20 || next === 10 || next === 5) {
          AccessibilityInfo.announceForAccessibility(
            `${next} seconds until automatic SOS.`,
          );
        }
        if (next <= 0) {
          clearInterval(timerRef.current!);
          void autoTriggerSOS();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current!);
      Vibration.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoTriggerSOS = async (): Promise<void> => {
    if (isTriggering.current) {return;}
    isTriggering.current = true;
    clearInterval(timerRef.current!);
    Vibration.cancel();
    dismissCrash();
    try {
      const uc = new TriggerSOSUseCase(
        Container.resolve<ISOSRepository>(DI_TOKENS.ISOSRepository),
        Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository),
        Container.resolve<IAlertDispatcher>(DI_TOKENS.IAlertDispatcher),
      );
      await uc.execute({ method: 'shake', isSilent: false, isDuress: false });
    } catch (err) {
      Logger.error(TAG, 'TriggerSOSUseCase unavailable — using SOSFallback', {
        message: err instanceof Error ? err.message.slice(0, 80) : String(err),
      });
      await SOSFallback.send();
    }
  };

  const handleImOk = (): void => {
    clearInterval(timerRef.current!);
    Vibration.cancel();
    barAnim.stopAnimation();
    EventBus.emit('crash:dismissed', { eventId: activeCrash?.eventId ?? '' });
    dismissCrash();
  };

  if (!activeCrash) {return <View style={styles.container} />;}

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.body}>
        <Text style={[styles.icon, { color: theme.colors.danger }]} aria-hidden>🚗</Text>
        <Text style={[styles.heading, { color: theme.colors.danger }]}>
          Possible Crash Detected
        </Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
          Are you OK? Emergency SOS triggers in
        </Text>
        <Text
          style={[styles.countdown, { color: theme.colors.danger }]}
          accessibilityLiveRegion="assertive"
          accessibilityLabel={`${countdown} seconds remaining`}
        >
          {countdown}s
        </Text>
        <Text style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
          Vehicle crash detection is a safety assistance feature. It may not detect all
          crashes or alert in all situations.
        </Text>

        <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: theme.colors.danger,
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.okBtn, { backgroundColor: '#4CAF50' }]}
          onPress={handleImOk}
          accessibilityRole="button"
          accessibilityLabel="I am okay, cancel SOS"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.okBtnText}>I'm OK — Cancel SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sosBtn, { backgroundColor: theme.colors.danger }]}
          onPress={() => { void autoTriggerSOS(); }}
          accessibilityRole="button"
          accessibilityLabel="Trigger emergency SOS now"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.sosBtnText}>Trigger SOS Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
    icon: { fontSize: 64, marginBottom: theme.spacing.md },
    heading: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: theme.spacing.sm },
    sub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
    countdown: { fontSize: 48, fontWeight: '800', marginBottom: theme.spacing.md },
    disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: theme.spacing.xl, fontStyle: 'italic' },
    barTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%' },
    actions: { padding: theme.spacing.lg, gap: 12 },
    okBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center', minHeight: 52 },
    okBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    sosBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center', minHeight: 52 },
    sosBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
}
