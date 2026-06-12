import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@core/theme/ThemeProvider';
import { Logger, type LogEntry, type LogLevel } from '@core/logger/Logger';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#9E9E9E',
  info:  '#2196F3',
  warn:  '#FF9800',
  error: '#F44336',
};

export default function LogsScreen(): React.JSX.Element {
  const theme      = useTheme();
  const styles     = makeStyles(theme);
  const navigation = useNavigation();

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const refresh = useCallback(() => {
    setLogs(Logger.getRecentLogs());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const clearLogs = (): void => {
    Alert.alert(
      'Clear Logs',
      'Delete all local debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Logger.clearLogs();
            setLogs([]);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: LogEntry }): React.JSX.Element => {
    const ts = new Date(item.ts);
    const timeStr = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;
    return (
      <View style={[styles.entry, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.entryHeader}>
          <Text style={[styles.level, { color: LEVEL_COLORS[item.level] }]}>
            {item.level.toUpperCase()}
          </Text>
          <Text style={[styles.tag, { color: theme.colors.primary }]}>{item.tag}</Text>
          <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>{timeStr}</Text>
        </View>
        <Text style={[styles.message, { color: theme.colors.onSurface }]} selectable>
          {item.message}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]} accessibilityRole="header">
            Debug Logs
          </Text>
          <TouchableOpacity onPress={clearLogs} accessibilityRole="button" accessibilityLabel="Clear all logs">
            <Text style={[styles.clearBtn, { color: theme.colors.danger }]}>Clear</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Stored locally only. Never transmitted.
        </Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No logs yet.</Text>
        </View>
      ) : (
        <FlatList
          data={[...logs].reverse()}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: 6 }}
          onRefresh={refresh}
          refreshing={false}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back: { fontSize: 17, marginBottom: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...theme.typography.headlineMedium },
    clearBtn: { fontSize: 15, fontWeight: '600' },
    subtitle: { fontSize: 12, marginTop: 2 },
    entry: { borderRadius: theme.radius.md, padding: theme.spacing.sm },
    entryHeader: { flexDirection: 'row', gap: 8, marginBottom: 2 },
    level: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    tag: { fontSize: 10, fontWeight: '600' },
    time: { fontSize: 10, marginLeft: 'auto' },
    message: { fontSize: 12, lineHeight: 17, fontFamily: 'monospace' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 14 },
  });
}
