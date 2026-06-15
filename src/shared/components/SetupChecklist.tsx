import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParams } from '@core/navigation/NavigationTypes';
import { colors, spacing, typography, radius } from '@core/theme/tokens';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { PermissionManager } from '@core/permissions/PermissionManager';
import { EventBus } from '@core/events/EventBus';

type Nav = BottomTabNavigationProp<MainTabParams>;

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  accessibilityHint: string;
}

async function computeItems(): Promise<ChecklistItem[]> {
  const locationGranted = await PermissionManager.check('location');

  return [
    {
      id: 'guardian',
      label: 'Add a guardian',
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_GUARDIAN_ADDED),
      accessibilityHint: 'Opens the Guardians tab to add your first emergency contact',
    },
    {
      id: 'location',
      label: 'Grant location access',
      done: locationGranted,
      accessibilityHint: 'Opens device settings so you can allow location access',
    },
    {
      id: 'pin',
      label: 'Set a duress PIN',
      // Written by DuressPinService.setRealPin() — avoids a shared→feature import
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_DURESS_PIN_SET),
      accessibilityHint: 'Opens the Settings tab to configure a duress PIN',
    },
    {
      id: 'test_sos',
      label: 'Do a test SOS',
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_TEST_SOS_DONE),
      accessibilityHint: 'Hold the SOS button for 3 seconds then cancel to complete this step',
    },
  ];
}

export function SetupChecklist(): React.JSX.Element | null {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const refresh = useCallback((): void => {
    void computeItems().then(setItems);
  }, []);

  useEffect(() => {
    refresh();

    // Re-check when a guardian is added
    const offGuardian = EventBus.on('guardian:added', () => {
      PreferencesStore.setBoolean(PREF_KEYS.CHECKLIST_GUARDIAN_ADDED, true);
      refresh();
    });

    return () => { offGuardian(); };
  }, [refresh]);

  const doneCount = items.filter((i) => i.done).length;

  // Hide once all four steps are complete
  if (items.length === 0 || doneCount === items.length) {return null;}

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <View style={styles.card} accessibilityRole="none" accessibilityLabel={`Setup checklist: ${pct}% complete`}>
      <View style={styles.header}>
        <Text style={styles.title}>Get started</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack} accessibilityElementsHidden>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.items}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            disabled={item.done}
            onPress={() => {
              if (item.id === 'guardian') { navigation.navigate('Guardians'); }
              else if (item.id === 'location') { void Linking.openSettings(); }
              else if (item.id === 'pin') { navigation.navigate('Settings'); }
              // test_sos: no navigation — user acts on the SOS button above
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.done ? 'complete' : 'not done'}`}
            accessibilityHint={item.done ? undefined : item.accessibilityHint}
            accessibilityState={{ disabled: item.done }}
          >
            <View style={[styles.dot, item.done && styles.dotDone]}>
              {item.done && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={[styles.itemLabel, item.done && styles.itemLabelDone, styles.itemLabelFlex]}>
              {item.label}
            </Text>
            {!item.done && <Text style={styles.chevron}>›</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.titleSmall,
    color: colors.light.onBackground,
  },
  pct: {
    ...typography.labelLarge,
    color: colors.brandIndigo,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brandIndigo,
  },
  items: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.light.onSurfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.brandIndigo,
    borderColor: colors.brandIndigo,
  },
  check: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemLabel: {
    ...typography.bodyMedium,
    color: colors.light.onSurfaceVariant,
  },
  itemLabelDone: {
    color: colors.light.onBackground,
    textDecorationLine: 'line-through',
  },
  itemLabelFlex: {
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: colors.light.onSurfaceVariant,
  },
});
