/* App shell — Cockpit only. Routes employee screens (login → shift → history/pay/timeoff/profile)
   and admin panes. */

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "role": "employee",
  "scenario": "atRisk",
  "adminPane": "dashboard",
  "empScreen": "shift"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = useTweaks(DEFAULTS);
  const [scenarioKey, setScenarioKey] = React.useState(tweaks.scenario);
  const [adminPane, setAdminPane] = React.useState(tweaks.adminPane);
  const [empScreen, setEmpScreen] = React.useState(tweaks.empScreen || "shift");

  React.useEffect(() => setScenarioKey(tweaks.scenario), [tweaks.scenario]);
  React.useEffect(() => setAdminPane(tweaks.adminPane), [tweaks.adminPane]);
  React.useEffect(() => { if (tweaks.empScreen) setEmpScreen(tweaks.empScreen); }, [tweaks.empScreen]);

  const [sheet, setSheet] = React.useState(null);
  const [breakNum, setBreakNum] = React.useState(1);

  const scenario = TK.scenarios[scenarioKey] || TK.scenarios.compliant;

  const goToScreen = (k) => { setEmpScreen(k); setTweaks({ empScreen: k }); };

  const employeeContent = (() => {
    if (empScreen === "login")    return <CKLoginView onAuthed={() => goToScreen("shift")}/>;
    if (empScreen === "history")  return <CKShiftHistoryView onBack={() => goToScreen("shift")}/>;
    if (empScreen === "pay")      return <CKPayView onBack={() => goToScreen("shift")} onCertify={() => setSheet("attest")}/>;
    if (empScreen === "timeoff")  return <CKTimeOffView onBack={() => goToScreen("shift")}/>;
    if (empScreen === "profile")  return <CKProfileView onBack={() => goToScreen("shift")} onLogout={() => goToScreen("login")}/>;
    return (
      <CKEmployeeView
        scenario={scenario}
        scenarioKey={scenarioKey}
        setScenarioKey={(k) => { setScenarioKey(k); setTweaks({ scenario: k }); }}
        onShowWarning={() => setSheet("warning")}
        onShowBreak={(n) => { setBreakNum(n); setSheet("break"); }}
        onShowWaiver={() => setSheet("waiver")}
        onShowAttestation={() => setSheet("attest")}
        onOpenScreen={goToScreen}
        onPunch={() => {}}
      />
    );
  })();

  const employeeNode = (
    <>
      {employeeContent}
      <LunchWarningSheet open={sheet === "warning"} scenario={scenario}
        onClose={() => setSheet(null)} onTakeLunch={() => setSheet(null)} onWaive={() => setSheet("waiver")}/>
      <BreakAckSheet open={sheet === "break"} breakNum={breakNum} onClose={() => setSheet(null)} onConfirm={() => setSheet(null)}/>
      <WaiverSheet open={sheet === "waiver"} onClose={() => setSheet(null)} onSign={() => setSheet(null)}/>
      <AttestationSheet open={sheet === "attest"} onClose={() => setSheet(null)} onSubmit={() => setSheet(null)}/>
    </>
  );

  return (
    <div className="min-h-screen w-full">
      {tweaks.role === "employee" ? (
        <div className="min-h-screen flex items-start justify-center py-8 px-4" style={{ background: "#000" }}>
          <div className="flex flex-col items-center gap-4">
            <IOSDevice width={390} height={844}>
              <div className="relative w-full h-full overflow-hidden">{employeeNode}</div>
            </IOSDevice>
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "#8a857a", fontFamily: "'IBM Plex Mono', monospace" }}>
              TIMEKEEP / EMP TERMINAL · {empScreen.toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        <CKAdminView pane={adminPane} setPane={(p) => { setAdminPane(p); setTweaks({ adminPane: p }); }}/>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Role">
          <TweakRadio value={tweaks.role} onChange={(v) => setTweaks({ role: v })}
            options={[["employee","Employee · iOS"],["admin","Admin · Desktop"]]}/>
        </TweakSection>

        {tweaks.role === "employee" && (
          <>
            <TweakSection title="Screen">
              <TweakRadio value={empScreen} onChange={goToScreen}
                options={[
                  ["login","Login / boot"],
                  ["shift","Shift (active)"],
                  ["history","Shift history"],
                  ["pay","Pay summary"],
                  ["timeoff","Time-off request"],
                  ["profile","Profile"],
                ]}/>
            </TweakSection>
            <TweakSection title="Compliance state">
              <TweakRadio value={tweaks.scenario} onChange={(v) => setTweaks({ scenario: v })}
                options={[["compliant","On track"],["atRisk","At risk"],["violation","Past deadline"]]}/>
            </TweakSection>
          </>
        )}

        {tweaks.role === "admin" && (
          <TweakSection title="Pane">
            <TweakRadio value={tweaks.adminPane} onChange={(v) => setTweaks({ adminPane: v })}
              options={[
                ["dashboard","Dashboard"],
                ["team","Team board"],
                ["employee","Employee file"],
                ["entries","Time entries"],
                ["schedule","Schedule"],
                ["payroll","Payroll"],
                ["audit","Audit log"],
                ["settings","Settings"],
              ]}/>
          </TweakSection>
        )}
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
