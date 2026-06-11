import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, colors, spacing } from '@core/theme/tokens';
import { AccessibleButton } from './AccessibleButton';

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: Props): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <AccessibleButton
          onPress={onAction}
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          {actionLabel}
        </AccessibleButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.light.onBackground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  action: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});
