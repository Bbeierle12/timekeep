import { useState, useEffect, useCallback, useRef } from 'react';

export type ReminderStage = 'stage1' | 'stage2' | 'stage3' | null;
export type LunchWarningReason = 'approaching_deadline' | 'short_lunch' | null;

export type ReminderState = {
  lunchWarningStage: ReminderStage;
  lunchWarningReason: LunchWarningReason;
  lunchDeadlineMinutes: number;
  shortLunchMinutes: number;
  showWaiverPrompt: boolean;
  showAttestationPrompt: boolean;
};

type UseRemindersOptions = {
  clockedIn: boolean;
  clockedOut: boolean;
  onLunch: boolean;
  lunchTaken: boolean;
  getElapsedMinutes: () => number;
  getLunchDurationMinutes: () => number;
  lunchMinimumMinutes?: number;
};

const LUNCH_DEADLINE_HOURS = 5;
const LUNCH_DEADLINE_MINUTES = LUNCH_DEADLINE_HOURS * 60;

// Warning stages (minutes before lunch deadline)
const STAGE_1_THRESHOLD = 210; // 3.5 hours (90 min before deadline)
const STAGE_2_THRESHOLD = 240; // 4 hours (60 min before deadline)
const STAGE_3_THRESHOLD = 270; // 4.5 hours (30 min before deadline)

export function useReminders({
  clockedIn,
  clockedOut,
  onLunch,
  lunchTaken,
  getElapsedMinutes,
  getLunchDurationMinutes,
  lunchMinimumMinutes = 30
}: UseRemindersOptions) {
  const [state, setState] = useState<ReminderState>({
    lunchWarningStage: null,
    lunchWarningReason: null,
    lunchDeadlineMinutes: LUNCH_DEADLINE_MINUTES,
    shortLunchMinutes: 0,
    showWaiverPrompt: false,
    showAttestationPrompt: false
  });

  const dismissedStagesRef = useRef<Set<ReminderStage>>(new Set());
  const waiverDismissedRef = useRef(false);
  const attestationDismissedRef = useRef(false);

  const calculateLunchWarningStage = useCallback(
    (elapsedMinutes: number): ReminderStage => {
      // Don't show warnings if already on lunch, took lunch, or clocked out
      if (onLunch || lunchTaken || clockedOut || !clockedIn) {
        return null;
      }

      if (elapsedMinutes >= STAGE_3_THRESHOLD) return 'stage3';
      if (elapsedMinutes >= STAGE_2_THRESHOLD) return 'stage2';
      if (elapsedMinutes >= STAGE_1_THRESHOLD) return 'stage1';
      return null;
    },
    [onLunch, lunchTaken, clockedOut, clockedIn]
  );

  const updateReminders = useCallback(() => {
    if (!clockedIn) {
      setState((prev) => ({
        ...prev,
        lunchWarningStage: null,
        lunchWarningReason: null,
        showWaiverPrompt: false,
        showAttestationPrompt: false
      }));
      return;
    }

    const elapsedMinutes = getElapsedMinutes();
    const lunchDuration = getLunchDurationMinutes();

    // Calculate lunch warning stage
    let newStage = calculateLunchWarningStage(elapsedMinutes);

    // Don't show already dismissed stages
    if (newStage && dismissedStagesRef.current.has(newStage)) {
      // But if we've progressed to a new stage, show it
      const stageOrder: ReminderStage[] = ['stage1', 'stage2', 'stage3'];
      const currentIndex = stageOrder.indexOf(newStage);
      let showableStage: ReminderStage = null;

      for (let i = currentIndex; i >= 0; i--) {
        if (!dismissedStagesRef.current.has(stageOrder[i])) {
          showableStage = stageOrder[i];
          break;
        }
      }

      // If all lower stages dismissed but we're at a new higher stage
      if (!showableStage && currentIndex >= 0) {
        const highestDismissed = Math.max(
          ...Array.from(dismissedStagesRef.current)
            .map((s) => stageOrder.indexOf(s as ReminderStage))
            .filter((i) => i >= 0)
        );
        if (currentIndex > highestDismissed) {
          showableStage = newStage;
        }
      }

      newStage = showableStage;
    }

    // Check if lunch was too short (needs attestation)
    const shortLunchMinutes = lunchTaken
      ? Math.max(0, lunchMinimumMinutes - lunchDuration)
      : 0;

    // Determine waiver prompt (if approaching deadline without lunch)
    const showWaiver =
      !waiverDismissedRef.current &&
      !onLunch &&
      !lunchTaken &&
      elapsedMinutes >= STAGE_3_THRESHOLD &&
      !clockedOut;

    // Determine attestation prompt (if lunch was short)
    const showAttestation =
      !attestationDismissedRef.current &&
      lunchTaken &&
      lunchDuration < lunchMinimumMinutes;

    setState({
      lunchWarningStage: newStage,
      lunchWarningReason: newStage ? 'approaching_deadline' : null,
      lunchDeadlineMinutes: LUNCH_DEADLINE_MINUTES - elapsedMinutes,
      shortLunchMinutes,
      showWaiverPrompt: showWaiver,
      showAttestationPrompt: showAttestation
    });
  }, [
    clockedIn,
    clockedOut,
    onLunch,
    lunchTaken,
    getElapsedMinutes,
    getLunchDurationMinutes,
    calculateLunchWarningStage,
    lunchMinimumMinutes
  ]);

  // Update reminders periodically
  useEffect(() => {
    updateReminders();

    const interval = setInterval(updateReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [updateReminders]);

  const dismissWarning = useCallback((stage: ReminderStage) => {
    if (stage) {
      dismissedStagesRef.current.add(stage);
    }
    setState((prev) => ({
      ...prev,
      lunchWarningStage: null,
      lunchWarningReason: null
    }));
  }, []);

  const dismissWaiverPrompt = useCallback(() => {
    waiverDismissedRef.current = true;
    setState((prev) => ({ ...prev, showWaiverPrompt: false }));
  }, []);

  const dismissAttestationPrompt = useCallback(() => {
    attestationDismissedRef.current = true;
    setState((prev) => ({ ...prev, showAttestationPrompt: false }));
  }, []);

  const resetDismissals = useCallback(() => {
    dismissedStagesRef.current.clear();
    waiverDismissedRef.current = false;
    attestationDismissedRef.current = false;
  }, []);

  return {
    ...state,
    dismissWarning,
    dismissWaiverPrompt,
    dismissAttestationPrompt,
    resetDismissals,
    refresh: updateReminders
  };
}
