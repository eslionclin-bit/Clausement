"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/constants";
import { previewDoelPunten } from "@/lib/logic";
import { daysBetween, todayISO } from "@/lib/util";
import { Banner, Empty, Field, MiniNum, TextButton, inputStyle, usePrefersReducedMotion } from "./shared";
import { StrikeCelebration } from "./BowlingAnimations";

export default function InvoerView({ players, trainings, myName, goals, personalRecords, cycleBonuses, exercises, onSubmit, onDelete, saving, isTrainer, jumpToDate, onDirtyChange }) {
  const emptyRows = () => Object.fromEntries(players.map((p) => [p.id, { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "" }]));

  function defaultOpenSet() {
    const mijnSpeler = players.find((p) => p.name === myName);
    return mijnSpeler ? new Set([mijnSpeler.id]) : new Set();
  }

  // Spelers mogen een bestaande training nog wijzigen/verwijderen tot en met
  // de dag ná de invoerdag zelf (dus vandaag of gisteren ingevoerd); de
  // trainer altijd. Wordt ook server-side afgedwongen (submit_training/
  // delete_training) — dit is puur om vooraf een duidelijke read-only
  // weergave te tonen i.p.v. pas bij het opslaan te weigeren.
  function binnenBewerkVenster(training) {
    if (isTrainer) return true;
    if (!training?.enteredAt) return false;
    return daysBetween(training.enteredAt.slice(0, 10), todayISO()) <= 1;
  }

  const [editingId, setEditingId] = useState(null);
  const [editingMeta, setEditingMeta] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState(emptyRows);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showStrike, setShowStrike] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [showHistorie, setShowHistorie] = useState(false);
  const [openMonths, setOpenMonths] = useState(() => new Set([todayISO().slice(0, 7)]));
  const [openPlayers, setOpenPlayers] = useState(defaultOpenSet);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Waarschuw bij het sluiten/verversen van het tabblad zolang er nog
  // niet-opgeslagen invoer staat.
  useEffect(() => {
    function handler(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function confirmDiscard() {
    if (!isDirty) return true;
    return confirm("Je hebt nog niet-opgeslagen wijzigingen bij Invoeren. Wil je toch doorgaan? Je invoer gaat dan verloren.");
  }

  function togglePlayer(pid) {
    setOpenPlayers((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }

  function summarizeRow(row, ex) {
    const parts = [];
    if (row?.openingsspel > 0) parts.push(`openingsspel ${row.openingsspel}`);
    if (ex && row?.doelRaw !== "" && row?.doelRaw !== undefined) parts.push(`doel ${row.doelRaw}`);
    if (row?.wedstrijd) parts.push(row.wedstrijd);
    return parts.length > 0 ? parts.join(" · ") : "nog niets ingevuld";
  }

  useEffect(() => {
    if (editingId) return;
    setRows((prev) => {
      const next = { ...prev };
      players.forEach((p) => {
        if (!next[p.id]) next[p.id] = { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "" };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  useEffect(() => {
    if (editingId || isDirty) return;
    const bestaande = trainings.find((t) => t.date === date);
    if (bestaande) {
      setEditingId(bestaande.id);
      setEditingMeta({ enteredBy: bestaande.enteredBy, enteredAt: bestaande.enteredAt });
      const filled = emptyRows();
      Object.entries(bestaande.spelers || {}).forEach(([pid, vals]) => {
        filled[pid] = { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "", ...vals };
      });
      setRows(filled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainings]);

  function updateRow(pid, field, value) {
    setRows((prev) => ({ ...prev, [pid]: { ...prev[pid], [field]: value } }));
    setIsDirty(true);
  }

  function startEdit(training) {
    if (!confirmDiscard()) return;
    setEditingId(training.id);
    setEditingMeta({ enteredBy: training.enteredBy, enteredAt: training.enteredAt });
    setDate(training.date);
    const filled = emptyRows();
    Object.entries(training.spelers || {}).forEach(([pid, vals]) => {
      filled[pid] = { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "", ...vals };
    });
    setRows(filled);
    setIsDirty(false);
    setShowHistorie(false);
    setOpenPlayers(defaultOpenSet());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingMeta(null);
    setDate(todayISO());
    setRows(emptyRows());
    setIsDirty(false);
    setOpenPlayers(defaultOpenSet());
  }

  function requestCancelEdit() {
    if (!confirmDiscard()) return;
    cancelEdit();
  }

  function handleDateChange(nieuweDatum) {
    if (nieuweDatum > todayISO()) return;
    if (nieuweDatum === date) return;
    if (!confirmDiscard()) return;
    setDate(nieuweDatum);
    const bestaande = trainings.find((t) => t.date === nieuweDatum);
    if (bestaande) {
      setEditingId(bestaande.id);
      setEditingMeta({ enteredBy: bestaande.enteredBy, enteredAt: bestaande.enteredAt });
      const filled = emptyRows();
      Object.entries(bestaande.spelers || {}).forEach(([pid, vals]) => {
        filled[pid] = { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "", ...vals };
      });
      setRows(filled);
    } else {
      setEditingId(null);
      setEditingMeta(null);
      setRows(emptyRows());
    }
    setIsDirty(false);
    setOpenPlayers(defaultOpenSet());
  }

  // Vanuit Beheer ("bewerk scores" bij een logboekregel) spring je hierheen
  // met een specifieke datum al klaarstaand.
  useEffect(() => {
    if (!jumpToDate) return;
    handleDateChange(jumpToDate.date);
    setShowHistorie(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToDate]);

  async function handleSave() {
    setErrorMsg("");
    const result = await onSubmit({ date, rows, trainingId: editingId });
    if (!result.ok) {
      setErrorMsg(result.message || "Opslaan is niet gelukt.");
      return;
    }
    const basis = editingId ? "Training bijgewerkt" : "Training opgeslagen";
    setSavedMsg(result.anyRecord ? `${basis} — nieuw record! 🏆 ✓` : `${basis} ✓`);
    if (!reducedMotion) {
      setShowStrike(true);
      setTimeout(() => setShowStrike(false), 2800);
    }
    cancelEdit();
    setTimeout(() => setSavedMsg(""), !reducedMotion ? 3200 : 2500);
  }

  async function handleDelete(id) {
    if (!confirm("Deze training verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
    const result = await onDelete(id);
    if (!result.ok) setErrorMsg(result.message || "Verwijderen is niet gelukt.");
  }

  const sortedTrainings = [...trainings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const bewerkbaarNu = !editingId || binnenBewerkVenster(editingMeta);

  return (
    <div style={{ paddingBottom: 84 }}>
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: COLORS.paper, borderTop: "1px solid #e2e2ea", padding: "10px 16px", boxShadow: "0 -2px 10px rgba(0,0,0,.08)", zIndex: 40 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={handleSave}
            disabled={saving || players.length === 0 || !bewerkbaarNu}
            className="cy-black"
            style={{ width: "100%", background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "14px 8px", fontSize: 15, cursor: players.length === 0 || !bewerkbaarNu ? "not-allowed" : "pointer", opacity: players.length === 0 || !bewerkbaarNu ? 0.5 : 1 }}
          >
            {saving ? "OPSLAAN…" : !bewerkbaarNu ? "ALLEEN TRAINER KAN DIT NOG WIJZIGEN" : editingId ? "WIJZIGING OPSLAAN" : "TRAINING OPSLAAN"}
          </button>
          {savedMsg && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
              <div className="cy-medium" style={{ color: COLORS.blue, fontSize: 13 }}>{savedMsg}</div>
            </div>
          )}
        </div>
      </div>
      {showStrike && <StrikeCelebration />}
      {editingId && !bewerkbaarNu && (
        <Banner tone="yellow">
          Deze training is niet meer op dezelfde dag ingevoerd, dus kan je 'm als speler niet meer wijzigen —
          vraag de trainer. Je ziet de ingevoerde waarden hieronder wel ter controle.{" "}
          <TextButton onClick={requestCancelEdit} style={{ color: "inherit", textDecoration: "underline" }}>sluiten</TextButton>
        </Banner>
      )}
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}

      <Field label="Datum">
        <input type="date" value={date} max={todayISO()} onChange={(e) => handleDateChange(e.target.value)} style={inputStyle} />
      </Field>

      <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, margin: "18px 0 8px" }}>PUNTEN PER SPEELSTER</div>
      <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 10, lineHeight: 1.5 }}>
        Openingsspel: plaatsingspunten. Doel:
        vul de score van vandaag in bij het gekozen doel — de app bepaalt zelf of het een record is
        (1 punt voor poging, +1 extra bij een verbeterd record). Wedstrijd: heeft ze het partijtje
        vanavond gewonnen of verloren?
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...players]
          .sort((a, b) => {
            if (a.name === myName) return -1;
            if (b.name === myName) return 1;
            const mijnSpelerObj = players.find((p) => p.name === myName);
            const mijnExerciseId = mijnSpelerObj ? goals[mijnSpelerObj.id]?.exerciseId : null;
            if (mijnExerciseId) {
              const aZelfdeDoel = goals[a.id]?.exerciseId === mijnExerciseId;
              const bZelfdeDoel = goals[b.id]?.exerciseId === mijnExerciseId;
              if (aZelfdeDoel && !bZelfdeDoel) return -1;
              if (bZelfdeDoel && !aZelfdeDoel) return 1;
            }
            return 0;
          })
          .map((p) => {
            const goal = goals[p.id];
            const ex = goal ? exercises.find((e) => e.id === goal.exerciseId) : null;
            const open = openPlayers.has(p.id);
            return (
              <div key={p.id} style={{ background: COLORS.white, borderRadius: 6, padding: "10px 12px", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                <div
                  onClick={() => togglePlayer(p.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer" }}
                >
                  <div>
                    <div className="cy-medium" style={{ fontSize: 13.5 }}>{p.name}</div>
                    {!open && (
                      <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>
                        {summarizeRow(rows[p.id], ex)}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "#bbb", fontSize: 11, flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
                </div>

                {open && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                      <MiniNum label="Openingsspel" value={rows[p.id]?.openingsspel ?? 0} onChange={(v) => updateRow(p.id, "openingsspel", v)} warnAbove={15} />
                      <div style={{ flex: 2 }}>
                        <div className="cy-regular" style={{ fontSize: 10, color: "#6b6b6b", marginBottom: 2 }}>
                          {ex ? `Score — ${ex.metric}` : "Doel (geen doel gekozen)"}
                          {ex && personalRecords[`${p.id}:${ex.id}`] !== undefined && (
                            <span style={{ color: COLORS.blue }}> · vorige: {personalRecords[`${p.id}:${ex.id}`]}</span>
                          )}
                        </div>
                        <input
                          type="number"
                          disabled={!ex}
                          placeholder={ex ? "0" : "—"}
                          value={rows[p.id]?.doelRaw ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateRow(p.id, "doelRaw", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px", fontSize: 13, textAlign: "center", opacity: ex ? 1 : 0.5, background: ex ? COLORS.white : "#f2f2f2" }}
                        />
                      </div>
                    </div>
                    {ex && <div className="cy-regular" style={{ fontSize: 10, color: "#6b6b6b", marginBottom: 6 }}>Doel: {ex.name}</div>}
                    {ex && rows[p.id]?.doelRaw !== "" && rows[p.id]?.doelRaw !== undefined && (
                      <div className="cy-medium" style={{ fontSize: 11, marginBottom: 6, color: previewDoelPunten(p.id, ex, rows[p.id].doelRaw, personalRecords, goals, cycleBonuses).punten > 1 ? "#2e8b57" : COLORS.blue }}>
                        {previewDoelPunten(p.id, ex, rows[p.id].doelRaw, personalRecords, goals, cycleBonuses).tekst}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { v: "gewonnen", label: "Gewonnen" },
                        { v: "verloren", label: "Verloren" },
                        { v: "", label: "Niet gespeeld" },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => updateRow(p.id, "wedstrijd", opt.v)}
                          className="cy-medium"
                          style={{ flex: 1, fontSize: 11, padding: "6px 4px", borderRadius: 4, border: `1.5px solid ${COLORS.blue}`, background: (rows[p.id]?.wedstrijd ?? "") === opt.v ? COLORS.blue : COLORS.white, color: (rows[p.id]?.wedstrijd ?? "") === opt.v ? COLORS.white : COLORS.blue, cursor: "pointer" }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {players.length === 0 && <Empty text="Voeg eerst speelsters toe via Beheer." />}

      <button
        onClick={() => setShowHistorie((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginTop: 18, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showHistorie ? "Geschiedenis verbergen" : `Eerder ingevoerd (${trainings.length}) — bekijk, wijzig of verwijder`}
      </button>

      {showHistorie && (
        <div style={{ marginTop: 10 }}>
          {sortedTrainings.length === 0 && <Empty text="Nog geen trainingen ingevoerd." />}
          {Object.entries(
            sortedTrainings.reduce((acc, t) => {
              const maand = t.date.slice(0, 7);
              acc[maand] = acc[maand] || [];
              acc[maand].push(t);
              return acc;
            }, {})
          ).map(([maand, items]) => {
            const open = openMonths.has(maand);
            const label = new Date(maand + "-01").toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
            return (
              <div key={maand} style={{ marginBottom: 6 }}>
                <button
                  onClick={() =>
                    setOpenMonths((prev) => {
                      const next = new Set(prev);
                      next.has(maand) ? next.delete(maand) : next.add(maand);
                      return next;
                    })
                  }
                  className="cy-medium"
                  style={{ width: "100%", textAlign: "left", background: COLORS.lightBlue, color: COLORS.black, border: "none", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, cursor: "pointer", textTransform: "capitalize" }}
                >
                  {open ? "▾" : "▸"} {label} ({items.length})
                </button>
                {open && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {items.map((t) => {
                      const bewerkbaar = binnenBewerkVenster(t);
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.white, borderRadius: 6, padding: "8px 10px" }}>
                          <div>
                            <div className="cy-medium" style={{ fontSize: 13 }}>{t.date}</div>
                            <div className="cy-regular" style={{ fontSize: 10.5, color: "#6b6b6b" }}>{Object.keys(t.spelers || {}).length} speelsters</div>
                            <div className="cy-regular" style={{ fontSize: 10, color: "#6b6b6b" }}>
                              ingevoerd door {t.enteredBy || "onbekend"}{t.updatedBy ? ` · gewijzigd door ${t.updatedBy}` : ""}
                            </div>
                          </div>
                          {bewerkbaar ? (
                            <div style={{ display: "flex", gap: 10 }}>
                              <TextButton onClick={() => startEdit(t)} style={{ fontSize: 12, color: COLORS.blue }}>wijzigen</TextButton>
                              <TextButton onClick={() => handleDelete(t.id)} style={{ fontSize: 12, color: "#c0392b" }}>verwijderen</TextButton>
                            </div>
                          ) : (
                            <span className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b" }}>alleen trainer</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
