// Puntensysteem & standen-berekeningen — 1-op-1 overgenomen uit clausement.jsx.
// De server (submit_training / set_goal RPC's, zie supabase/migrations) is
// het uiteindelijke gezag over records en bonuspunten; deze functies zijn
// voor weergave (Standen/Recordboek) en voor de live-preview bij Invoeren.
import { addDays, todayISO } from "./util";

export function doelPerPeriode(trainings, start, end) {
  const totals = {};
  trainings
    .filter((t) => t.date >= start && (!end || t.date < end))
    .forEach((t) => {
      Object.entries(t.spelers || {}).forEach(([pid, vals]) => {
        totals[pid] = (totals[pid] || 0) + (Number(vals.doel) || 0);
      });
    });
  return totals;
}

export function computeStandings(players, trainings, periodStart, periodEnd) {
  const periodTrainings = trainings.filter((t) => t.date >= periodStart && (!periodEnd || t.date < periodEnd));

  const indiv = {};
  players.forEach((p) => (indiv[p.id] = { player: p, openingsspel: 0, doel: 0, wedstrijd: 0 }));

  periodTrainings.forEach((t) => {
    Object.entries(t.spelers || {}).forEach(([pid, vals]) => {
      if (!indiv[pid]) return;
      indiv[pid].openingsspel += Number(vals.openingsspel) || 0;
      indiv[pid].doel += Number(vals.doel) || 0;
      if (vals.wedstrijd === "gewonnen") indiv[pid].wedstrijd += 3;
    });
  });

  const indivList = Object.values(indiv)
    .map((r) => ({ ...r, totaal: r.openingsspel + r.doel + r.wedstrijd }))
    .sort((a, b) => b.totaal - a.totaal);

  return { indivList };
}

// Beste score die een speelster haalde tijdens een specifieke doel-toewijzing.
// Gebaseerd op assignmentId, die submit_training per score exact vastlegt —
// geen datumreeks-gok meer (die brak zodra een score voor een datum werd
// ingevoerd die niet chronologisch aansloot bij wanneer het doel gekozen was).
export function besteScoreVoorToewijzing(trainings, playerId, exercise, assignmentId) {
  if (!assignmentId) return null;
  const scores = trainings
    .map((t) => t.spelers?.[playerId])
    .filter((v) => v && v.assignmentId === assignmentId && v.doelRaw !== "" && v.doelRaw !== undefined && v.doelRaw !== null)
    .map((v) => Number(v.doelRaw));
  if (scores.length === 0) return null;
  return exercise.higherIsBetter ? Math.max(...scores) : Math.min(...scores);
}

// Chronologisch overzicht van alle doel-toewijzingen van een speler (afgerond + huidig), met beste score
export function doelGeschiedenisVoorSpeler(trainings, playerId, goalHistoryVoorSpeler, huidigDoel, exercises) {
  const alles = huidigDoel ? [...goalHistoryVoorSpeler, huidigDoel] : [...goalHistoryVoorSpeler];
  const gesorteerd = [...alles].sort((a, b) => (a.chosenAt < b.chosenAt ? -1 : 1));
  return gesorteerd.map((assignment, i) => {
    const ex = exercises.find((e) => e.id === assignment.exerciseId);
    const eindDatum = gesorteerd[i + 1] ? gesorteerd[i + 1].chosenAt : null;
    const beste = ex ? besteScoreVoorToewijzing(trainings, playerId, ex, assignment.assignmentId) : null;
    const aantal = trainings.filter((t) => t.spelers?.[playerId]?.assignmentId === assignment.assignmentId).length;
    return { assignment, ex, eindDatum, beste, aantal, actief: !eindDatum };
  });
}

// Hoeveel keer een speler haar HUIDIGE doel al geoefend heeft. Bepaalt of ze
// zelf mag wisselen (zie set_goal in Supabase — dit is dezelfde telling, hier
// alleen voor de UI; de server is het gezag).
export function aantalKeerGeoefend(trainings, playerId, doel) {
  if (!doel) return 0;
  return trainings.filter((t) => t.spelers?.[playerId]?.assignmentId === doel.assignmentId).length;
}

// Losse doel-scores van een speler binnen een periode-range (i.p.v. per
// toewijzing zoals doelGeschiedenisVoorSpeler) — voor het periode-scoped
// scoredetail op Standen. exerciseId staat direct op de score (vastgelegd
// door submit_training), dus geen toewijzing-per-datum-opzoeking meer nodig.
export function doelRegelsVoorPeriode(trainings, playerId, periodStart, periodEnd, exercises) {
  return trainings
    .filter((t) => t.date >= periodStart && (!periodEnd || t.date < periodEnd))
    .filter((t) => t.spelers?.[playerId]?.doel > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => {
      const speler = t.spelers[playerId];
      const ex = speler.exerciseId ? exercises.find((e) => e.id === speler.exerciseId) : null;
      return {
        date: t.date,
        doelRaw: speler.doelRaw,
        doel: speler.doel,
        exerciseName: ex?.name,
        metric: ex?.metric,
      };
    });
}

// Laat direct zien hoeveel punten een score gaat opleveren, nog vóórdat er is opgeslagen.
export function previewDoelPunten(pid, exercise, ruweWaarde, personalRecords, goals, cycleBonuses) {
  if (ruweWaarde === "" || ruweWaarde === undefined || ruweWaarde === null) return { punten: 0, tekst: "" };
  const waarde = Number(ruweWaarde);
  const key = `${pid}:${exercise.id}`;
  const vorige = personalRecords[key];
  if (vorige === undefined) {
    return { punten: 1, tekst: "+1 punt (eerste score bij dit doel)" };
  }
  const verbeterd = exercise.higherIsBetter ? waarde > vorige : waarde < vorige;
  if (!verbeterd) {
    return { punten: 1, tekst: `+1 punt (nog geen verbetering t.o.v. ${vorige})` };
  }
  const goal = goals[pid];
  const bonusAlGebruikt = goal && cycleBonuses[`${pid}:${goal.assignmentId}`];
  if (bonusAlGebruikt) {
    return { punten: 1, tekst: `+1 punt (record al verbeterd bij dit doel — bonus is al gebruikt)` };
  }
  return { punten: 2, tekst: `+2 punten (nieuw record! was ${vorige})` };
}

// Herinneringen (in-app, geen echte pushmelding mogelijk)
export function computeReminders({ trainings, periodStart, players, myName, goals }) {
  const list = [];
  if (trainings.length > 0) {
    const laatste = trainings.map((t) => t.date).sort().slice(-1)[0];
    const dagenSinds = daysBetweenSafe(laatste);
    if (dagenSinds > 7) list.push(`Al ${dagenSinds} dagen geen training ingevoerd.`);
  }
  const dagenPeriode = daysBetweenSafe(periodStart);
  if (dagenPeriode >= 56) list.push("Deze periode loopt al 8+ weken — tijd om af te ronden en te resetten.");

  const ikzelf = players.find((p) => p.name === myName);
  if (ikzelf) {
    const goal = goals[ikzelf.id];
    if (goal) {
      const aantal = aantalKeerGeoefend(trainings, ikzelf.id, goal);
      if (aantal >= 4) list.push(`Je hebt "${goal.exerciseName}" al ${aantal}x geoefend — kies bij Recordboek een nieuw doel!`);
    }
  }

  return list;
}

function daysBetweenSafe(dateStr) {
  return Math.round((new Date(todayISO()) - new Date(dateStr)) / 86400000);
}

export { addDays, todayISO };
