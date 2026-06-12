import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
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
          <Svg
            width={120}
            height={144}
            viewBox="0 0 200 240"
            accessibilityLabel="GuardianCircle logo"
            accessibilityRole="image"
          >
            <Path d="M100 8C89 8 38 26 38 74C38 122 64 158 100 172C136 158 162 122 162 74C162 26 111 8 100 8Z" fill="#1A237E"/>
            <Path d="M100 8C111 8 162 26 162 74C162 122 136 158 100 172L100 8Z" fill="#3F51B5" opacity="0.5"/>
            <Path d="M81 16Q100 8 119 16" fill="none" stroke="#9FA8DA" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M100 34C92 34 56 48 56 84C56 114 76 138 100 150C124 138 144 114 144 84C144 48 108 34 100 34Z" fill="#1B5E20"/>
            <Path d="M100 34C108 34 144 48 144 84C144 114 124 138 100 150L100 34Z" fill="#2E7D32" opacity="0.55"/>
            <Path d="M88 90L88 82C88 70 112 70 112 82L112 90" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
            <Rect x="82" y="90" width="36" height="26" rx="5" fill="#fff"/>
            <Circle cx="100" cy="101" r="5.5" fill="#1B5E20"/>
            <Rect x="97" y="101" width="6" height="9" rx="2" fill="#1B5E20"/>
          </Svg>
          <Text style={styles.appName} accessibilityRole="header">
            <Text style={styles.appNameIndigo}>Guardian</Text>
            <Text style={styles.appNameGreen}>Circle</Text>
          </Text>
          <Text style={styles.tagline}>Your safety, your control.</Text>
        </View>

        <View style={styles.bullets} accessibilityRole="list">
          {TRUST_BULLETS.map((b) => (
            <View key={b.text} style={styles.bullet} accessibilityRole="none">
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
  logo: { marginBottom: spacing.lg },
  appName: { ...typography.displayLarge, marginBottom: spacing.sm },
  appNameIndigo: { color: '#1A237E' },
  appNameGreen: { color: '#1B5E20' },
  tagline: { ...typography.headlineMedium, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  bullets: { gap: spacing.lg, paddingVertical: spacing.xl },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletIcon: { fontSize: 24 },
  bulletText: { ...typography.bodyLarge, color: colors.light.onBackground, flex: 1 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  cta: { width: '100%' },
});
