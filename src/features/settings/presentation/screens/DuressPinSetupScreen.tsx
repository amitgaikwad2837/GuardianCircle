import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { DuressPinService } from '@features/security/application/DuressPinService';
import { Logger }           from '@core/logger/Logger';

const TAG = 'DuressPinSetupScreen';

type Step = 'intro' | 'real_pin' | 'confirm_real' | 'duress_pin' | 'confirm_duress' | 'done';

/**
 * DuressPinSetupScreen — multi-step flow for configuring the duress PIN.
 *
 * Steps:
 *   1. Intro — explains what a duress PIN is
 *   2. Enter real PIN (4–8 digits)
 *   3. Confirm real PIN
 *   4. Enter duress PIN (must differ from real)
 *   5. Confirm duress PIN
 *   6. Done — confirmation screen
 *
 * The duress PIN is stored as an Argon2id hash alongside the real PIN hash.
 * Raw PINs are never persisted.
 */
export default function DuressPinSetupScreen(): React.JSX.Element {
  const theme  = useTheme();
  const nav    = useNavigation();
  const styles = makeStyles(theme);

  const [step, setStep]             = useState<Step>('intro');
  const [realPin, setRealPin]       = useState('');
  const [duressPin, setDuressPin]   = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError]           = useState('');
  const [isSaving, setIsSaving]     = useState(false);

  const inputRef = useRef<TextInput>(null);

  function clearInput(): void {
    setInputValue('');
    setError('');
  }

  function advanceTo(nextStep: Step): void {
    setStep(nextStep);
    clearInput();
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleNext(): Promise<void> {
    setError('');

    switch (step) {
      case 'intro':
        advanceTo('real_pin');
        return;

      case 'real_pin': {
        try {
          DuressPinService.validatePinFormat(inputValue);
          setRealPin(inputValue);
          advanceTo('confirm_real');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid PIN');
        }
        return;
      }

      case 'confirm_real': {
        if (inputValue !== realPin) {
          setError('PINs do not match. Please try again.');
          clearInput();
          return;
        }
        advanceTo('duress_pin');
        return;
      }

      case 'duress_pin': {
        try {
          DuressPinService.validatePinFormat(inputValue);
          if (inputValue === realPin) {
            setError('Duress PIN cannot be the same as your real PIN.');
            return;
          }
          setDuressPin(inputValue);
          advanceTo('confirm_duress');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid PIN');
        }
        return;
      }

      case 'confirm_duress': {
        if (inputValue !== duressPin) {
          setError('PINs do not match. Please try again.');
          clearInput();
          return;
        }
        await savePins();
        return;
      }
    }
  }

  async function savePins(): Promise<void> {
    setIsSaving(true);
    try {
      await DuressPinService.setRealPin(realPin);
      await DuressPinService.setDuressPin(duressPin);
      Logger.info(TAG, 'Duress PIN setup complete');
      setStep('done');
      clearInput();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      Logger.error(TAG, 'savePins failed', { error: message });
      Alert.alert('Setup failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  const stepConfig: Record<Step, { title: string; description: string; placeholder: string; showInput: boolean }> = {
    intro: {
      title:       'Set Up Duress PIN',
      description: 'A duress PIN looks like a normal app PIN but secretly sends a silent SOS to your guardians when entered. Only you know which PIN is which.\n\nYou\'ll set up two PINs:\n  • Real PIN — unlocks the app normally\n  • Duress PIN — silently triggers SOS',
      placeholder: '',
      showInput:   false,
    },
    real_pin: {
      title:       'Choose Your Real PIN',
      description: 'This PIN unlocks the app normally. Use a PIN you can remember easily.',
      placeholder: '4–8 digits',
      showInput:   true,
    },
    confirm_real: {
      title:       'Confirm Real PIN',
      description: 'Enter your real PIN again to confirm.',
      placeholder: 'Re-enter PIN',
      showInput:   true,
    },
    duress_pin: {
      title:       'Choose Your Duress PIN',
      description: 'This PIN silently triggers SOS when entered. It must be different from your real PIN. Do not forget which is which — or test by entering the duress PIN and immediately checking that guardians received a silent alert.',
      placeholder: '4–8 digits',
      showInput:   true,
    },
    confirm_duress: {
      title:       'Confirm Duress PIN',
      description: 'Enter your duress PIN again to confirm.',
      placeholder: 'Re-enter PIN',
      showInput:   true,
    },
    done: {
      title:       '✓ Duress PIN Set',
      description: 'Your duress PIN is active. If someone forces you to unlock the app, enter the duress PIN instead of your real PIN to silently alert your guardians.',
      placeholder: '',
      showInput:   false,
    },
  };

  const config = stepConfig[step];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          Security
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
          {config.title}
        </Text>
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {config.description}
        </Text>

        {config.showInput && (
          <View style={styles.inputSection}>
            <TextInput
              ref={inputRef}
              style={[styles.pinInput, {
                color: theme.colors.onSurface,
                borderColor: error ? theme.colors.danger : theme.colors.border,
                backgroundColor: theme.colors.surface,
              }]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={config.placeholder}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              accessibilityLabel={config.title}
            />
            {error !== '' && (
              <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'done' ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => nav.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
              (isSaving || (config.showInput && inputValue.length < 4)) && styles.buttonDisabled,
            ]}
            onPress={() => { void handleNext(); }}
            disabled={isSaving || (config.showInput && inputValue.length < 4)}
            accessibilityRole="button"
            accessibilityLabel={step === 'intro' ? 'Continue' : 'Next'}
          >
            {isSaving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryButtonText}>{step === 'intro' ? 'Continue' : 'Next'}</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: { width: 80 },
    backText: { ...theme.typography.bodyLarge, color: theme.colors.primary },
    title: { flex: 1, ...theme.typography.titleLarge, color: theme.colors.onBackground, textAlign: 'center' },
    content: { flex: 1, padding: theme.spacing.lg },
    stepTitle: { ...theme.typography.headlineMedium, marginBottom: theme.spacing.md },
    description: { ...theme.typography.bodyLarge, lineHeight: 26, marginBottom: theme.spacing.xl },
    inputSection: { marginTop: theme.spacing.md },
    pinInput: {
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      fontSize: 24,
      letterSpacing: 12,
      textAlign: 'center',
      minHeight: 64,
    },
    error: { ...theme.typography.bodyMedium, marginTop: theme.spacing.sm },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    primaryButton: {
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.5 },
    primaryButtonText: { ...theme.typography.labelLarge, color: '#FFFFFF' },
  });
}
