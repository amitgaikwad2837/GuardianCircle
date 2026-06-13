import React, { useEffect, useState, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, NativeModules } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@core/navigation/AppNavigator';
import { RootModalManager } from './RootModalManager';
import { DatabaseManager } from '@core/storage/database/DatabaseManager';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { KeyManager } from '@core/crypto/KeyManager';
import { GuardianNotificationHandler } from '@features/guardian/infrastructure/GuardianNotificationHandler';
import { JourneyNotificationService } from '@features/journey/infrastructure/JourneyNotificationService';
import { UnsafePlaceService } from '@features/geofence/infrastructure/UnsafePlaceService';
import { BleMeshOrchestrator } from '@features/bluetooth-mesh/application/BleMeshOrchestrator';
import { ThemeProvider } from '@core/theme/ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { Logger } from '@core/logger/Logger';
import { registerDependencies } from './bootstrap/registerDependencies';
import { colors } from '@core/theme/tokens';

const TAG = 'App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

type InitState = 'loading' | 'ready' | 'error';

export default function App(): React.JSX.Element {
  const [initState, setInitState] = useState<InitState>('loading');
  const [initError, setInitError] = useState<string>('');

  useEffect(() => {
    void bootstrapApp();
  }, []);

  async function bootstrapApp(): Promise<void> {
    try {
      Logger.info(TAG, 'Bootstrap start');

      // 1. Ensure hardware-backed database encryption key exists
      const keyExists = await KeyManager.isHardwareBacked('db_encryption_key').catch(() => false);
      if (!keyExists) {
        Logger.info(TAG, 'Generating new database key');
        await KeyManager.generateDatabaseKey();
      }

      // 2. Open and migrate the encrypted SQLCipher database
      await DatabaseManager.initialize();
      Logger.info(TAG, 'Database ready');

      // 3b. Wire concrete implementations into the DI container
      registerDependencies();

      // 3. Ensure local identity key pairs exist (signing + FCM ECDH)
      await IdentityManager.initialize();
      await IdentityManager.initializeFCMKey();
      Logger.info(TAG, 'Identity ready');

      // 4. Register FCM push notification handler
      await GuardianNotificationHandler.initialize();

      // 5. Subscribe to journey lifecycle events → persistent "Active Journey" notification
      await JourneyNotificationService.initialize();

      // 6. Record SOS locations as unsafe geofences; alert on re-entry
      await UnsafePlaceService.initialize();

      // 7. Start volume-button SOS trigger (Vol-Down + Vol-Up chord → emergency SOS)
      if (NativeModules.BackgroundTaskModule) {
        await (NativeModules.BackgroundTaskModule as { startVolumeSOSTrigger: () => Promise<void> })
          .startVolumeSOSTrigger()
          .catch(() => {});
      }

      // 8. BLE mesh — offline SOS beaconing + relay scanning
      await BleMeshOrchestrator.init().catch(() => {});

      Logger.info(TAG, 'Bootstrap complete');
      setInitState('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Startup failed';
      Logger.error(TAG, 'Bootstrap failed', { message });
      setInitError(message);
      setInitState('error');
    }
  }

  if (initState === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (initState === 'error') {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorTitle}>Unable to start GuardianCircle</Text>
        <Text style={styles.errorBody}>{initError}</Text>
        <Text style={styles.errorHint}>
          If this error persists, reinstalling the app may resolve it.
          Your alert contacts will still receive SMS even if the app cannot open.
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer>
                <Suspense
                  fallback={
                    <View style={styles.splash}>
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  }
                >
                  <AppNavigator />
                  <RootModalManager />
                </Suspense>
              </NavigationContainer>
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  errorHint: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
});
