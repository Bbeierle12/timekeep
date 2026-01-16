import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/services/pushNotifications';
import { registerPushToken } from './src/services/api';
import { flushQueuedPunches } from './src/services/offlineQueue';
import { Platform } from 'react-native';

function getPlatformLabel() {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function AppContent() {
  const { token } = useAuth();

  useEffect(() => {
    async function initialize() {
      try {
        // Register for push notifications
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await registerPushToken(pushToken, getPlatformLabel());
        }

        // Flush any queued punches when we have a token
        if (token) {
          await flushQueuedPunches(token);
        }
      } catch {
        // Silent fail for initialization errors
      }
    }

    initialize();
  }, [token]);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
