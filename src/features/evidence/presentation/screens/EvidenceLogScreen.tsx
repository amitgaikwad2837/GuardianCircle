import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { Container, DI_TOKENS } from '@core/di/Container';
import { LocationService } from '@core/location/LocationService';
import { Logger } from '@core/logger/Logger';
import type { IEvidenceRepository } from '../../domain/interfaces/IEvidenceRepository';
import type { Evidence } from '../../domain/entities/Evidence';
import type { SettingsStackParams } from '@core/navigation/NavigationTypes';

const TAG = 'EvidenceLogScreen';

type Nav = NativeStackNavigationProp<SettingsStackParams, 'EvidenceLog'>;

const TYPE_LABELS: Record<string, string> = {
  note:              'Note',
  location_snapshot: 'Location',
  photo:             'Photo',
  audio:             'Audio',
  video:             'Video',
};

const AUTO_DELETE_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function EvidenceLogScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();

  const [items, setItems]   = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  const repo = Container.resolve<IEvidenceRepository>(DI_TOKENS.IEvidenceRepository);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recent = await repo.getRecent(50);
      setItems(recent);
    } catch (err) {
      Logger.error(TAG, 'Load failed', { message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void load(); }, [load]);

  const addNote = (): void => {
    Alert.prompt(
      'Add Note',
      'Describe what happened (stored encrypted on-device)',
      (text): void => {
        if (!text?.trim()) {return;}
        void (async () => {
          try {
            await repo.save({
              type:         'note',
              contentHash:  '',
              capturedAt:   new Date(),
              metadata:     { text: text.trim() },
              isEncrypted:  false,
            });
            void load();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save note.');
          }
        })();
      },
      'plain-text',
    );
  };

  const addLocationSnapshot = async (): Promise<void> => {
    try {
      const loc = await LocationService.getCurrentLocation();
      await repo.save({
        type:        'location_snapshot',
        contentHash: '',
        capturedAt:  new Date(),
        lat:         loc.lat,
        lng:         loc.lng,
        metadata:    { accuracy: loc.accuracy },
        isEncrypted: false,
      });
      void load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not get location.');
    }
  };

  const deleteItem = (item: Evidence): void => {
    Alert.alert(
      'Delete Evidence',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (): void => {
            void repo.delete(item.id)
              .then(() => { void load(); })
              .catch((err: unknown) => {
                Alert.alert('Delete Failed', err instanceof Error ? err.message : 'Could not delete evidence item.');
              });
          },
        },
      ],
    );
  };

  const exportAll = async (): Promise<void> => {
    if (items.length === 0) {
      Alert.alert('No Evidence', 'Add notes or location snapshots first.');
      return;
    }
    const lines = items.map((ev) => {
      const ts = ev.capturedAt.toLocaleString();
      const type = TYPE_LABELS[ev.type] ?? ev.type;
      if (ev.type === 'note') {
        return `[${ts}] ${type}: ${(ev.metadata.text as string | undefined) ?? ''}`;
      }
      if (ev.type === 'location_snapshot') {
        return `[${ts}] ${type}: ${ev.lat?.toFixed(6)},${ev.lng?.toFixed(6)} (±${String(ev.metadata.accuracy ?? '?')}m)`;
      }
      return `[${ts}] ${type}: ${ev.fileUri ?? 'no file'}`;
    });
    await Share.share({
      title:   'GuardianCircle Evidence Log',
      message: lines.join('\n'),
    });
  };

  const ageLabel = (ev: Evidence): string => {
    const ageMs = Date.now() - ev.capturedAt.getTime();
    const remaining = AUTO_DELETE_MS - ageMs;
    if (remaining <= 0) {return 'Expires soon';}
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m until auto-delete` : `${m}m until auto-delete`;
  };

  const renderItem = ({ item }: { item: Evidence }): React.JSX.Element => (
    <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.typeTag, { backgroundColor: theme.colors.primary + '22' }]}>
        <Text style={[styles.typeText, { color: theme.colors.primary }]}>
          {TYPE_LABELS[item.type] ?? item.type}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowMain, { color: theme.colors.onSurface }]} numberOfLines={2}>
          {item.type === 'note'
            ? (item.metadata.text as string | undefined) ?? '(empty)'
            : item.type === 'location_snapshot'
            ? `${item.lat?.toFixed(5)}, ${item.lng?.toFixed(5)}`
            : item.fileUri ?? '—'}
        </Text>
        <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
          {item.capturedAt.toLocaleString()} · {ageLabel(item)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => deleteItem(item)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Delete evidence item"
      >
        <Text style={{ color: theme.colors.danger, fontSize: 18, lineHeight: 22 }}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Evidence Log</Text>
        <TouchableOpacity
          onPress={() => { void exportAll(); }}
          accessibilityRole="button"
          accessibilityLabel="Export all evidence"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.exportBtn, { color: theme.colors.primary }]}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.notice, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.noticeText, { color: theme.colors.onSurfaceVariant }]}>
          Evidence is stored encrypted on-device and auto-deleted 24 h after capture.
          Use Export to share via a secure channel before it expires.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.colors.primary }]}
          onPress={addNote}
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>+ Add Note</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.colors.primary }]}
          onPress={() => { void addLocationSnapshot(); }}
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>+ Location</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            No evidence recorded yet.{'\n'}Tap above to add a note or location snapshot.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(ev) => ev.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container:      { flex: 1, backgroundColor: theme.colors.background },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back:           { fontSize: 17 },
    title:          { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    exportBtn:      { fontSize: 15, fontWeight: '600' },
    notice:         { marginHorizontal: theme.spacing.md, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
    noticeText:     { fontSize: 12, lineHeight: 18 },
    actions:        { flexDirection: 'row', gap: 10, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
    actionBtn:      { flex: 1, borderWidth: 1, borderRadius: theme.radius.md, paddingVertical: 8, alignItems: 'center' },
    actionBtnText:  { fontSize: 14, fontWeight: '600' },
    list:           { paddingHorizontal: theme.spacing.md, paddingBottom: 40 },
    row:            { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: 8, gap: 10 },
    typeTag:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    typeText:       { fontSize: 10, fontWeight: '700' },
    rowMain:        { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    rowSub:         { fontSize: 11 },
    center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
    emptyText:      { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  });
}
