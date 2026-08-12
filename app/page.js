"use client";

import { useEffect, useState } from "react";
import { COLORS, LOGO_SRC } from "@/lib/constants";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { computeReminders } from "@/lib/logic";
import LoginScreen from "@/components/LoginScreen";
import StandenView from "@/components/StandenView";
import RecordboekView from "@/components/RecordboekView";
import InvoerView from "@/components/InvoerView";
import BeheerView from "@/components/BeheerView";
import { Banner, TabButton, usePrefersReducedMotion } from "@/components/shared";
import { LoadingLane } from "@/components/BowlingAnimations";

export default function Page() {
  const auth = useAuth();
  const [view, setView] = useState("standen");
  const [jumpToDate, setJumpToDate] = useState(null);
  const [invoerDirty, setInvoerDirty] = useState(false);

  useEffect(() => {
    if (auth.isTrainer) setView("beheer");
  }, [auth.isTrainer]);

  function editTraining(date) {
    setView("invoeren");
    setJumpToDate({ date, token: Date.now() });
  }

  if (!supabaseConfigured) {
    return (
      <Screen>
        <Banner tone="yellow">
          Supabase is nog niet geconfigureerd. Vul <code>NEXT_PUBLIC_SUPABASE_URL</code> en{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in (zie .env.example) en herstart de app.
        </Banner>
      </Screen>
    );
  }

  if (auth.loading) {
    return <LoadingScreen />;
  }

  if (!auth.loggedIn) {
    return <LoginGate />;
  }

  return (
    <AppShell
      view={view}
      setView={setView}
      jumpToDate={jumpToDate}
      onEditTraining={editTraining}
      invoerDirty={invoerDirty}
      onInvoerDirtyChange={setInvoerDirty}
    />
  );
}

function LoginGate() {
  // Op het inlogscherm is er nog geen (of nog geen volledige) sessie, dus
  // AppDataContext laadt hier bewust niets — alleen spelernamen zijn zonder
  // sessie leesbaar (zie players_select policy), die halen we hier apart op.
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    supabase
      .from("players")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (active) setPlayers(data || []);
      });
    return () => {
      active = false;
    };
  }, []);

  return <LoginScreen players={players} />;
}

function AppShell({ view, setView, jumpToDate, onEditTraining, invoerDirty, onInvoerDirtyChange }) {
  const { myName, isTrainer, signOut } = useAuth();
  const data = useAppData();

  const ONOPGESLAGEN_WAARSCHUWING =
    "Je hebt nog niet-opgeslagen wijzigingen bij Invoeren. Wil je toch doorgaan? Je invoer gaat dan verloren.";

  function switchView(key) {
    if (view === "invoeren" && invoerDirty && key !== "invoeren" && !confirm(ONOPGESLAGEN_WAARSCHUWING)) return;
    setView(key);
  }

  function handleSignOut() {
    if (view === "invoeren" && invoerDirty && !confirm(ONOPGESLAGEN_WAARSCHUWING)) return;
    signOut();
  }

  if (data.loading) return <LoadingScreen />;

  if (data.error) {
    return (
      <Screen>
        <Banner tone="yellow">Data kon niet geladen worden: {data.error}</Banner>
      </Screen>
    );
  }

  const reminders = computeReminders({
    trainings: data.trainings,
    periodStart: data.periodStart,
    players: data.players,
    myName,
    goals: data.goals,
    isTrainer,
    auditLog: data.auditLog,
  });

  const mijnSpeler = data.players.find((p) => p.name === myName);
  const inkomendeUitdagingen = mijnSpeler
    ? data.rivalries.filter(
        (r) => (r.playerA === mijnSpeler.id || r.playerB === mijnSpeler.id) && r.status === "voorgesteld" && r.proposedBy !== mijnSpeler.id
      ).length
    : 0;

  const tabs = [
    { key: "standen", label: "Standen" },
    { key: "invoeren", label: "Invoeren" },
    { key: "recordboek", label: "Recordboek", badge: inkomendeUitdagingen },
  ];
  if (isTrainer) tabs.push({ key: "beheer", label: "Beheer" });
  const activeView = view === "beheer" && !isTrainer ? "standen" : view;

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: COLORS.paper }}>
      <div className="header-gradient" style={{ padding: "16px 16px 0" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: COLORS.white, borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO_SRC} alt="VCH" style={{ height: 22, width: "auto", display: "block" }} />
              </div>
              <span className="cy-black" style={{ color: COLORS.white, fontSize: 18, letterSpacing: 0.3 }}>HET CLAUSEMENT</span>
            </div>
            <button
              onClick={handleSignOut}
              className="cy-regular"
              style={{ background: "none", border: "none", color: COLORS.lightBlue, fontSize: 11, cursor: "pointer" }}
            >
              {myName}{isTrainer ? " · trainer" : ""} · wissel
            </button>
          </div>
          <div style={{ display: "flex" }}>
            {tabs.map((t) => (
              <TabButton key={t.key} active={activeView === t.key} onClick={() => switchView(t.key)} badge={t.badge}>
                {t.label}
              </TabButton>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        {reminders.map((r, i) => (
          <Banner key={i} tone="yellow">{r}</Banner>
        ))}

        {activeView === "standen" && (
          <StandenView
            players={data.players}
            trainings={data.trainings}
            periodStart={data.periodStart}
            periodNumber={data.periodNumber}
            periodHistory={data.periodHistory}
            exercises={data.exercises}
          />
        )}
        {activeView === "recordboek" && (
          <RecordboekView
            recordboek={data.recordboek}
            players={data.players}
            myName={myName}
            goals={data.goals}
            goalHistory={data.goalHistory}
            onSetGoal={data.setGoal}
            trainings={data.trainings}
            personalRecords={data.personalRecords}
            cycleBonuses={data.cycleBonuses}
            exercises={data.exercises}
            customExercises={data.customExercises}
            onAddCustomExercise={data.addCustomExercise}
            onUpdateCustomExercise={data.updateCustomExercise}
            onDeleteCustomExercise={data.deleteCustomExercise}
            rivalries={data.rivalries}
            onProposeRivalry={data.proposeRivalry}
            onRespondRivalry={data.respondRivalry}
            onEndRivalry={data.endRivalry}
            improvementCounts={data.improvementCounts}
            teamGoal={data.teamGoal}
            teamGoalProgress={data.teamGoalProgress}
            isTrainer={isTrainer}
          />
        )}
        {activeView === "invoeren" && (
          <InvoerView
            players={data.players}
            trainings={data.trainings}
            myName={myName}
            goals={data.goals}
            personalRecords={data.personalRecords}
            cycleBonuses={data.cycleBonuses}
            exercises={data.exercises}
            onSubmit={data.submitTraining}
            onDelete={data.deleteTraining}
            saving={data.saving}
            isTrainer={isTrainer}
            jumpToDate={jumpToDate}
            onDirtyChange={onInvoerDirtyChange}
          />
        )}
        {activeView === "beheer" && isTrainer && (
          <BeheerView
            players={data.players}
            onAddPlayer={data.addPlayer}
            onRemovePlayer={data.removePlayer}
            periodNumber={data.periodNumber}
            periodStart={data.periodStart}
            onResetPeriode={data.resetPeriode}
            onUpdatePeriodStart={data.updatePeriodStart}
            auditLog={data.auditLog}
            onEditTraining={onEditTraining}
            onStartNewSeason={data.startNewSeason}
            onExportBackup={data.buildBackupString}
            teamGoal={data.teamGoal}
            onSetTeamGoal={data.setTeamGoal}
            exercises={data.exercises}
            customExercises={data.customExercises}
            onAddCustomExercise={data.addCustomExercise}
            onUpdateCustomExercise={data.updateCustomExercise}
            onDeleteCustomExercise={data.deleteCustomExercise}
            myName={myName}
            goals={data.goals}
            trainings={data.trainings}
            onSetGoal={data.setGoal}
          />
        )}
      </div>

      <div className="stripe" style={{ height: 3, marginTop: 12 }} />
    </div>
  );
}

function LoadingScreen() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div style={{ minHeight: "100vh", background: COLORS.blue, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ background: COLORS.white, borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="VCH" style={{ height: 30, width: "auto", display: "block" }} />
      </div>
      <div className="cy-black" style={{ color: COLORS.white, fontSize: 15, letterSpacing: 1 }}>HET CLAUSEMENT</div>
      <LoadingLane animated={!reducedMotion} />
    </div>
  );
}

function Screen({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 420 }}>{children}</div>
    </div>
  );
}
