/**
 * Cockpit preview — dev-only route for verifying primitive fidelity vs. the
 * Claude Design handoff prototype. Mounts the iOS device frame around the
 * Shift screen and lays out individual primitives below.
 *
 * NOTE: only registered in routes when `import.meta.env.DEV` is true.
 */
import { CK } from '../../components/cockpit/tokens';
import {
  CKLabel,
  CKValue,
  CKPanel,
  CKChip,
  CKBtn,
  CKDigit,
} from '../../components/cockpit/primitives';
import { MealScale } from '../../components/cockpit/MealScale';
import { IOSDevice } from '../../components/cockpit/IOSDevice';
import EmployeeCockpitApp from '../employee/EmployeeCockpitApp';

export default function CockpitPreview() {
  const now = new Date();
  const clockIn = new Date(now.getTime() - 4.5 * 3_600_000);

  return (
    <div className="ck min-h-screen ck-grid ck-scan" style={{ background: CK.bg }}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className="mb-8">
          <CKLabel tone="amber">DEV / COCKPIT-PREVIEW</CKLabel>
          <h1
            className="ck-display text-3xl mt-2"
            style={{ color: CK.text }}
          >
            Cockpit primitives & Shift screen
          </h1>
          <p className="text-xs mt-1" style={{ color: CK.dim }}>
            Pixel-fidelity check against design/handoff/tk-cockpit-*.jsx — toggle
            the NORMAL/CAUTION/ALARM scenarios on the device to verify states.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col items-center gap-4">
            <IOSDevice width={390} height={844}>
              <div className="relative w-full h-full overflow-hidden">
                <EmployeeCockpitApp />
              </div>
            </IOSDevice>
            <div
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ color: CK.dim }}
            >
              TIMEKEEP / EMP TERMINAL · NAV: SHIFT ▸ HISTORY ▸ PAY ▸ OFF ▸ ME
            </div>
          </div>

          <div className="space-y-6">
            <CKPanel label="PRIMITIVES" value="6 COMPONENTS">
              <div className="p-4 space-y-6">
                <section>
                  <CKLabel>LABELS</CKLabel>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <CKLabel>DEFAULT</CKLabel>
                    <CKLabel tone="text">TEXT</CKLabel>
                    <CKLabel tone="amber">AMBER</CKLabel>
                    <CKLabel tone="alarm">ALARM</CKLabel>
                  </div>
                </section>

                <section>
                  <CKLabel>VALUES</CKLabel>
                  <div className="mt-2 grid grid-cols-4 gap-3 items-end">
                    <CKValue size="sm">042</CKValue>
                    <CKValue size="md">042</CKValue>
                    <CKValue size="lg" tone="amber">
                      042
                    </CKValue>
                    <CKValue size="xl" tone="alarm">
                      042
                    </CKValue>
                  </div>
                </section>

                <section>
                  <CKLabel>CHIPS</CKLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CKChip tone="dim">IDLE</CKChip>
                    <CKChip tone="text">REC</CKChip>
                    <CKChip tone="amber">DUE</CKChip>
                    <CKChip tone="alarm">OVERDUE</CKChip>
                    <CKChip tone="ok">CLEAN</CKChip>
                  </div>
                </section>

                <section>
                  <CKLabel>BUTTONS</CKLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CKBtn variant="ghost">GHOST</CKBtn>
                    <CKBtn variant="primary">PRIMARY</CKBtn>
                    <CKBtn variant="alarm">ALARM</CKBtn>
                    <CKBtn variant="quiet">QUIET</CKBtn>
                    <CKBtn variant="primary" disabled>
                      DISABLED
                    </CKBtn>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <CKBtn size="sm">SM</CKBtn>
                    <CKBtn size="md">MD</CKBtn>
                    <CKBtn size="lg">LG</CKBtn>
                  </div>
                </section>

                <section>
                  <CKLabel>DIGIT</CKLabel>
                  <div className="mt-2 flex items-baseline gap-3">
                    <CKDigit value="04" size={56} />
                    <span className="text-2xl ck-num" style={{ color: CK.dim }}>
                      :
                    </span>
                    <CKDigit value="32" size={56} tone="amber" />
                    <span className="text-2xl ck-num" style={{ color: CK.dim }}>
                      :
                    </span>
                    <CKDigit value="17" size={56} tone="alarm" />
                  </div>
                </section>
              </div>
            </CKPanel>

            <CKPanel label="MEAL SCALE — HORIZONTAL">
              <div className="p-6">
                <MealScale
                  clockIn={clockIn}
                  now={now}
                  orientation="horizontal"
                />
              </div>
            </CKPanel>

            <CKPanel label="MEAL SCALE — VERTICAL">
              <div className="p-6 flex justify-center">
                <MealScale clockIn={clockIn} now={now} height={300} />
              </div>
            </CKPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
