import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { colors, spacing, typography, radius } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'Welcome'>;

const PILLARS = [
  { icon: '🛡️', title: 'Always ready', body: 'Works without internet — even in airplane mode' },
  { icon: '🔒', title: 'Fully private', body: 'No account, no servers — your data never leaves your device' },
  { icon: '🤝', title: 'Guardian network', body: 'Trusted people who get alerted only when you need them' },
];

export default function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Svg width={110} height={132} viewBox="0 0 200 240"
            accessibilityLabel="GuardianCircle logo" accessibilityRole="image">
            <Path d="M100 8C89 8 38 26 38 74C38 122 64 158 100 172C136 158 162 122 162 74C162 26 111 8 100 8Z" fill="#1A237E"/>
            <Path d="M100 8C111 8 162 26 162 74C162 122 136 158 100 172L100 8Z" fill="#3F51B5" opacity="0.5"/>
            <Path d="M100 34C92 34 56 48 56 84C56 114 76 138 100 150C124 138 144 114 144 84C144 48 108 34 100 34Z" fill="#1B5E20"/>
            <Path d="M100 34C108 34 144 48 144 84C144 114 124 138 100 150L100 34Z" fill="#2E7D32" opacity="0.55"/>
            <Path d="M88 90L88 82C88 70 112 70 112 82L112 90" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
            <Rect x="82" y="90" width="36" height="26" rx="5" fill="#fff"/>
            <Circle cx="100" cy="101" r="5.5" fill="#1B5E20"/>
            <Rect x="97" y="101" width="6" height="9" rx="2" fill="#1B5E20"/>
          </Svg>
          <Text style={styles.appName}>
            <Text style={styles.nameIndigo}>Guardian</Text>
            <Text style={styles.nameGreen}>Circle</Text>
          </Text>
          <Text style={styles.tagline}>Your safety, your control.</Text>
        </View>

        <View style={styles.pillars}>
          {PILLARS.map((p) => (
            <View key={p.title} style={styles.pillar}>
              <Text style={styles.pillarIcon}>{p.icon}</Text>
              <View style={styles.pillarText}>
                <Text style={styles.pillarTitle}>{p.title}</Text>
                <Text style={styles.pillarBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <AccessibleButton
          onPress={() => navigation.navigate('Permissions')}
          accessibilityLabel="Get Started"
          accessibilityHint="Begin setting up GuardianCircle"
          variant="primary"
          minHeight={56}
          style={styles.cta}
        >
          Get Started
        </AccessibleButton>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  hero: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  appName: { ...typography.displayMedium },
  nameIndigo: { color: colors.brandIndigo },
  nameGreen: { color: colors.brandGreen },
  tagline: { ...typography.titleLarge, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  pillars: { gap: spacing.sm },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  pillarIcon: { fontSize: 28 },
  pillarText: { flex: 1, gap: 2 },
  pillarTitle: { ...typography.titleSmall, color: colors.light.onBackground },
  pillarBody: { ...typography.bodyMedium, color: colors.light.onSurfaceVariant },
  cta: { width: '100%' },
});
