import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { EventBus } from '@core/events/EventBus';
import { PhonebookPickerUseCase } from '@features/guardian/application/PhonebookPickerUseCase';
import { colors, spacing, typography, radius } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'FirstGuardian'>;

type Mode = 'menu' | 'phone' | 'loading';

const phonebookPicker = new PhonebookPickerUseCase();

function finishOnboarding(): void {
  PreferencesStore.setBoolean(PREF_KEYS.ONBOARDING_COMPLETE, true);
  EventBus.emit('onboarding:complete', {});
}

export default function FirstGuardianScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // ── Contact picker ────────────────────────────────────────────────────────
  const pickFromContacts = async (): Promise<void> => {
    setMode('loading');
    try {
      const result = await phonebookPicker.execute();
      if (!result) { setMode('menu'); return; }

      if (result.rawPhoneNumbers.length === 1 && result.resolvedPhoneNumber) {
        navigation.navigate('QRPair', {
          mode: 'scan',
          prefillName: result.displayName,
          prefillPhone: result.resolvedPhoneNumber,
        });
      } else if (result.rawPhoneNumbers.length > 1) {
        Alert.alert(
          result.displayName,
          'Which number should receive emergency alerts?',
          result.rawPhoneNumbers.map((n) => ({
            text: `${n.label}: ${n.number}`,
            onPress: () => {
              try {
                const formatted = phonebookPicker.formatE164(n.number);
                navigation.navigate('QRPair', {
                  mode: 'scan',
                  prefillName: result.displayName,
                  prefillPhone: formatted,
                });
              } catch {
                Alert.alert('Invalid number', `${n.number} is not a valid mobile number.`);
                setMode('menu');
              }
            },
          })).concat([{ text: 'Cancel', onPress: () => setMode('menu') }]),
        );
      } else {
        Alert.alert('No number found', 'This contact has no phone number saved.');
        setMode('menu');
      }
    } catch {
      Alert.alert('Permission needed', 'Please allow Contacts access in Settings to pick a contact.');
      setMode('menu');
    }
  };

  // ── Phone number form submit ──────────────────────────────────────────────
  const submitPhone = (): void => {
    const trimPhone = phone.trim();
    const trimName = name.trim();
    if (!trimPhone) { Alert.alert('Phone number required', 'Please enter a phone number.'); return; }
    navigation.navigate('QRPair', {
      mode: 'scan',
      prefillName: trimName || undefined,
      prefillPhone: trimPhone,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Opening contacts…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.emoji}>🤝</Text>
          <Text style={styles.title} accessibilityRole="header">Add your first guardian</Text>
          <Text style={styles.subtitle}>
            A guardian is someone you trust — they receive an alert only when you trigger an SOS.
          </Text>
        </View>

        {mode === 'menu' && (
          <View style={styles.methods}>
            <AccessibleButton
              onPress={() => { void pickFromContacts(); }}
              accessibilityLabel="Choose from contacts"
              accessibilityHint="Select a person from your phone contacts"
              variant="primary"
              minHeight={56}
              style={styles.method}
            >
              👥  Choose from contacts
            </AccessibleButton>

            <AccessibleButton
              onPress={() => setMode('phone')}
              accessibilityLabel="Enter a phone number"
              accessibilityHint="Type a phone number manually"
              variant="primary"
              minHeight={56}
              style={styles.method}
            >
              ✏️  Enter a phone number
            </AccessibleButton>

            <AccessibleButton
              onPress={() => navigation.navigate('QRPair', { mode: 'scan' })}
              accessibilityLabel="Scan QR code"
              accessibilityHint="Scan your guardian's QR code from the GuardianCircle app"
              variant="ghost"
              minHeight={48}
              style={styles.method}
            >
              📷  Scan QR code
            </AccessibleButton>
          </View>
        )}

        {mode === 'phone' && (
          <View style={styles.phoneForm}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Their name (optional)"
              placeholderTextColor={colors.light.onSurfaceVariant}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Guardian's name"
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.light.onSurfaceVariant}
              keyboardType="phone-pad"
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={submitPhone}
              accessibilityLabel="Guardian's phone number"
              autoFocus
            />
            <View style={styles.formActions}>
              <AccessibleButton
                onPress={submitPhone}
                accessibilityLabel="Continue with this number"
                variant="primary"
                minHeight={52}
                style={{ flex: 1 }}
              >
                Continue
              </AccessibleButton>
              <AccessibleButton
                onPress={() => { setMode('menu'); setName(''); setPhone(''); }}
                accessibilityLabel="Back to options"
                variant="ghost"
                minHeight={52}
                style={{ flex: 1 }}
              >
                Back
              </AccessibleButton>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <AccessibleButton
            onPress={finishOnboarding}
            accessibilityLabel="Skip — add a guardian later"
            accessibilityHint="You can add guardians from the Guardians tab after setup"
            variant="ghost"
            minHeight={48}
            style={styles.skip}
          >
            I'll add a guardian later
          </AccessibleButton>
          <Text style={styles.skipNote}>
            Without a guardian, SOS alerts are saved locally only.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.light.onSurfaceVariant },
  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  emoji: { fontSize: 48 },
  title: { ...typography.headlineLarge, color: colors.light.onBackground, textAlign: 'center' },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  methods: { gap: spacing.sm },
  method: { width: '100%' },
  phoneForm: { gap: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.bodyLarge,
    color: colors.light.onBackground,
    backgroundColor: colors.light.surface,
  },
  formActions: { flexDirection: 'row', gap: spacing.sm },
  footer: { gap: spacing.xs, alignItems: 'center', paddingBottom: spacing.lg },
  skip: { width: '100%' },
  skipNote: { ...typography.bodySmall, color: colors.light.onSurfaceVariant, textAlign: 'center' },
});
