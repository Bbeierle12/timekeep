import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { useReminders } from '../../hooks/useReminders';
import { useGeolocation } from '../../hooks/useGeolocation';
import PunchButton from '../../components/employee/PunchButton';
import TimeLog from '../../components/employee/TimeLog';
import EmployeeMenu from '../../components/employee/EmployeeMenu';
import Button from '../../components/ui/Button';
import LunchWarningModal from '../../components/employee/LunchWarningModal';
import WaiverModal from '../../components/employee/WaiverModal';
import AttestationModal from '../../components/employee/AttestationModal';
import BreakAckModal from '../../components/employee/BreakAckModal';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const {
    entries,
    settings,
    isLoading,
    isError,
    error,
    clockedIn,
    clockedOut,
    onLunch,
    lunchTaken,
    breaksTaken,
    getElapsedMinutes,
    getLunchDurationMinutes,
    punchAsync,
    refetch
  } = useTimeEntry();

  const { requestLocation } = useGeolocation();

  const reminders = useReminders({
    clockedIn,
    clockedOut,
    onLunch,
    lunchTaken,
    getElapsedMinutes,
    getLunchDurationMinutes,
    lunchMinimumMinutes: settings?.lunch_minimum_minutes ?? 30
  });

  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [breakModalNumber, setBreakModalNumber] = useState<1 | 2 | 3 | null>(null);

  const today = new Date();
  const elapsedMinutes = getElapsedMinutes();
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;
  const lunchDurationMinutes = getLunchDurationMinutes();

  // Check which breaks have been acknowledged
  const hasBreak1 = entries.some(
    (e) => e.action_type === 'BREAK_ACK_1' || e.action_type === 'BREAK_SKIP_1'
  );
  const hasBreak2 = entries.some(
    (e) => e.action_type === 'BREAK_ACK_2' || e.action_type === 'BREAK_SKIP_2'
  );
  const hasBreak3 = entries.some(
    (e) => e.action_type === 'BREAK_ACK_3' || e.action_type === 'BREAK_SKIP_3'
  );

  // Get the time when a break was acknowledged
  const getBreakTime = (breakNum: 1 | 2 | 3) => {
    const ackType = `BREAK_ACK_${breakNum}`;
    const skipType = `BREAK_SKIP_${breakNum}`;
    const entry = entries.find(
      (e) => e.action_type === ackType || e.action_type === skipType
    );
    return entry?.recorded_at;
  };

  const getStatusText = () => {
    if (!clockedIn) return 'Not clocked in';
    if (clockedOut) return 'Clocked out for the day';
    if (onLunch) return 'On lunch break';
    return `Working (${elapsedHours}h ${elapsedMins}m elapsed)`;
  };

  const handleTakeLunch = useCallback(async () => {
    reminders.dismissWarning(reminders.lunchWarningStage);
    try {
      const locationResult = await requestLocation();
      await punchAsync({
        actionType: 'LUNCH_START',
        recordedAt: new Date().toISOString(),
        gpsLatitude: locationResult.coords?.latitude,
        gpsLongitude: locationResult.coords?.longitude,
        gpsAccuracyMeters: locationResult.coords?.accuracy,
        gpsUnavailable: locationResult.status !== 'success'
      });
    } catch (err) {
      console.error('Failed to start lunch:', err);
    }
  }, [reminders, requestLocation, punchAsync]);

  const handleOpenWaiver = useCallback(() => {
    reminders.dismissWarning(reminders.lunchWarningStage);
    setShowWaiverModal(true);
  }, [reminders]);

  const handleWaiverSuccess = useCallback(() => {
    setShowWaiverModal(false);
    reminders.dismissWaiverPrompt();
    refetch();
  }, [reminders, refetch]);

  const handleAttestationSuccess = useCallback(() => {
    setShowAttestationModal(false);
    reminders.dismissAttestationPrompt();
    refetch();
  }, [reminders, refetch]);

  const handleBreakSuccess = useCallback(() => {
    setBreakModalNumber(null);
    refetch();
  }, [refetch]);

  // Show attestation modal if lunch was short and hasn't been dismissed
  const shouldShowAttestation = reminders.showAttestationPrompt && !showWaiverModal;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">TIMEKEEP</h1>
          <EmployeeMenu />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isError && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-red-200 font-medium">Unable to load today&apos;s data</p>
              <p className="text-red-300 text-sm">
                {error instanceof Error ? error.message : 'Please try again.'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Date and Time */}
        <div className="text-center">
          <p className="text-2xl font-semibold text-slate-100">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
          <p className="text-slate-400 mt-1">
            {format(today, 'h:mm a')}
          </p>
        </div>

        {/* Status */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-center text-slate-300">
            <span className="font-medium text-slate-100">STATUS: </span>
            {getStatusText()}
          </p>
        </div>

        {/* Lunch reminder banner (if approaching deadline) */}
        {reminders.lunchWarningStage && !reminders.showWaiverPrompt && (
          <div
            className={`rounded-xl p-4 border cursor-pointer transition-colors ${
              reminders.lunchWarningStage === 'stage3'
                ? 'bg-red-900/30 border-red-500/50 hover:bg-red-900/40'
                : reminders.lunchWarningStage === 'stage2'
                ? 'bg-amber-900/30 border-amber-500/50 hover:bg-amber-900/40'
                : 'bg-sky-900/30 border-sky-500/50 hover:bg-sky-900/40'
            }`}
            onClick={() => {}} // The modal will show automatically
          >
            <p className={`text-center font-medium ${
              reminders.lunchWarningStage === 'stage3'
                ? 'text-red-200'
                : reminders.lunchWarningStage === 'stage2'
                ? 'text-amber-200'
                : 'text-sky-200'
            }`}>
              {reminders.lunchWarningStage === 'stage3'
                ? 'Urgent: Take your lunch break or sign a waiver'
                : `Lunch break reminder - ${reminders.lunchDeadlineMinutes} min until required`}
            </p>
          </div>
        )}

        {/* Punch Buttons Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Clock In/Out */}
          {settings?.feature_clock_enabled !== false && (
            <>
              <PunchButton
                actionType="CLOCK_IN"
                label="Clock In"
                disabled={clockedIn}
                completed={clockedIn}
                completedTime={entries.find((e) => e.action_type === 'CLOCK_IN')?.recorded_at}
              />
              <PunchButton
                actionType="CLOCK_OUT"
                label="Clock Out"
                disabled={!clockedIn || clockedOut || onLunch}
                completed={clockedOut}
                completedTime={entries.find((e) => e.action_type === 'CLOCK_OUT')?.recorded_at}
              />
            </>
          )}

          {/* Lunch */}
          {settings?.feature_lunch_enabled !== false && (
            <>
              <PunchButton
                actionType="LUNCH_START"
                label="Lunch Start"
                disabled={!clockedIn || clockedOut || onLunch || lunchTaken}
                completed={onLunch || lunchTaken}
                completedTime={entries.find((e) => e.action_type === 'LUNCH_START')?.recorded_at}
              />
              <PunchButton
                actionType="LUNCH_END"
                label="Lunch End"
                disabled={!onLunch}
                completed={lunchTaken}
                completedTime={entries.find((e) => e.action_type === 'LUNCH_END')?.recorded_at}
              />
            </>
          )}
        </div>

        {/* Rest Breaks Section */}
        {settings?.feature_breaks_enabled !== false && clockedIn && !clockedOut && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-semibold text-slate-100">Rest Breaks</h2>
              <p className="text-xs text-slate-400 mt-1">
                10-minute paid breaks for every 4 hours worked
              </p>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {/* Break 1 */}
              <button
                type="button"
                onClick={() => !hasBreak1 && setBreakModalNumber(1)}
                disabled={hasBreak1 || onLunch}
                className={`rounded-lg p-4 text-center transition-colors ${
                  hasBreak1
                    ? 'bg-green-900/30 border border-green-500/50'
                    : onLunch
                    ? 'bg-slate-800/50 border border-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 border border-sky-500 hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <span className="block text-sm font-medium text-slate-100">Break 1</span>
                {hasBreak1 ? (
                  <span className="block text-xs text-green-400 mt-1">
                    {format(new Date(getBreakTime(1)!), 'h:mm a')}
                  </span>
                ) : (
                  <span className="block text-xs text-slate-400 mt-1">
                    {onLunch ? 'Waiting...' : 'Tap to record'}
                  </span>
                )}
              </button>

              {/* Break 2 */}
              <button
                type="button"
                onClick={() => !hasBreak2 && setBreakModalNumber(2)}
                disabled={hasBreak2 || onLunch || !hasBreak1}
                className={`rounded-lg p-4 text-center transition-colors ${
                  hasBreak2
                    ? 'bg-green-900/30 border border-green-500/50'
                    : !hasBreak1 || onLunch
                    ? 'bg-slate-800/50 border border-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 border border-sky-500 hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <span className="block text-sm font-medium text-slate-100">Break 2</span>
                {hasBreak2 ? (
                  <span className="block text-xs text-green-400 mt-1">
                    {format(new Date(getBreakTime(2)!), 'h:mm a')}
                  </span>
                ) : (
                  <span className="block text-xs text-slate-400 mt-1">
                    {!hasBreak1 ? 'Waiting...' : onLunch ? 'Waiting...' : 'Tap to record'}
                  </span>
                )}
              </button>

              {/* Break 3 */}
              <button
                type="button"
                onClick={() => !hasBreak3 && setBreakModalNumber(3)}
                disabled={hasBreak3 || onLunch || !hasBreak2}
                className={`rounded-lg p-4 text-center transition-colors ${
                  hasBreak3
                    ? 'bg-green-900/30 border border-green-500/50'
                    : !hasBreak2 || onLunch
                    ? 'bg-slate-800/50 border border-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 border border-sky-500 hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <span className="block text-sm font-medium text-slate-100">Break 3</span>
                {hasBreak3 ? (
                  <span className="block text-xs text-green-400 mt-1">
                    {format(new Date(getBreakTime(3)!), 'h:mm a')}
                  </span>
                ) : (
                  <span className="block text-xs text-slate-400 mt-1">
                    {!hasBreak2 ? 'Waiting...' : onLunch ? 'Waiting...' : 'Tap to record'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Today's Log */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="font-semibold text-slate-100">Today's Log</h2>
          </div>
          <TimeLog entries={entries} />
        </div>
      </main>

      {/* Lunch Warning Modal */}
      <LunchWarningModal
        isOpen={!!reminders.lunchWarningStage}
        stage={reminders.lunchWarningStage}
        minutesUntilDeadline={reminders.lunchDeadlineMinutes}
        onDismiss={() => reminders.dismissWarning(reminders.lunchWarningStage)}
        onTakeLunch={handleTakeLunch}
        onSignWaiver={reminders.lunchWarningStage === 'stage3' ? handleOpenWaiver : undefined}
      />

      {/* Waiver Modal */}
      <WaiverModal
        isOpen={showWaiverModal}
        waiverType="FIRST_MEAL_WAIVER"
        onClose={() => setShowWaiverModal(false)}
        onSuccess={handleWaiverSuccess}
      />

      {/* Attestation Modal (for short lunch) */}
      <AttestationModal
        isOpen={shouldShowAttestation || showAttestationModal}
        lunchDurationMinutes={lunchDurationMinutes}
        requiredMinutes={settings?.lunch_minimum_minutes ?? 30}
        onClose={() => {
          setShowAttestationModal(false);
          reminders.dismissAttestationPrompt();
        }}
        onSuccess={handleAttestationSuccess}
      />

      {/* Break Acknowledgment Modal */}
      {breakModalNumber && (
        <BreakAckModal
          isOpen={!!breakModalNumber}
          breakNumber={breakModalNumber}
          onClose={() => setBreakModalNumber(null)}
          onSuccess={handleBreakSuccess}
        />
      )}
    </div>
  );
}
