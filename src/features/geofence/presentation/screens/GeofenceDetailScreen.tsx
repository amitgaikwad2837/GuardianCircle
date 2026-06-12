import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { CreateGeofenceUseCase } from '../../application/CreateGeofenceUseCase';
import { LocationService } from '@core/location/LocationService';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';
import type { GeofenceType, GeofenceAlertOn } from '../../domain/entities/Geofence';

type Nav = NativeStackNavigationProp<JourneyStackParams>;

export default function GeofenceDetailScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();

  const [label, setLabel]   = useState('');
  const [radius, setRadius] = useState('200');
  const [type, setType]     = useState<GeofenceType>('safe');
  const [alertOn, setAlertOn] = useState<GeofenceAlertOn>('both');
  const [isBusy, setIsBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (label.trim().length === 0) next['label'] = 'Label is required';
    const r = parseInt(radius, 10);
    if (isNaN(r) || r < 50) next['radius'] = 'Minimum 50 metres';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!validate()) return;
    setIsBusy(true);
    try {
      const location = await LocationService.getCurrentLocation().catch(() => null);
      if (!location) {
        Alert.alert('Location Required', 'Enable location to place a geofence at your current position.');
        return;
      }
      await new CreateGeofenceUseCase().execute({
        label: label.trim(),
        center: location,
        radiusMeters: parseInt(radius, 10),
        type,
        alertOn,
      });
      nav.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save geofence.');
    } finally {
      setIsBusy(false);
    }
  };

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
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>New Safe Zone</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Name</Text>
        <TextInput
          style={[styles.input, { borderColor: errors['label'] ? theme.colors.danger : theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
          placeholder="e.g. Home, Work, Gym"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={label}
          onChangeText={setLabel}
          returnKeyType="next"
          accessibilityLabel="Zone name"
        />
        {errors['label'] && <Text style={[styles.error, { color: theme.colors.danger }]}>{errors['label']}</Text>}

        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 16 }]}>
          Radius (metres)
        </Text>
        <TextInput
          style={[styles.input, { borderColor: errors['radius'] ? theme.colors.danger : theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
          value={radius}
          onChangeText={setRadius}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel="Radius in metres"
        />
        {errors['radius'] && <Text style={[styles.error, { color: theme.colors.danger }]}>{errors['radius']}</Text>}

        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 16 }]}>
          Zone type
        </Text>
        <View style={styles.segmented}>
          {(['safe', 'unsafe'] as GeofenceType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segment, type === t && { backgroundColor: theme.colors.primary }]}
              onPress={() => setType(t)}
              accessibilityRole="radio"
              accessibilityState={{ checked: type === t }}
            >
              <Text style={[styles.segmentText, { color: type === t ? '#fff' : theme.colors.onSurface }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 16 }]}>
          Alert on
        </Text>
        <View style={styles.segmented}>
          {(['enter', 'exit', 'both'] as GeofenceAlertOn[]).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.segment, alertOn === a && { backgroundColor: theme.colors.primary }]}
              onPress={() => setAlertOn(a)}
              accessibilityRole="radio"
              accessibilityState={{ checked: alertOn === a }}
            >
              <Text style={[styles.segmentText, { color: alertOn === a ? '#fff' : theme.colors.onSurface }]}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          The zone will be placed at your current location.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, marginTop: theme.spacing.xl }, isBusy && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Save safe zone"
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Zone</Text>
          }
        </TouchableOpacity>
      </ScrollView>
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
    content: { padding: theme.spacing.lg, paddingBottom: 40 },
    fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1, borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
      fontSize: 15, minHeight: 48,
    },
    error: { fontSize: 12, marginTop: 4 },
    segmented: { flexDirection: 'row', borderRadius: theme.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    segmentText: { fontSize: 14, fontWeight: '500' },
    hint: { fontSize: 13, marginTop: theme.spacing.lg, lineHeight: 20 },
    saveBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
