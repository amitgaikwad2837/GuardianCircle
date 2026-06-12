import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { AddGuardianUseCase }   from '../../application/AddGuardianUseCase';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { IGuardianRepository } from '../../domain/interfaces/IGuardianRepository';
import { useGuardianStore }     from '../store/guardianStore';
import type { GuardianStackParams } from '@core/navigation/NavigationTypes';
import { Logger } from '@core/logger/Logger';

const TAG = 'GuardianFormScreen';

type NavProp   = NativeStackNavigationProp<GuardianStackParams>;
type RouteProp = NativeStackScreenProps<GuardianStackParams, 'GuardianForm'>['route'];

export default function GuardianFormScreen(): React.JSX.Element {
  const theme  = useTheme();
  const nav    = useNavigation<NavProp>();
  const route  = useRoute<RouteProp>();
  const store  = useGuardianStore();
  const styles = makeStyles(theme);

  const prefill = route.params?.prefill;

  const [displayName, setDisplayName] = useState(prefill?.displayName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(prefill?.phoneNumber ?? '');
  const [notes, setNotes]             = useState('');
  const [isSaving, setIsSaving]       = useState(false);
  const [nameError, setNameError]     = useState('');
  const [phoneError, setPhoneError]   = useState('');

  const phoneRef = useRef<TextInput>(null);

  function validate(): boolean {
    let valid = true;
    setNameError('');
    setPhoneError('');

    if (displayName.trim().length < 1) {
      setNameError('Please enter a name for this guardian.');
      valid = false;
    }
    if (phoneNumber.trim().length < 5) {
      setPhoneError('Please enter a valid phone number.');
      valid = false;
    }
    return valid;
  }

  async function handleSave(): Promise<void> {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const repo     = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
      const useCase  = new AddGuardianUseCase(repo);
      const guardian = await useCase.execute({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        notificationPriority: store.guardians.length + 1,
      });

      store.addGuardian(guardian);
      Logger.info(TAG, 'Guardian added', { id: guardian.id });

      // Navigate back to the guardian list (pop 2: Form + AddGuardian)
      nav.pop(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add guardian';
      Logger.error(TAG, 'handleSave failed', { error: message });

      if (message.includes('phone') || message.includes('number') || message.includes('Invalid')) {
        setPhoneError(message);
      } else if (message.includes('already')) {
        setPhoneError(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            {route.params?.guardianId ? 'Edit Guardian' : 'New Guardian'}
          </Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {prefill?.source === 'phonebook' && (
            <View style={[styles.sourceBadge, { backgroundColor: theme.colors.primary + '18' }]}>
              <Text style={[styles.sourceText, { color: theme.colors.primary }]}>
                📱 Imported from contacts
              </Text>
            </View>
          )}

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[
              styles.input,
              nameError ? styles.inputError : undefined,
              { color: theme.colors.onSurface, borderColor: nameError ? theme.colors.danger : theme.colors.border },
            ]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            accessibilityLabel="Guardian name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={80}
          />
          {nameError !== '' && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{nameError}</Text>
          )}

          {/* Phone number */}
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            ref={phoneRef}
            style={[
              styles.input,
              phoneError ? styles.inputError : undefined,
              { color: theme.colors.onSurface, borderColor: phoneError ? theme.colors.danger : theme.colors.border },
            ]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+91 98765 43210"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
            returnKeyType="next"
            accessibilityLabel="Guardian phone number"
            autoCorrect={false}
          />
          {phoneError !== '' && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{phoneError}</Text>
          )}
          <Text style={styles.hint}>
            Include country code. Example: +91 for India, +44 for UK.
          </Text>

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { color: theme.colors.onSurface, borderColor: theme.colors.border },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. My sister — she's always available"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
            accessibilityLabel="Notes about this guardian"
            maxLength={200}
          />
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={() => { void handleSave(); }}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={isSaving ? 'Saving guardian' : 'Save guardian'}
            accessibilityState={{ disabled: isSaving }}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.saveButtonText}>Save Guardian</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: { width: 80 },
    backText: { ...theme.typography.bodyLarge, color: theme.colors.primary },
    title: {
      flex: 1,
      ...theme.typography.titleLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
    },
    form: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
    sourceBadge: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sourceText: { ...theme.typography.labelMedium, textAlign: 'center' },
    label: {
      ...theme.typography.labelLarge,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      ...theme.typography.bodyLarge,
      backgroundColor: theme.colors.surface,
      minHeight: 48,
    },
    inputError: { borderWidth: 1.5 },
    notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
    errorText: { ...theme.typography.labelMedium, marginTop: 4 },
    hint: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { ...theme.typography.labelLarge, color: theme.colors.onPrimary },
  });
}
