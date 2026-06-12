import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { PhonebookPickerUseCase } from '../../application/PhonebookPickerUseCase';
import type { GuardianStackParams } from '@core/navigation/NavigationTypes';
import { Logger } from '@core/logger/Logger';

const TAG = 'AddGuardianScreen';

type NavProp = NativeStackNavigationProp<GuardianStackParams>;

const phonebookPicker = new PhonebookPickerUseCase();

export default function AddGuardianScreen(): React.JSX.Element {
  const theme = useTheme();
  const nav   = useNavigation<NavProp>();
  const [isPickingContact, setIsPickingContact] = useState(false);
  const styles = makeStyles(theme);

  const pickFromPhonebook = async (): Promise<void> => {
    setIsPickingContact(true);
    try {
      const result = await phonebookPicker.execute();
      if (!result) return;

      if (result.rawPhoneNumbers.length === 1 && result.resolvedPhoneNumber) {
        // Single number — go directly to the confirmation form
        nav.navigate('GuardianForm', {
          prefill: {
            displayName: result.displayName,
            phoneNumber: result.resolvedPhoneNumber,
            source: 'phonebook',
          },
        });
      } else if (result.rawPhoneNumbers.length > 1) {
        // Multiple numbers — ask user which to use
        const options = result.rawPhoneNumbers.map((n) => `${n.label}: ${n.number}`);
        Alert.alert(
          result.displayName,
          'Which number should receive emergency alerts?',
          result.rawPhoneNumbers.map((n) => ({
            text: `${n.label}: ${n.number}`,
            onPress: () => {
              try {
                const formatted = phonebookPicker.formatE164(n.number);
                nav.navigate('GuardianForm', {
                  prefill: {
                    displayName: result.displayName,
                    phoneNumber: formatted,
                    source: 'phonebook',
                  },
                });
              } catch {
                Alert.alert('Invalid number', `${n.number} is not a valid mobile number.`);
              }
            },
          })).concat([{ text: 'Cancel', onPress: () => undefined }]),
        );
        void options; // used via Alert.alert above
      } else {
        Alert.alert('No number found', 'This contact has no phone number saved.');
      }
    } catch (err) {
      Logger.error(TAG, 'pickFromPhonebook failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert('Error', 'Could not open contacts. Please check permissions in Settings.');
    } finally {
      setIsPickingContact(false);
    }
  };

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
          Add Guardian
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Guardians receive your emergency alerts by SMS. They don't need the
          GuardianCircle app installed.
        </Text>

        {/* Option 1: Enter manually */}
        <MethodCard
          icon="✏️"
          title="Enter number manually"
          description="Type a phone number or paste one you know"
          onPress={() => nav.navigate('GuardianForm', {})}
          theme={theme}
        />

        {/* Option 2: Pick from phonebook */}
        <MethodCard
          icon="📱"
          title="Choose from contacts"
          description="Select a contact from your phone's address book"
          onPress={() => { void pickFromPhonebook(); }}
          loading={isPickingContact}
          theme={theme}
        />

        {/* Option 3: QR pairing — Phase 3 */}
        <MethodCard
          icon="🔗"
          title="Scan QR code"
          description="Pair with someone who already has GuardianCircle — enables encrypted push alerts"
          onPress={() => nav.navigate('QRPair', { mode: 'scan' })}
          comingSoon={false}
          theme={theme}
        />
      </View>
    </SafeAreaView>
  );
}

interface MethodCardProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  loading?: boolean;
  comingSoon?: boolean;
  theme: ReturnType<typeof useTheme>;
}

function MethodCard({
  icon, title, description, onPress, loading, comingSoon, theme,
}: MethodCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        comingSoon && { opacity: 0.5 },
      ]}
      onPress={comingSoon ? undefined : onPress}
      disabled={loading === true || comingSoon === true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled: loading === true || comingSoon === true }}
    >
      <Text style={cardStyles.icon}>{icon}</Text>
      <View style={cardStyles.textGroup}>
        <Text style={[cardStyles.cardTitle, { color: theme.colors.onSurface }]}>
          {title}
          {comingSoon === true && <Text style={{ color: theme.colors.onSurfaceVariant }}> (Phase 3)</Text>}
        </Text>
        <Text style={[cardStyles.cardDesc, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      </View>
      {loading === true
        ? <ActivityIndicator size="small" color={theme.colors.primary} />
        : <Text style={[cardStyles.chevron, { color: theme.colors.onSurfaceVariant }]}>›</Text>
      }
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
    content: { flex: 1, padding: theme.spacing.md },
    description: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
    },
  });
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 72,
  },
  icon: { fontSize: 24, marginRight: 12 },
  textGroup: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 22, fontWeight: '300', marginLeft: 8 },
});
