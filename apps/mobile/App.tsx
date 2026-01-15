import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync } from './src/services/pushNotifications';
import { registerPushToken } from './src/services/api';
import { flushQueuedPunches } from './src/services/offlineQueue';

function getPlatformLabel() {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export default function App() {
  const [status, setStatus] = useState('Initializing');

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await registerPushToken(token, getPlatformLabel());
        }
        await flushQueuedPunches();
        if (isMounted) {
          setStatus('Ready');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('Offline');
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Timekeep Mobile</Text>
        <Text style={styles.subtitle}>Employee clock in/out and compliance</Text>
        <Text style={styles.status}>Status: {status}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 16,
    width: '90%'
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '600'
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8
  },
  status: {
    color: '#38bdf8',
    marginTop: 16
  }
});
