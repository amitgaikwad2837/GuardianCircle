import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { IGeofenceRepository } from '../../domain/interfaces/IGeofenceRepository';
import type { Geofence } from '../../domain/entities/Geofence';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<JourneyStackParams>;

export default function GeofenceListScreen(): React.JSX.Element {
  const theme     = useTheme();
  const styles    = makeStyles(theme);
  const navigation = useNavigation<Nav>();

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const repo = Container.resolve<IGeofenceRepository>(DI_TOKENS.IGeofenceRepository);
      setGeofences(await repo.getAll());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (id: string, label: string): void => {
    Alert.alert(`Delete "${label}"?`, 'You will no longer receive alerts for this zone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = Container.resolve<IGeofenceRepository>(DI_TOKENS.IGeofenceRepository);
          await repo.delete(id);
          setGeofences((prev) => prev.filter((g) => g.id !== id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Safe Zones</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('GeofenceDetail', {})}
          accessibilityRole="button"
          accessibilityLabel="Add safe zone"
        >
          <Text style={[styles.addBtn, { color: theme.colors.primary }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={geofences}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              No safe zones
            </Text>
            <Text style={[styles.emptyBody, { color: theme.colors.onSurfaceVariant }]}>
              Add a safe zone to get alerts when you enter or leave an area.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowIcon, { color: item.type === 'safe' ? '#4CAF50' : theme.colors.danger }]}>
                {item.type === 'safe' ? '●' : '▲'}
              </Text>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>
                  {item.label}
                </Text>
                <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
                  {item.radiusMeters}m radius · {item.alertOn}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.label)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.label}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.deleteBtn, { color: theme.colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    },
    back: { fontSize: 17 },
    title: { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    addBtn: { fontSize: 17, fontWeight: '600' },
    list: { padding: theme.spacing.md, paddingBottom: 40 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: theme.spacing.xl },
    emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: 10,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowIcon: { fontSize: 16, marginRight: 12 },
    rowLabel: { fontSize: 15, fontWeight: '500' },
    rowSub: { fontSize: 12, marginTop: 2 },
    deleteBtn: { fontSize: 14, fontWeight: '500' },
  });
}
