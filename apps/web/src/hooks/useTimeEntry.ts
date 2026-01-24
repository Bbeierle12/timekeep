import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchToday, recordPunch, type PunchInput, type TodayResponse, type ActionType } from '../services/timeEntries';

export function useTimeEntry() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ['today'],
    queryFn: () => fetchToday(),
    enabled: isAuthenticated,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const punchMutation = useMutation({
    mutationFn: (punch: PunchInput) => recordPunch(punch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
    }
  });

  const entries = todayQuery.data?.entries ?? [];
  const summary = todayQuery.data?.summary ?? null;
  const settings = todayQuery.data?.settings;
  const reminders = todayQuery.data?.reminders ?? [];

  // Determine current state based on entries
  const hasAction = (action: ActionType) =>
    entries.some((e) => e.action_type === action);

  const clockedIn = hasAction('CLOCK_IN');
  const clockedOut = hasAction('CLOCK_OUT');
  const onLunch = hasAction('LUNCH_START') && !hasAction('LUNCH_END');
  const lunchTaken = hasAction('LUNCH_START') && hasAction('LUNCH_END');

  const breaksTaken = [
    hasAction('BREAK_ACK_1') || hasAction('BREAK_SKIP_1'),
    hasAction('BREAK_ACK_2') || hasAction('BREAK_SKIP_2'),
    hasAction('BREAK_ACK_3') || hasAction('BREAK_SKIP_3')
  ].filter(Boolean).length;

  const getElapsedMinutes = (): number => {
    const clockIn = entries.find((e) => e.action_type === 'CLOCK_IN');
    if (!clockIn) return 0;
    const start = new Date(clockIn.recorded_at).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 60000);
  };

  const getLunchDurationMinutes = (): number => {
    const lunchStart = entries.find((e) => e.action_type === 'LUNCH_START');
    const lunchEnd = entries.find((e) => e.action_type === 'LUNCH_END');
    if (!lunchStart) return 0;
    const start = new Date(lunchStart.recorded_at).getTime();
    const end = lunchEnd ? new Date(lunchEnd.recorded_at).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  };

  return {
    entries,
    summary,
    settings,
    reminders,
    isLoading: todayQuery.isLoading,
    isError: todayQuery.isError,
    error: todayQuery.error,
    refetch: todayQuery.refetch,

    // State helpers
    clockedIn,
    clockedOut,
    onLunch,
    lunchTaken,
    breaksTaken,
    getElapsedMinutes,
    getLunchDurationMinutes,

    // Actions
    punch: punchMutation.mutate,
    punchAsync: punchMutation.mutateAsync,
    isPunching: punchMutation.isPending,
    punchError: punchMutation.error
  };
}
