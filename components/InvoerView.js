"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/constants";
import { previewDoelPunten, shuffle } from "@/lib/logic";
import { todayISO } from "@/lib/util";
import { Banner, Empty, Field, MiniNum, inputStyle } from "./shared";

function TeamindelingTool({ players }) {
  const [open, setOpen] = useState(false);
  const [aantalGroepen, setAantalGroepen] = useState(2);
  const [groepen, setGroepen] = useState(null);

  function verdeel() {
    const geschud = shuffle(players);
    const nieuweGroepen = Array.from({ length: aantalGroepen }, () => []);
    geschud.forEach((p, i) => nieuweGroepen[i % aantalGroepen].push(p));
    setGroepen(nieuweGroepen);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", textAlign: "left", background: COLORS.white, border: `1.5px solid ${COLORS.lightBlue}`, borderRadius: 6, padding: "10px 12px", fontSize: 12.5, color: COLORS.blue, cursor: "pointer" }}
      >
        {open ? "▾" : "▸"} Teamindeling openingsspel — wissel elke keer door elkaar
      </button>
      {open && (
        <div style={{ background: COLORS.white, borderRadius: 6, padding: 10, marginTop: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <span className="cy-regular" style={{ fontSize: 12, color: "#666" }}>Aantal groepen:</span>
            <select value={aantalGroepen} onChange={(e) => setAantalGroepen(Number(e.target.value))} style={{ ...inputStyle, width: 70, padding: "6px 8px" }}>
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={verdeel}
              disabled={players.length === 0}
              className="cy-medium"
              style={{ background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, cursor: players.length === 0 ? "not-allowed" : "pointer" }}
            >
              {groepen ? "Opnieuw wisselen" : "Verdeel"}
            </button>
          </div>
          {groepen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groepen.map((groep, i) => (
                <div key={i} style={{ background: "#f2f2f7", borderRadius: 4, padding: "6px 8px" }}>
                  <span className="cy-medium" style={{ fontSize: 11.5, color: COLORS.blue }}>Groep {i + 1}: </span>
                  <span className="cy-regular" style={{ fontSize: 11.5 }}>{groep.map((p) => p.name).join(", ") || "—"}</span>
                </div>
              ))}
            </div>
          )}
          <div className="cy-regular" style={{ fontSize: 10, color: "#999", marginTop: 8, lineHeight: 1.4 }}>
            Puur een hulpmiddel voor het moment zelf — wordt niet opgeslagen. Elke keer &quot;verdeel&quot; geeft
            een nieuwe, willekeurige indeling.
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoerView({ players, trainings, myName, goals, personalRecords, cycleBonuses, exercises, onSubmit, onDelete, saving }) {
  const emptyRows = () => Object.fromEntries(players.map((p) => [p.id, { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "" }]));

  const [editingId, setEditingId] = useState(null);
  const [editingMeta, setEditingMeta] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState(emptyRows);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showStrike, setShowStrike] = useState(false);
  const [showHistorie, setShowHistorie] = useState(false);
  const [openMonths, setOpenMonths] = useState(() => new Set([todayISO().slice(0, 7)]));

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
    if (editingId) return;
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
  }

  function startEdit(training) {
    setEditingId(training.id);
    setEditingMeta({ enteredBy: training.enteredBy, enteredAt: training.enteredAt });
    setDate(training.date);
    const filled = emptyRows();
    Object.entries(training.spelers || {}).forEach(([pid, vals]) => {
      filled[pid] = { openingsspel: 0, doel: 0, doelRaw: "", wedstrijd: "", ...vals };
    });
    setRows(filled);
    setShowHistorie(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingMeta(null);
    setDate(todayISO());
    setRows(emptyRows());
  }

  function handleDateChange(nieuweDatum) {
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
  }

  async function handleSave() {
    setErrorMsg("");
    const result = await onSubmit({ date, rows, trainingId: editingId });
    if (!result.ok) {
      setErrorMsg(result.message || "Opslaan is niet gelukt.");
      return;
    }
    setSavedMsg(editingId ? "Training bijgewerkt ✓" : "Training opgeslagen ✓");
    if (result.anyRecord) {
      setShowStrike(true);
      setTimeout(() => setShowStrike(false), 1500);
    }
    cancelEdit();
    setTimeout(() => setSavedMsg(""), 2500);
  }

  async function handleDelete(id) {
    if (!confirm("Deze training verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
    const result = await onDelete(id);
    if (!result.ok) setErrorMsg(result.message || "Verwijderen is niet gelukt.");
  }

  const sortedTrainings = [...trainings].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      {showStrike && (
        <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 999, pointerEvents: "none" }}>
          <div className="strike-badge cy-black" style={{ background: COLORS.yellow, color: COLORS.black, fontSize: 32, padding: "14px 28px", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.35)", letterSpacing: 1 }}>
            STRIKE! 🎳
          </div>
        </div>
      )}
      {editingId && (
        <Banner tone="light">
          Er staat al een training op {date} — de bestaande gegevens zijn geladen. Opslaan werkt bij.{" "}
          <span onClick={cancelEdit} style={{ textDecoration: "underline", cursor: "pointer" }}>annuleren</span>
        </Banner>
      )}
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}

      <Field label="Datum">
        <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} style={inputStyle} />
      </Field>

      <TeamindelingTool players={players} />

      <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, margin: "18px 0 8px" }}>PUNTEN PER SPEELSTER</div>
      <div className="cy-regular" style={{ fontSize: 11, color: "#777", marginBottom: 10, lineHeight: 1.5 }}>
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
            return (
              <div key={p.id} style={{ background: COLORS.white, borderRadius: 6, padding: "10px 12px", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                <div className="cy-medium" style={{ fontSize: 13.5, marginBottom: 6 }}>{p.name}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                  <MiniNum label="Openingsspel" value={rows[p.id]?.openingsspel ?? 0} onChange={(v) => updateRow(p.id, "openingsspel", v)} warnAbove={15} />
                  <div style={{ flex: 2 }}>
                    <div className="cy-regular" style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>
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
                {ex && <div className="cy-regular" style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>Doel: {ex.name}</div>}
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
            );
          })}
      </div>

      {players.length === 0 && <Empty text="Voeg eerst speelsters toe via Beheer." />}

      <button
        onClick={handleSave}
        disabled={saving || players.length === 0}
        className="cy-black"
        style={{ width: "100%", marginTop: 18, background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "14px 8px", fontSize: 15, cursor: players.length === 0 ? "not-allowed" : "pointer", opacity: players.length === 0 ? 0.5 : 1 }}
      >
        {saving ? "OPSLAAN…" : editingId ? "WIJZIGING OPSLAAN" : "TRAINING OPSLAAN"}
      </button>
      {savedMsg && <div className="cy-medium" style={{ textAlign: "center", color: COLORS.blue, marginTop: 10, fontSize: 13 }}>{savedMsg}</div>}

      <button
        onClick={() => setShowHistorie((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginTop: 22, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
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
                    {items.map((t) => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.white, borderRadius: 6, padding: "8px 10px" }}>
                        <div>
                          <div className="cy-medium" style={{ fontSize: 13 }}>{t.date}</div>
                          <div className="cy-regular" style={{ fontSize: 10.5, color: "#888" }}>{Object.keys(t.spelers || {}).length} speelsters</div>
                          <div className="cy-regular" style={{ fontSize: 10, color: "#aaa" }}>
                            ingevoerd door {t.enteredBy || "onbekend"}{t.updatedBy ? ` · gewijzigd door ${t.updatedBy}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span onClick={() => startEdit(t)} className="cy-medium" style={{ fontSize: 12, color: COLORS.blue, cursor: "pointer" }}>wijzigen</span>
                          <span onClick={() => handleDelete(t.id)} className="cy-medium" style={{ fontSize: 12, color: "#c0392b", cursor: "pointer" }}>verwijderen</span>
                        </div>
                      </div>
                    ))}
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
