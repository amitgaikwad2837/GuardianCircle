import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { touchTargets, colors, typography } from '@core/theme/tokens';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  minHeight?: number;
}

export function AccessibleButton({
  onPress,
  children,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  variant = 'primary',
  minHeight = touchTargets.minimum,
}: Props): React.JSX.Element {
  const handlePress = (): void => {
    if (PreferencesStore.getBoolean(PREF_KEYS.HAPTIC_ENABLED)) {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.base, styles[variant], { minHeight }, disabled && styles.disabled, style]}
      activeOpacity={0.7}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTargets.minimum,
  },
  primary: {
    backgroundColor: colors.light.primary,
  },
  danger: {
    backgroundColor: colors.sosRed,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  text: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.4,
  },
});
