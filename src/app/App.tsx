import React, { useEffect, useState, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, NativeModules, Share, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator, linking } from '@core/navigation/AppNavigator';
import { RootModalManager } from './RootModalManager';
import { DatabaseManager } from '@core/storage/database/DatabaseManager';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { KeyManager } from '@core/crypto/KeyManager';
import { GuardianNotificationHandler } from '@features/guardian/infrastructure/GuardianNotificationHandler';
import { JourneyNotificationService } from '@features/journey/infrastructure/JourneyNotificationService';
import { UnsafePlaceService } from '@features/geofence/infrastructure/UnsafePlaceService';
import { BleMeshOrchestrator } from '@features/bluetooth-mesh/application/BleMeshOrchestrator';
import { FCMMessageHandler } from '@core/fcm/FCMMessageHandler';
import { ThemeProvider } from '@core/theme/ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { EventBus } from '@core/events/EventBus';
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
  const [diagInfo, setDiagInfo] = useState<string>('');

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

      // 3. Wire concrete implementations into the DI container
      registerDependencies();

      // 3b. Ensure local identity key pairs exist (signing + FCM ECDH)
      await IdentityManager.initialize();
      await IdentityManager.initializeFCMKey();
      Logger.info(TAG, 'Identity ready');

      // 4-9. Non-critical services — run in parallel so startup is not blocked by any one
      await Promise.allSettled([
        // 4. Register FCM push notification handler
        GuardianNotificationHandler.initialize().catch((err: unknown) => {
          Logger.warn(TAG, 'GuardianNotificationHandler init failed', { err });
        }),

        // 5. Subscribe to journey lifecycle events → persistent "Active Journey" notification
        JourneyNotificationService.initialize().catch((err: unknown) => {
          Logger.warn(TAG, 'JourneyNotificationService init failed', { err });
        }),

        // 6. Record SOS locations as unsafe geofences; alert on re-entry
        UnsafePlaceService.initialize().catch((err: unknown) => {
          Logger.warn(TAG, 'UnsafePlaceService init failed', { err });
        }),

        // 7. Start volume-button SOS trigger (Vol-Down + Vol-Up chord → emergency SOS)
        NativeModules.BackgroundTaskModule
          ? (NativeModules.BackgroundTaskModule as { startVolumeSOSTrigger: () => Promise<void> })
              .startVolumeSOSTrigger()
              .catch((err: unknown) => {
                Logger.warn(TAG, 'Volume SOS trigger init failed', { err });
                EventBus.emit('system:capability_degraded', {
                  capability: 'volume_sos',
                  reason: err instanceof Error ? err.message : 'Volume SOS unavailable',
                });
              })
          : Promise.resolve(),

        // 8. BLE mesh — offline SOS beaconing + relay scanning
        BleMeshOrchestrator.init().catch((err: unknown) => {
          Logger.warn(TAG, 'BLE mesh init failed', { err });
          EventBus.emit('system:capability_degraded', {
            capability: 'ble',
            reason: err instanceof Error ? err.message : 'BLE mesh unavailable',
          });
        }),

        // 9. FCM message handler — guardian acknowledgements and deep link routing
        Promise.resolve(FCMMessageHandler.register()),
      ]);

      Logger.info(TAG, 'Bootstrap complete');
      setInitState('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Startup failed';
      Logger.error(TAG, 'Bootstrap failed', { message });
      setDiagInfo(`Error: ${message}\nTime: ${new Date().toISOString()}`);
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
        <Text style={styles.errorBody}>
          Something went wrong during startup. Please force-close the app and reopen it.
          If the problem continues, reinstalling may help.
        </Text>
        <Text style={styles.errorHint}>
          Your guardians can still receive SMS alerts from your device directly.
        </Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => { void Share.share({ message: diagInfo, title: 'GuardianCircle diagnostic info' }); }}
          accessibilityRole="button"
          accessibilityLabel="Copy diagnostic info"
          accessibilityHint="Copies error details to clipboard so you can share them for support"
        >
          <Text style={styles.copyButtonText}>Copy diagnostic info</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer linking={linking}>
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
    marginBottom: 12,
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  copyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#757575',
  },
  copyButtonText: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
  },
});
