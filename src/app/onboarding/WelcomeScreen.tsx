import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { colors, spacing, typography } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'Welcome'>;

const TRUST_BULLETS = [
  { icon: '📵', text: 'Works without internet' },
  { icon: '🔒', text: 'No account required' },
  { icon: '📱', text: 'Your data never leaves your phone' },
];

export default function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.logo} accessibilityRole="header">
            GuardianCircle
          </Text>
          <Text style={styles.tagline}>Your safety, your control.</Text>
        </View>

        <View style={styles.bullets} accessibilityRole="list">
          {TRUST_BULLETS.map((b) => (
            <View key={b.text} style={styles.bullet} accessibilityRole="listitem">
              <Text style={styles.bulletIcon}>{b.icon}</Text>
              <Text style={styles.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <AccessibleButton
            onPress={() => navigation.navigate('Permissions')}
            accessibilityLabel="Get Started"
            accessibilityHint="Begin setting up GuardianCircle"
            variant="danger"
            minHeight={56}
            style={styles.cta}
          >
            Get Started
          </AccessibleButton>

          <AccessibleButton
            onPress={() => { /* show explainer sheet */ }}
            accessibilityLabel="Why no account? Learn more"
            variant="ghost"
            minHeight={48}
          >
            Why no account? Learn more
          </AccessibleButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: spacing.xxl },
  logo: { ...typography.displayLarge, color: colors.sosRed, marginBottom: spacing.sm },
  tagline: { ...typography.headlineMedium, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  bullets: { gap: spacing.lg, paddingVertical: spacing.xl },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletIcon: { fontSize: 24 },
  bulletText: { ...typography.bodyLarge, color: colors.light.onBackground, flex: 1 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  cta: { width: '100%' },
});
