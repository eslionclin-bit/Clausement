"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { todayISO } from "@/lib/util";

const AppDataContext = createContext(null);

function reshapeTrainings(rows) {
  return (rows || []).map((t) => {
    const spelers = {};
    (t.training_scores || []).forEach((s) => {
      spelers[s.player_id] = {
        openingsspel: s.openingsspel,
        doel: s.doel,
        doelRaw: s.doel_raw === null || s.doel_raw === undefined ? "" : String(s.doel_raw),
        wedstrijd: s.wedstrijd || "",
        assignmentId: s.assignment_id || null,
        exerciseId: s.exercise_id || null,
      };
    });
    return {
      id: t.id,
      date: t.date,
      enteredBy: t.entered_by,
      enteredAt: t.entered_at,
      updatedBy: t.updated_by,
      updatedAt: t.updated_at,
      spelers,
    };
  });
}

function reshapeExercise(e) {
  return {
    id: e.id,
    cat: e.cat,
    station: e.station,
    name: e.name,
    metric: e.metric,
    higherIsBetter: e.higher_is_better,
    desc: e.description,
    isCustom: e.is_custom,
  };
}

export function AppDataProvider({ children }) {
  const { loggedIn, isTrainer, myName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [goals, setGoals] = useState({});
  const [goalHistory, setGoalHistory] = useState({});
  const [personalRecords, setPersonalRecords] = useState({});
  const [cycleBonuses, setCycleBonuses] = useState({});
  const [periodStart, setPeriodStart] = useState(todayISO());
  const [periodNumber, setPeriodNumber] = useState(1);
  const [periodHistory, setPeriodHistory] = useState([]);
  const [teamGoal, setTeamGoalState] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [rivalries, setRivalries] = useState([]);
  const [improvementCounts, setImprovementCounts] = useState({});
  const [attemptCounts, setAttemptCounts] = useState({});
  const [saving, setSaving] = useState(false);

  const refreshTimer = useRef(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase is nog niet geconfigureerd (zie .env.example).");
      setLoading(false);
      return;
    }
    try {
      const [
        playersRes,
        trainingsRes,
        exercisesRes,
        goalsRes,
        goalHistoryRes,
        recordsRes,
        bonusesRes,
        periodsRes,
        teamGoalRes,
        auditRes,
        rivalriesRes,
        improvementCountsRes,
        attemptCountsRes,
      ] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("trainings").select("*, training_scores(*)"),
        supabase.from("exercises").select("*").order("cat"),
        supabase.from("goals").select("*"),
        supabase.from("goal_history").select("*"),
        supabase.from("personal_records").select("*"),
        supabase.from("cycle_bonuses").select("*"),
        supabase.from("periods").select("*").order("number"),
        supabase.from("team_goal").select("*").maybeSingle(),
        isTrainer ? supabase.from("audit_log").select("*").order("at") : Promise.resolve({ data: [], error: null }),
        supabase.from("rivalries").select("*"),
        supabase.from("player_improvement_counts").select("*"),
        supabase.from("player_attempt_counts").select("*"),
      ]);

      const firstError = [
        playersRes,
        trainingsRes,
        exercisesRes,
        goalsRes,
        goalHistoryRes,
        recordsRes,
        bonusesRes,
        periodsRes,
        teamGoalRes,
        auditRes,
        rivalriesRes,
        improvementCountsRes,
        attemptCountsRes,
      ].find((r) => r.error);
      if (firstError) throw firstError.error;

      setPlayers(playersRes.data || []);
      setTrainings(reshapeTrainings(trainingsRes.data));
      setExercises((exercisesRes.data || []).map(reshapeExercise));

      const goalsMap = {};
      (goalsRes.data || []).forEach((g) => {
        if (!g.exercise_id) return;
        goalsMap[g.player_id] = {
          exerciseId: g.exercise_id,
          exerciseName: g.exercise_name,
          chosenAt: g.chosen_at,
          assignmentId: g.assignment_id,
        };
      });
      setGoals(goalsMap);

      const historyMap = {};
      (goalHistoryRes.data || [])
        .sort((a, b) => (a.chosen_at < b.chosen_at ? -1 : 1))
        .forEach((h) => {
          historyMap[h.player_id] = historyMap[h.player_id] || [];
          historyMap[h.player_id].push({
            exerciseId: h.exercise_id,
            exerciseName: h.exercise_name,
            chosenAt: h.chosen_at,
            assignmentId: h.assignment_id,
          });
        });
      setGoalHistory(historyMap);

      const recordsMap = {};
      (recordsRes.data || []).forEach((r) => {
        recordsMap[`${r.player_id}:${r.exercise_id}`] = Number(r.value);
      });
      setPersonalRecords(recordsMap);

      const bonusMap = {};
      (bonusesRes.data || []).forEach((b) => {
        bonusMap[`${b.player_id}:${b.assignment_id}`] = true;
      });
      setCycleBonuses(bonusMap);

      const periods = periodsRes.data || [];
      const active = periods.find((p) => !p.end_date);
      const history = periods.filter((p) => p.end_date);
      setPeriodStart(active ? active.start_date : todayISO());
      setPeriodNumber(active ? active.number : 1);
      setPeriodHistory(history.map((p) => ({ number: p.number, start: p.start_date, end: p.end_date })));

      setTeamGoalState(teamGoalRes.data ? teamGoalRes.data.target : null);
      setRivalries(
        (rivalriesRes.data || []).map((r) => ({
          id: r.id,
          exerciseId: r.exercise_id,
          playerA: r.player_a,
          playerAAssignmentId: r.player_a_assignment_id,
          playerB: r.player_b,
          playerBAssignmentId: r.player_b_assignment_id,
          proposedBy: r.proposed_by,
          status: r.status,
          createdAt: r.created_at,
          acceptedAt: r.accepted_at,
        }))
      );
      const improvementMap = {};
      (improvementCountsRes.data || []).forEach((i) => {
        improvementMap[i.player_id] = i.count;
      });
      setImprovementCounts(improvementMap);
      const attemptMap = {};
      (attemptCountsRes.data || []).forEach((a) => {
        attemptMap[a.player_id] = a.count;
      });
      setAttemptCounts(attemptMap);
      setAuditLog(
        (auditRes.data || []).map((l) => ({
          id: l.id,
          at: l.at,
          by: l.by_name,
          action: l.action,
          trainingDate: l.training_date,
          summary: l.summary || [],
          previousSummary: l.previous_summary,
        }))
      );

      setError(null);
    } catch (err) {
      setError(err?.message || "Onbekende fout bij het laden van de data.");
    } finally {
      setLoading(false);
    }
  }, [isTrainer]);

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [loggedIn, load]);

  // Live bijwerken als iemand anders (bv. een teamgenote op een ander toestel)
  // iets wijzigt — vervangt de gedeelde artifact-opslag door Supabase Realtime.
  useEffect(() => {
    if (!loggedIn || !supabaseConfigured) return;
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 400);
    };
    const channel = supabase
      .channel("clausement-live")
      .on("postgres_changes", { event: "*", schema: "public" }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loggedIn, load]);

  const allExercises = exercises;
  const customExercises = useMemo(() => exercises.filter((e) => e.isCustom), [exercises]);
  const teamGoalProgress = useMemo(() => {
    const verbeteringen = Object.values(improvementCounts).reduce((som, c) => som + c, 0);
    const pogingen = Object.values(attemptCounts).reduce((som, c) => som + c, 0);
    return verbeteringen + pogingen;
  }, [improvementCounts, attemptCounts]);

  const recordboek = useMemo(() => {
    const totals = {};
    players.forEach((p) => (totals[p.id] = { player: p, totaal: 0 }));
    trainings.forEach((t) => {
      Object.entries(t.spelers || {}).forEach(([pid, vals]) => {
        if (totals[pid]) totals[pid].totaal += Number(vals.doel) || 0;
      });
    });
    return Object.values(totals).sort((a, b) => b.totaal - a.totaal);
  }, [players, trainings]);

  async function submitTraining({ date, rows, trainingId }) {
    setSaving(true);
    const entries = players.map((p) => {
      const r = rows[p.id] || {};
      return {
        player_id: p.id,
        openingsspel: Number(r.openingsspel) || 0,
        doel_raw: r.doelRaw === "" || r.doelRaw === undefined || r.doelRaw === null ? null : Number(r.doelRaw),
        wedstrijd: r.wedstrijd || "",
      };
    });
    const { data, error: err } = await supabase.rpc("submit_training", {
      p_date: date,
      p_entries: entries,
      p_actor: myName,
    });
    setSaving(false);
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true, isNew: !trainingId, anyRecord: data?.any_record };
  }

  async function deleteTraining(id) {
    const { error: err } = await supabase.rpc("delete_training", { p_training_id: id, p_actor: myName });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function addPlayer(name) {
    const { error: err } = await supabase.from("players").insert({ name });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function removePlayer(id) {
    const { error: err } = await supabase.from("players").delete().eq("id", id);
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function setGoal(playerId, exerciseId) {
    const { data, error: err } = await supabase.rpc("set_goal", { p_player_id: playerId, p_exercise_id: exerciseId });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true, vervallen: Boolean(data?.vervallen) };
  }

  async function addCustomExercise(exercise) {
    const { error: err } = await supabase.from("exercises").insert({
      id: `custom-${crypto.randomUUID()}`,
      cat: exercise.cat,
      station: exercise.station,
      name: exercise.name,
      metric: exercise.metric,
      higher_is_better: exercise.higherIsBetter,
      description: exercise.desc,
      is_custom: true,
    });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function updateCustomExercise(exercise) {
    const { error: err } = await supabase
      .from("exercises")
      .update({
        cat: exercise.cat,
        station: exercise.station,
        name: exercise.name,
        metric: exercise.metric,
        higher_is_better: exercise.higherIsBetter,
        description: exercise.desc,
      })
      .eq("id", exercise.id);
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function deleteCustomExercise(id) {
    const { error: err } = await supabase.from("exercises").delete().eq("id", id);
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function setTeamGoal(value) {
    const { error: err } = await supabase.from("team_goal").update({ target: value }).eq("id", true);
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function resetPeriode(nextStartDate) {
    const { error: err } = await supabase.rpc("close_period", { p_actor: myName, p_next_start_date: nextStartDate });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function updatePeriodStart(startDate) {
    const { error: err } = await supabase.rpc("update_period_start", { p_actor: myName, p_start_date: startDate });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function startNewSeason(startDate) {
    const { error: err } = await supabase.rpc("start_new_season", { p_actor: myName, p_start_date: startDate });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function proposeRivalry(fromPlayerId, toPlayerId) {
    const { error: err } = await supabase.rpc("propose_rivalry", { p_from_player_id: fromPlayerId, p_to_player_id: toPlayerId });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function respondRivalry(rivalryId, playerId, accept) {
    const { error: err } = await supabase.rpc("respond_rivalry", { p_rivalry_id: rivalryId, p_player_id: playerId, p_accept: accept });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  async function endRivalry(rivalryId, playerId) {
    const { error: err } = await supabase.rpc("end_rivalry", { p_rivalry_id: rivalryId, p_player_id: playerId });
    if (err) return { ok: false, message: err.message };
    await load();
    return { ok: true };
  }

  function buildBackupString() {
    return JSON.stringify(
      {
        version: 8,
        exportedAt: new Date().toISOString(),
        players,
        trainings,
        periodStart,
        periodNumber,
        periodHistory,
        goals,
        auditLog,
        personalRecords,
        cycleBonuses,
        goalHistory,
        customExercises,
        teamGoal,
      },
      null,
      2
    );
  }

  const value = {
    loading,
    error,
    players,
    trainings,
    exercises: allExercises,
    customExercises,
    goals,
    goalHistory,
    personalRecords,
    cycleBonuses,
    periodStart,
    periodNumber,
    periodHistory,
    teamGoal,
    auditLog,
    rivalries,
    improvementCounts,
    attemptCounts,
    teamGoalProgress,
    recordboek,
    saving,
    refresh: load,
    submitTraining,
    deleteTraining,
    addPlayer,
    removePlayer,
    setGoal,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    setTeamGoal,
    resetPeriode,
    updatePeriodStart,
    startNewSeason,
    proposeRivalry,
    respondRivalry,
    endRivalry,
    buildBackupString,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
