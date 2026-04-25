/**
 * EmployeeCockpitApp — composes the cockpit employee surface with a
 * lightweight in-memory router (Login → Shift → History/Pay/TimeOff/Profile).
 *
 * Lives entirely in the device-frame viewport: the active screen owns the
 * full-screen layout. The bottom-nav inside ShiftCockpit fires `onOpenScreen`
 * which we map to a screen state here.
 *
 * This component is the canonical preview entry; it does not yet replace
 * the existing `/employee` dashboard.
 */
import { useState } from 'react';
import ShiftCockpit from './ShiftCockpit';
import LoginCockpit from './LoginCockpit';
import ShiftHistoryCockpit from './ShiftHistoryCockpit';
import PayCockpit from './PayCockpit';
import TimeOffCockpit from './TimeOffCockpit';
import ProfileCockpit from './ProfileCockpit';
import type { ScenarioKey } from '../../components/cockpit/mockScenarios';

type Screen = 'login' | 'shift' | 'history' | 'pay' | 'timeoff' | 'profile';

export interface EmployeeCockpitAppProps {
  /** Skip login when true (default: true for previews). */
  skipLogin?: boolean;
  scenarioKey?: ScenarioKey;
  showScenarioPicker?: boolean;
}

export default function EmployeeCockpitApp({
  skipLogin = true,
  scenarioKey,
  showScenarioPicker = true,
}: EmployeeCockpitAppProps) {
  const [screen, setScreen] = useState<Screen>(skipLogin ? 'shift' : 'login');

  const goShift = () => setScreen('shift');

  switch (screen) {
    case 'login':
      return <LoginCockpit onAuthed={goShift} />;
    case 'history':
      return <ShiftHistoryCockpit onBack={goShift} />;
    case 'pay':
      return (
        <PayCockpit
          onBack={goShift}
          onCertify={() => {
            // Certification flow lives inside the Shift attestation sheet;
            // route the user back to Shift where they can open it from the form tile.
            goShift();
          }}
        />
      );
    case 'timeoff':
      return <TimeOffCockpit onBack={goShift} />;
    case 'profile':
      return (
        <ProfileCockpit
          onBack={goShift}
          onLogout={() => setScreen('login')}
        />
      );
    case 'shift':
    default:
      return (
        <ShiftCockpit
          scenarioKey={scenarioKey}
          showScenarioPicker={showScenarioPicker}
          onOpenScreen={(key) => setScreen(key)}
        />
      );
  }
}
