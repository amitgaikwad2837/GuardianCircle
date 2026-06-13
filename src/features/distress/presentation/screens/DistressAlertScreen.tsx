import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@core/theme/ThemeProvider';
import { EventBus } from '@core/events/EventBus';
import { useDistressStore } from '../store/distressStore';
import { TriggerSOSUseCase } from '@features/sos/application/TriggerSOSUseCase';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { ISOSRepository } from '@features/sos/domain/interfaces/ISOSRepository';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import type { IAlertDispatcher } from '@features/sos/domain/interfaces/IAlertDispatcher';

const AUTO_DISMISS_SECONDS = 30;

export default function DistressAlertScreen(): React.JSX.Element {
  const theme   = useTheme();
  const styles  = makeStyles(theme);
  const active  = useDistressStore((s) => s.active);
  const { dismiss } = useDistressStore();

  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Vibration.vibrate([0, 300, 200, 300]);

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    // Countdown to auto-dismiss
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          dismiss();
          EventBus.emit('distress:dismissed', { eventId: active?.eventId ?? '' });
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      pulse.stop();
      clearInterval(timerRef.current!);
      Vibration.cancel();
    };
  }, [active, dismiss, pulseAnim]);

  const handleImOk = (): void => {
    clearInterval(timerRef.current!);
    Vibration.cancel();
    EventBus.emit('distress:dismissed', { eventId: active?.eventId ?? '' });
    dismiss();
  };

  const handleTriggerSOS = async (): Promise<void> => {
    clearInterval(timerRef.current!);
    Vibration.cancel();
    EventBus.emit('distress:confirmed', { eventId: active?.eventId ?? '' });
    dismiss();

    const uc = new TriggerSOSUseCase(
      Container.resolve<ISOSRepository>(DI_TOKENS.ISOSRepository),
      Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository),
      Container.resolve<IAlertDispatcher>(DI_TOKENS.IAlertDispatcher),
    );
    await uc.execute({ method: 'shake', isSilent: false, isDuress: false });
  };

  if (!active) {return <View style={styles.container} />;}

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.body}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: theme.colors.danger }]} />

        <Text style={[styles.heading, { color: theme.colors.danger }]}>
          Distress Detected
        </Text>
        <Text style={[styles.subheading, { color: theme.colors.onSurfaceVariant }]}>
          Unusual motion pattern detected. Are you OK?
        </Text>

        <Text style={[styles.confidence, { color: theme.colors.onSurface }]}>
          Confidence: {Math.round(active.confidence * 100)}%
        </Text>

        <Text style={[styles.countdown, { color: theme.colors.onSurfaceVariant }]}>
          Auto-dismissing in {countdown}s
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.okBtn, { backgroundColor: '#4CAF50' }]}
          onPress={handleImOk}
          accessibilityRole="button"
          accessibilityLabel="I am okay"
        >
          <Text style={styles.okBtnText}>I'm OK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sosBtn, { backgroundColor: theme.colors.danger }]}
          onPress={() => { void handleTriggerSOS(); }}
          accessibilityRole="button"
          accessibilityLabel="Trigger emergency SOS"
        >
          <Text style={styles.sosBtnText}>Trigger SOS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
    pulseRing: {
      width: 140, height: 140, borderRadius: 70,
      borderWidth: 3, marginBottom: theme.spacing.xl,
    },
    heading: { fontSize: 26, fontWeight: '800', marginBottom: theme.spacing.sm },
    subheading: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.lg },
    confidence: { fontSize: 14, marginBottom: theme.spacing.sm },
    countdown: { fontSize: 13 },
    actions: { padding: theme.spacing.lg, gap: 12 },
    okBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
    okBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    sosBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
    sosBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
}
