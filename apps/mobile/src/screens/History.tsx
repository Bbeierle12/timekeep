import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getEntryHistory, type TimeEntry } from '../services/api';

type GroupedEntries = {
  date: string;
  entries: TimeEntry[];
};

export default function HistoryScreen() {
  const { token } = useAuth();
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    if (!token) return;

    try {
      const result = await getEntryHistory(token, pageNum);

      if (result.status === 'success' && result.data) {
        const grouped = groupEntriesByDate(result.data.entries);

        if (reset) {
          setGroupedEntries(grouped);
        } else {
          setGroupedEntries(prev => mergeGroupedEntries(prev, grouped));
        }

        setHasMore(result.data.hasMore);
        setPage(pageNum);
      }
    } catch {
      // Offline
    }
  }, [token]);

  useEffect(() => {
    fetchEntries(1, true).finally(() => setLoading(false));
  }, [fetchEntries]);

  const groupEntriesByDate = (entries: TimeEntry[]): GroupedEntries[] => {
    const groups: Record<string, TimeEntry[]> = {};

    for (const entry of entries) {
      const date = new Date(entry.recorded_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    }

    return Object.entries(groups).map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ),
    }));
  };

  const mergeGroupedEntries = (existing: GroupedEntries[], incoming: GroupedEntries[]): GroupedEntries[] => {
    const merged = [...existing];

    for (const group of incoming) {
      const existingIndex = merged.findIndex(g => g.date === group.date);
      if (existingIndex >= 0) {
        // Merge entries, avoiding duplicates
        const existingIds = new Set(merged[existingIndex].entries.map(e => e.id));
        const newEntries = group.entries.filter(e => !existingIds.has(e.id));
        merged[existingIndex].entries = [
          ...merged[existingIndex].entries,
          ...newEntries,
        ].sort((a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );
      } else {
        merged.push(group);
      }
    }

    return merged;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchEntries(page + 1);
    }
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

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CLOCK_IN': return '#22c55e';
      case 'CLOCK_OUT': return '#ef4444';
      case 'LUNCH_START':
      case 'LUNCH_END': return '#f97316';
      case 'BREAK_START':
      case 'BREAK_END': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const renderEntry = (entry: TimeEntry) => (
    <View key={entry.id} style={styles.entryRow}>
      <View style={[styles.indicator, { backgroundColor: getActionColor(entry.action_type) }]} />
      <View style={styles.entryContent}>
        <Text style={styles.entryAction}>{getActionLabel(entry.action_type)}</Text>
        {entry.resolved_address && (
          <Text style={styles.entryAddress} numberOfLines={1}>
            {entry.resolved_address}
          </Text>
        )}
        {entry.comment && (
          <Text style={styles.entryComment} numberOfLines={2}>
            {entry.comment}
          </Text>
        )}
      </View>
      <Text style={styles.entryTime}>{formatTime(entry.recorded_at)}</Text>
    </View>
  );

  const renderDateGroup = ({ item }: { item: GroupedEntries }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{item.date}</Text>
      <View style={styles.entriesCard}>
        {item.entries.map(renderEntry)}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedEntries}
        renderItem={renderDateGroup}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No time entries found</Text>
            <Text style={styles.emptySubtext}>Your clock in/out history will appear here</Text>
          </View>
        }
        contentContainerStyle={groupedEntries.length === 0 ? styles.emptyContainer : styles.listContent}
      />
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
  listContent: {
    padding: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entriesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryAction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f8fafc',
  },
  entryAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  entryComment: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  entryTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 12,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});
