#!/usr/bin/env node
// Eenmalig migratiescript: zet een backup-export uit de oude Claude-artifact
// versie van Het Clausement (Beheer -> Backup -> "Kopieer backup"/"Download
// bestand") om naar de nieuwe Supabase-database.
//
// Gebruik (na het draaien van de migraties in supabase/migrations/):
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/import-legacy-backup.mjs pad/naar/clausement-backup.json
//
// Let op: dit script gebruikt de service-role key (omzeilt RLS) en is
// bedoeld voor een EENMALIGE import in een verse database — geen doorlopend
// herstelmechanisme. Draai het dus niet twee keer op dezelfde database.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const [, , filePath] = process.argv;
if (!filePath) {
  console.error("Gebruik: node scripts/import-legacy-backup.mjs pad/naar/backup.json");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY als environment-variabelen.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const backup = JSON.parse(readFileSync(filePath, "utf-8"));

async function main() {
  console.log(`Backup van ${backup.exportedAt || "onbekende datum"} — ${backup.players?.length || 0} speelsters, ${backup.trainings?.length || 0} trainingen.`);

  // 1) Spelers — hergebruik bestaande rij als de naam al bestaat, anders aanmaken.
  const playerIdMap = new Map();
  for (const p of backup.players || []) {
    const { data: existing } = await supabase.from("players").select("id").eq("name", p.name).maybeSingle();
    if (existing) {
      playerIdMap.set(p.id, existing.id);
      continue;
    }
    const { data, error } = await supabase.from("players").insert({ name: p.name }).select("id").single();
    if (error) throw new Error(`Speler "${p.name}" aanmaken mislukt: ${error.message}`);
    playerIdMap.set(p.id, data.id);
  }
  console.log(`✓ ${playerIdMap.size} speelsters gekoppeld/aangemaakt.`);

  // 2) Oefeningen — basisoefeningen hebben in het artifact numerieke id's die
  // 1-op-1 overeenkomen met 'base-<n>' in de nieuwe database. Eigen
  // oefeningen worden als nieuwe custom-rijen aangemaakt.
  const exerciseIdMap = new Map();
  const { data: baseExercises } = await supabase.from("exercises").select("id").eq("is_custom", false);
  const knownBaseIds = new Set((baseExercises || []).map((e) => e.id));
  for (const ex of backup.customExercises || []) {
    const candidateBaseId = `base-${ex.id}`;
    if (knownBaseIds.has(candidateBaseId)) {
      exerciseIdMap.set(ex.id, candidateBaseId);
      continue;
    }
    const newId = `custom-${randomUUID()}`;
    const { error } = await supabase.from("exercises").insert({
      id: newId,
      cat: ex.cat,
      station: ex.station,
      name: ex.name,
      metric: ex.metric,
      higher_is_better: ex.higherIsBetter,
      description: ex.desc,
      is_custom: true,
    });
    if (error) throw new Error(`Eigen oefening "${ex.name}" aanmaken mislukt: ${error.message}`);
    exerciseIdMap.set(ex.id, newId);
  }
  // Alle overige (basis) oefening-id's die ergens in doelen/records voorkomen
  // koppelen we direct via 'base-<n>', ook als ze niet in customExercises stonden.
  function resolveExerciseId(oldId) {
    if (exerciseIdMap.has(oldId)) return exerciseIdMap.get(oldId);
    const candidate = `base-${oldId}`;
    if (knownBaseIds.has(candidate)) {
      exerciseIdMap.set(oldId, candidate);
      return candidate;
    }
    return null;
  }
  console.log(`✓ Oefeningen gekoppeld (${exerciseIdMap.size} custom/gemapt).`);

  // 3) Assignment-id's (kort, niet-UUID in het artifact) omzetten naar echte UUID's.
  const assignmentIdMap = new Map();
  function resolveAssignmentId(oldId) {
    if (!oldId) return null;
    if (!assignmentIdMap.has(oldId)) assignmentIdMap.set(oldId, randomUUID());
    return assignmentIdMap.get(oldId);
  }

  // 4) Periodes — vervangt de door de migratie voorgeschoten periode 1.
  await supabase.from("periods").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const p of backup.periodHistory || []) {
    const { error } = await supabase.from("periods").insert({ number: p.number, start_date: p.start, end_date: p.end });
    if (error) throw new Error(`Periode ${p.number} aanmaken mislukt: ${error.message}`);
  }
  const { error: periodErr } = await supabase
    .from("periods")
    .insert({ number: backup.periodNumber || 1, start_date: backup.periodStart, end_date: null });
  if (periodErr) throw new Error(`Actieve periode aanmaken mislukt: ${periodErr.message}`);
  console.log("✓ Periodes gemigreerd.");

  // 5) Teamdoel
  if (backup.teamGoal !== undefined) {
    await supabase.from("team_goal").update({ target: backup.teamGoal }).eq("id", true);
  }

  // 6) Trainingen + scores
  let trainingCount = 0;
  for (const t of backup.trainings || []) {
    const { data: training, error: tErr } = await supabase
      .from("trainings")
      .insert({ date: t.date, entered_by: t.enteredBy, entered_at: t.enteredAt, updated_by: t.updatedBy, updated_at: t.updatedAt })
      .select("id")
      .single();
    if (tErr) {
      console.warn(`⚠ Training van ${t.date} overslaan: ${tErr.message}`);
      continue;
    }
    const rows = Object.entries(t.spelers || {})
      .map(([oldPid, vals]) => {
        const newPid = playerIdMap.get(oldPid);
        if (!newPid) return null;
        return {
          training_id: training.id,
          player_id: newPid,
          openingsspel: Number(vals.openingsspel) || 0,
          doel: Number(vals.doel) || 0,
          doel_raw: vals.doelRaw === "" || vals.doelRaw === undefined || vals.doelRaw === null ? null : Number(vals.doelRaw),
          wedstrijd: vals.wedstrijd || "",
        };
      })
      .filter(Boolean);
    if (rows.length > 0) {
      const { error: sErr } = await supabase.from("training_scores").insert(rows);
      if (sErr) console.warn(`⚠ Scores van ${t.date} niet volledig gemigreerd: ${sErr.message}`);
    }
    trainingCount += 1;
  }
  console.log(`✓ ${trainingCount} trainingen gemigreerd.`);

  // 7) Actuele doelen
  for (const [oldPid, g] of Object.entries(backup.goals || {})) {
    if (!g) continue;
    const newPid = playerIdMap.get(oldPid);
    const newExId = resolveExerciseId(g.exerciseId);
    if (!newPid || !newExId) continue;
    const { error } = await supabase.from("goals").insert({
      player_id: newPid,
      exercise_id: newExId,
      exercise_name: g.exerciseName,
      chosen_at: g.chosenAt,
      assignment_id: resolveAssignmentId(g.assignmentId),
    });
    if (error) console.warn(`⚠ Huidig doel voor speler ${oldPid} niet gemigreerd: ${error.message}`);
  }

  // 8) Doel-geschiedenis
  for (const [oldPid, list] of Object.entries(backup.goalHistory || {})) {
    const newPid = playerIdMap.get(oldPid);
    if (!newPid) continue;
    const sorted = [...(list || [])].sort((a, b) => (a.chosenAt < b.chosenAt ? -1 : 1));
    const huidig = backup.goals?.[oldPid];
    const volledig = huidig ? [...sorted, huidig] : sorted;
    for (let i = 0; i < sorted.length; i++) {
      const assignment = sorted[i];
      const newExId = resolveExerciseId(assignment.exerciseId);
      if (!newExId) continue;
      const eindDatum = volledig[i + 1] ? volledig[i + 1].chosenAt : backup.exportedAt?.slice(0, 10) || assignment.chosenAt;
      const { error } = await supabase.from("goal_history").insert({
        player_id: newPid,
        exercise_id: newExId,
        exercise_name: assignment.exerciseName,
        chosen_at: assignment.chosenAt,
        assignment_id: resolveAssignmentId(assignment.assignmentId),
        ended_at: eindDatum,
      });
      if (error) console.warn(`⚠ Doel-geschiedenis voor speler ${oldPid} niet volledig gemigreerd: ${error.message}`);
    }
  }
  console.log("✓ Doelen en doel-geschiedenis gemigreerd.");

  // 9) Persoonlijke records
  const recordRows = [];
  for (const [key, value] of Object.entries(backup.personalRecords || {})) {
    const [oldPid, oldExId] = key.split(":");
    const newPid = playerIdMap.get(oldPid);
    const newExId = resolveExerciseId(oldExId);
    if (!newPid || !newExId) continue;
    recordRows.push({ player_id: newPid, exercise_id: newExId, value: Number(value) });
  }
  if (recordRows.length > 0) {
    const { error } = await supabase.from("personal_records").insert(recordRows);
    if (error) console.warn(`⚠ Persoonlijke records niet volledig gemigreerd: ${error.message}`);
  }
  console.log(`✓ ${recordRows.length} persoonlijke records gemigreerd.`);

  // 10) Cyclusbonussen
  const bonusRows = [];
  for (const key of Object.keys(backup.cycleBonuses || {})) {
    const [oldPid, oldAssignmentId] = key.split(":");
    const newPid = playerIdMap.get(oldPid);
    if (!newPid) continue;
    bonusRows.push({ player_id: newPid, assignment_id: resolveAssignmentId(oldAssignmentId) });
  }
  if (bonusRows.length > 0) {
    const { error } = await supabase.from("cycle_bonuses").insert(bonusRows);
    if (error) console.warn(`⚠ Cyclusbonussen niet volledig gemigreerd: ${error.message}`);
  }

  // 11) Logboek
  const auditRows = (backup.auditLog || []).map((l) => ({
    by_name: l.by,
    action: l.action,
    training_date: l.trainingDate,
    summary: l.summary || [],
    previous_summary: l.previousSummary || null,
    at: l.at,
  }));
  if (auditRows.length > 0) {
    const { error } = await supabase.from("audit_log").insert(auditRows);
    if (error) console.warn(`⚠ Logboek niet volledig gemigreerd: ${error.message}`);
  }
  console.log(`✓ ${auditRows.length} logboekregels gemigreerd.`);

  console.log("\nKlaar. Vergeet niet: de trainer-pincode uit het artifact is NIET meegenomen —");
  console.log("maak in het Supabase-dashboard een echt account aan en zet het e-mailadres in de 'trainers' tabel.");
}

main().catch((err) => {
  console.error("Migratie mislukt:", err);
  process.exit(1);
});
