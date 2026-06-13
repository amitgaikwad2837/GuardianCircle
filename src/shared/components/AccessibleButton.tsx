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
  /** primary   — teal filled   (main actions)
   *  secondary — indigo filled  (alt actions)
   *  ghost     — teal-bordered  (skip / tertiary)
   *  danger    — red filled     (SOS button only) */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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

  const textColor = variant === 'ghost' ? colors.light.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.base, styles[variant], { minHeight }, disabled && styles.disabled, style]}
      activeOpacity={0.75}
    >
      <Text style={[styles.label, { color: textColor }, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTargets.minimum,
  },
  primary: {
    backgroundColor: colors.light.primary,
    elevation: 3,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  secondary: {
    backgroundColor: colors.light.secondary,
    elevation: 2,
    shadowColor: colors.light.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.light.primary,
  },
  danger: {
    backgroundColor: colors.sosRed,
    elevation: 5,
    shadowColor: colors.sosRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  label: {
    ...typography.labelLarge,
  },
  disabled: {
    opacity: 0.4,
  },
});
