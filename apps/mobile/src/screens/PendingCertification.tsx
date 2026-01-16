import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { certifyDay } from '../services/api';

export default function PendingCertificationScreen() {
  const { token, pendingCertification, setPendingCertification } = useAuth();
  const [certifying, setCertifying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!pendingCertification) {
    return null;
  }

  const { workDate, entries } = pendingCertification;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  const handleCertify = async () => {
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please confirm that the hours shown are accurate.');
      return;
    }

    if (!token) return;

    setCertifying(true);
    try {
      const result = await certifyDay(token, workDate);

      if (result.status === 'success') {
        setPendingCertification(null);
      } else {
        Alert.alert('Error', result.message ?? 'Unable to certify. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Unable to connect. Please try again.');
    } finally {
      setCertifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Certification</Text>
          <Text style={styles.subtitle}>Please review and certify your time entries</Text>
        </View>

        <View style={styles.dateCard}>
          <Text style={styles.dateLabel}>Work Date</Text>
          <Text style={styles.dateValue}>{formatDate(workDate)}</Text>
        </View>

        <View style={styles.entriesSection}>
          <Text style={styles.sectionTitle}>Time Entries</Text>
          {entries.length === 0 ? (
            <View style={styles.noEntries}>
              <Text style={styles.noEntriesText}>No entries recorded</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <Text style={styles.entryAction}>{getActionLabel(entry.action_type)}</Text>
                <Text style={styles.entryTime}>{formatTime(entry.recorded_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.certificationSection}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
              {confirmed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.certificationText}>
              I certify that the time entries shown above are accurate and complete for this work day.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.certifyButton, (!confirmed || certifying) && styles.buttonDisabled]}
            onPress={handleCertify}
            disabled={!confirmed || certifying}
          >
            {certifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.certifyButtonText}>Certify & Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            By certifying, you acknowledge that falsification of time records may result in disciplinary action.
          </Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  dateCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  entriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  noEntries: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noEntriesText: {
    color: '#64748b',
    fontSize: 16,
  },
  entryRow: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryAction: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
  },
  entryTime: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  certificationSection: {
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  certificationText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
  },
  certifyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#1e40af',
    opacity: 0.6,
  },
  certifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
