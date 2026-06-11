import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@core/navigation/AppNavigator';
import { DatabaseManager } from '@core/storage/database/DatabaseManager';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { KeyManager } from '@core/crypto/KeyManager';
import { GuardianNotificationHandler } from '@features/guardian/infrastructure/GuardianNotificationHandler';
import { colors } from '@core/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

export default function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // 1. Ensure database encryption key exists
        const keyExists = await KeyManager.isHardwareBacked('db_encryption_key').catch(() => false);
        if (!keyExists) await KeyManager.generateDatabaseKey();

        // 2. Open and migrate encrypted database
        await DatabaseManager.initialize();

        // 3. Ensure local identity key pair exists
        await IdentityManager.initialize();

        // 4. Register FCM notification handler
        GuardianNotificationHandler.initialize();

        setIsReady(true);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Startup failed');
      }
    })();
  }, []);

  if (!isReady && !initError) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.sosRed} />
      </View>
    );
  }

  if (initError) {
    // Minimal error screen — cannot use full UI if DB failed
    return (
      <View style={styles.splash}>
        {/* Error text rendered as plain View to avoid circular dependency */}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
});
