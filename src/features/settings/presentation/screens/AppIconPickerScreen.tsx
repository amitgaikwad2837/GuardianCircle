import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@core/theme/ThemeProvider';
import {
  AppIconService,
  APP_ICON_VARIANTS,
  type AppIconVariant,
} from '@core/appicon/AppIconService';

export default function AppIconPickerScreen(): React.JSX.Element {
  const theme      = useTheme();
  const styles     = makeStyles(theme);
  const navigation = useNavigation();

  const [selected, setSelected] = useState<AppIconVariant>(AppIconService.getCurrentVariant());
  const [saving, setSaving]     = useState(false);

  const handleSelect = (variant: AppIconVariant): void => {
    if (variant === selected) return;

    Alert.alert(
      'Change App Icon',
      `Switch to "${APP_ICON_VARIANTS.find((v) => v.id === variant)?.label ?? variant}"?\n\nThe launcher icon will change immediately. The app may briefly disappear from the home screen on some devices.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setSaving(true);
            try {
              await AppIconService.setVariant(variant);
              setSelected(variant);
            } catch {
              Alert.alert('Error', 'Could not change the app icon. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]} accessibilityRole="header">
          App Icon
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Change how this app appears on your home screen. All safety features work regardless of which icon is shown.
      </Text>

      {saving ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={APP_ICON_VARIANTS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10, paddingBottom: theme.spacing.xxl }}
          renderItem={({ item }) => {
            const isActive = item.id === selected;
            return (
              <TouchableOpacity
                style={[
                  styles.row,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isActive ? theme.colors.primary : 'transparent',
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelect(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${item.label} — ${item.description}`}
                accessibilityHint="Double-tap to open confirmation dialog"
              >
                <View style={[styles.iconBox, { backgroundColor: isActive ? theme.colors.primary + '22' : theme.colors.background }]}>
                  <Text style={styles.iconEmoji}>
                    {item.id === 'default'    ? '🛡️' :
                     item.id === 'calculator' ? '🔢' :
                     item.id === 'weather'    ? '🌤️' : '📝'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.label, { color: theme.colors.onSurface }]}>{item.label}</Text>
                  <Text style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>{item.description}</Text>
                </View>
                {isActive && (
                  <Text style={[styles.check, { color: theme.colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Text style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
        Icon switching requires the app to briefly restart. On some Android launchers the icon may take a few seconds to update.
      </Text>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back: { fontSize: 17, marginBottom: 4 },
    title: { ...theme.typography.headlineMedium },
    subtitle: { fontSize: 13, lineHeight: 18, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: 14,
    },
    iconBox: {
      width: 52, height: 52, borderRadius: theme.radius.md,
      alignItems: 'center', justifyContent: 'center',
    },
    iconEmoji: { fontSize: 28 },
    info: { flex: 1 },
    label: { fontSize: 15, fontWeight: '600' },
    desc: { fontSize: 12, marginTop: 2 },
    check: { fontSize: 20, fontWeight: '700' },
    disclaimer: { fontSize: 11, textAlign: 'center', padding: theme.spacing.md, fontStyle: 'italic' },
  });
}
