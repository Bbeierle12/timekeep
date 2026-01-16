import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { recordPunch, getTodayEntries, type TimeEntry } from '../services/api';
import { queuePunch } from '../services/offlineQueue';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

type ActionType = 'CLOCK_IN' | 'CLOCK_OUT' | 'LUNCH_START' | 'LUNCH_END' | 'BREAK_START' | 'BREAK_END';

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token, logout } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punching, setPunching] = useState<ActionType | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('Not Clocked In');

  const fetchEntries = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getTodayEntries(token);
      if (result.status === 'success' && result.data) {
        setEntries(result.data);
        updateStatus(result.data);
      }
    } catch {
      // Offline - entries will be empty
    }
  }, [token]);

  useEffect(() => {
    fetchEntries().finally(() => setLoading(false));
  }, [fetchEntries]);

  const updateStatus = (entries: TimeEntry[]) => {
    if (entries.length === 0) {
      setCurrentStatus('Not Clocked In');
      return;
    }

    const last = entries[entries.length - 1];
    switch (last.action_type) {
      case 'CLOCK_IN':
        setCurrentStatus('Clocked In');
        break;
      case 'CLOCK_OUT':
        setCurrentStatus('Clocked Out');
        break;
      case 'LUNCH_START':
        setCurrentStatus('On Lunch');
        break;
      case 'LUNCH_END':
        setCurrentStatus('Clocked In');
        break;
      case 'BREAK_START':
        setCurrentStatus('On Break');
        break;
      case 'BREAK_END':
        setCurrentStatus('Clocked In');
        break;
      default:
        setCurrentStatus('Unknown');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const handlePunch = async (actionType: ActionType) => {
    if (!token) return;

    setPunching(actionType);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords: { latitude: number; longitude: number } | undefined;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      const result = await recordPunch(token, actionType, coords);

      if (result.status === 'success') {
        await fetchEntries();
      } else {
        // Queue for later if offline
        await queuePunch({
          actionType,
          recordedAt: new Date().toISOString(),
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
        Alert.alert('Queued', 'Punch saved offline. Will sync when connected.');
        // Optimistically update UI
        const fakeEntry: TimeEntry = {
          id: 'pending-' + Date.now(),
          action_type: actionType,
          recorded_at: new Date().toISOString(),
          comment: null,
          resolved_address: null,
        };
        setEntries(prev => [...prev, fakeEntry]);
        updateStatus([...entries, fakeEntry]);
      }
    } catch (error) {
      // Offline - queue the punch
      await queuePunch({
        actionType,
        recordedAt: new Date().toISOString(),
      });
      Alert.alert('Queued', 'Punch saved offline. Will sync when connected.');
    } finally {
      setPunching(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'CLOCK_IN': return 'Clock In';
      case 'CLOCK_OUT': return 'Clock Out';
      case 'LUNCH_START': return 'Lunch Start';
      case 'LUNCH_END': return 'Lunch End';
      case 'BREAK_START': return 'Break Start';
      case 'BREAK_END': return 'Break End';
      default: return actionType;
    }
  };

  const canClockIn = currentStatus === 'Not Clocked In' || currentStatus === 'Clocked Out';
  const canClockOut = currentStatus === 'Clocked In';
  const canStartLunch = currentStatus === 'Clocked In';
  const canEndLunch = currentStatus === 'On Lunch';
  const canStartBreak = currentStatus === 'Clocked In';
  const canEndBreak = currentStatus === 'On Break';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name ?? 'Employee'}</Text>
            <Text style={styles.status}>{currentStatus}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.punchSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.punchGrid}>
            <TouchableOpacity
              style={[styles.punchButton, styles.clockInButton, !canClockIn && styles.buttonDisabled]}
              onPress={() => handlePunch('CLOCK_IN')}
              disabled={!canClockIn || punching !== null}
            >
              {punching === 'CLOCK_IN' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.punchIcon}>⏰</Text>
                  <Text style={styles.punchText}>Clock In</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.punchButton, styles.clockOutButton, !canClockOut && styles.buttonDisabled]}
              onPress={() => handlePunch('CLOCK_OUT')}
              disabled={!canClockOut || punching !== null}
            >
              {punching === 'CLOCK_OUT' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.punchIcon}>🚪</Text>
                  <Text style={styles.punchText}>Clock Out</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.punchButton, styles.lunchButton, !canStartLunch && !canEndLunch && styles.buttonDisabled]}
              onPress={() => handlePunch(canEndLunch ? 'LUNCH_END' : 'LUNCH_START')}
              disabled={(!canStartLunch && !canEndLunch) || punching !== null}
            >
              {(punching === 'LUNCH_START' || punching === 'LUNCH_END') ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.punchIcon}>🍽️</Text>
                  <Text style={styles.punchText}>{canEndLunch ? 'End Lunch' : 'Start Lunch'}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.punchButton, styles.breakButton, !canStartBreak && !canEndBreak && styles.buttonDisabled]}
              onPress={() => handlePunch(canEndBreak ? 'BREAK_END' : 'BREAK_START')}
              disabled={(!canStartBreak && !canEndBreak) || punching !== null}
            >
              {(punching === 'BREAK_START' || punching === 'BREAK_END') ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.punchIcon}>☕</Text>
                  <Text style={styles.punchText}>{canEndBreak ? 'End Break' : 'Start Break'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.entriesSection}>
          <View style={styles.entriesHeader}>
            <Text style={styles.sectionTitle}>Today's Entries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No entries for today</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryAction}>{getActionLabel(entry.action_type)}</Text>
                  {entry.resolved_address && (
                    <Text style={styles.entryAddress} numberOfLines={1}>
                      {entry.resolved_address}
                    </Text>
                  )}
                </View>
                <Text style={styles.entryTime}>{formatTime(entry.recorded_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f8fafc',
  },
  status: {
    fontSize: 16,
    color: '#3b82f6',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
  },
  punchSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  punchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  punchButton: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  clockInButton: {
    backgroundColor: '#166534',
  },
  clockOutButton: {
    backgroundColor: '#991b1b',
  },
  lunchButton: {
    backgroundColor: '#c2410c',
  },
  breakButton: {
    backgroundColor: '#1e40af',
  },
  punchIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  punchText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  entriesSection: {
    padding: 20,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
  entryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
  },
  entryAction: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
  entryAddress: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  entryTime: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});
