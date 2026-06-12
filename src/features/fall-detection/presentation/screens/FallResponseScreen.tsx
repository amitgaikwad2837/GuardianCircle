import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
  AccessibilityInfo, Platform,
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
import { FALL_RESPONSE_TIMEOUT_SECONDS } from '../../domain/entities/FallEvent';

const TAG = 'FallResponseScreen';

export default function FallResponseScreen(): React.JSX.Element {
  const theme   = useTheme();
  const styles  = makeStyles(theme);
  const { activeFall, dismissFall } = useDistressStore();

  const [countdown, setCountdown] = useState(FALL_RESPONSE_TIMEOUT_SECONDS);
  const barAnim       = useRef(new Animated.Value(1)).current;
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTriggering  = useRef(false);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Possible fall detected. Tap I'm OK within ${FALL_RESPONSE_TIMEOUT_SECONDS} seconds or SOS will trigger automatically.`,
    );
    Vibration.vibrate([0, 500, 300, 500, 300, 500]);

    Animated.timing(barAnim, {
      toValue: 0,
      duration: FALL_RESPONSE_TIMEOUT_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        // Announce at 20s, 10s, 5s so TalkBack users track the countdown
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
    if (isTriggering.current) return;
    isTriggering.current = true;
    clearInterval(timerRef.current!);
    Vibration.cancel();
    EventBus.emit('fall:confirmed', { eventId: activeFall?.eventId ?? '' });
    dismissFall();
    try {
      const uc = new TriggerSOSUseCase(
        Container.resolve<ISOSRepository>(DI_TOKENS.ISOSRepository),
        Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository),
        Container.resolve<IAlertDispatcher>(DI_TOKENS.IAlertDispatcher),
      );
      await uc.execute({ method: 'shake', isSilent: false, isDuress: false });
    } catch (err) {
      // DI container unavailable (bootstrap failure) — use last-resort SMS path
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
    EventBus.emit('fall:dismissed', { eventId: activeFall?.eventId ?? '' });
    dismissFall();
  };

  if (!activeFall) return <View style={styles.container} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.body}>
        <Text style={[styles.icon, { color: theme.colors.danger }]}>⚠</Text>
        <Text style={[styles.heading, { color: theme.colors.danger }]}>
          Possible Fall Detected
        </Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
          Are you OK? SOS will trigger automatically in
        </Text>
        {/* accessibilityLiveRegion ensures TalkBack announces countdown changes */}
        <Text
          style={[styles.countdown, { color: theme.colors.danger }]}
          accessibilityLiveRegion="assertive"
          accessibilityLabel={`${countdown} seconds remaining`}
        >
          {countdown}s
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

      <View style={[styles.actions, { paddingBottom: 32 }]}>
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
          onPress={autoTriggerSOS}
          accessibilityRole="button"
          accessibilityLabel="Trigger SOS now"
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
    icon: { fontSize: 72, marginBottom: theme.spacing.md },
    heading: { fontSize: 24, fontWeight: '800', marginBottom: theme.spacing.sm, textAlign: 'center' },
    sub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
    countdown: { fontSize: 48, fontWeight: '800', marginBottom: theme.spacing.xl },
    barTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%' },
    actions: { padding: theme.spacing.lg, gap: 12 },
    okBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center', minHeight: 52 },
    okBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    sosBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center', minHeight: 52 },
    sosBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
}
