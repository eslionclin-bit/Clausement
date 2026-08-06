"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { daysBetween, todayISO } from "@/lib/util";
import { Banner, Empty, inputStyle } from "./shared";

export default function BeheerView({
  players,
  onAddPlayer,
  onRemovePlayer,
  periodNumber,
  periodStart,
  onResetPeriode,
  auditLog,
  onExportBackup,
  exercises,
  customExercises,
  onAddCustomExercise,
  onUpdateCustomExercise,
  onDeleteCustomExercise,
  teamGoal,
  onSetTeamGoal,
}) {
  const [naam, setNaam] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [teamGoalInput, setTeamGoalInput] = useState(teamGoal ?? "");
  const [showOefeningen, setShowOefeningen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const baseCategorieen = [...new Set(exercises.filter((e) => !e.isCustom).map((ex) => ex.cat))];
  const leegOefeningForm = { cat: baseCategorieen[0] || "Eigen accent", station: "Vrij", name: "", metric: "", higherIsBetter: true, desc: "" };
  const [oefeningForm, setOefeningForm] = useState(leegOefeningForm);
  const dagen = daysBetween(periodStart, todayISO());

  function startEditOefening(ex) {
    setEditingExerciseId(ex.id);
    setOefeningForm({ cat: ex.cat, station: ex.station, name: ex.name, metric: ex.metric, higherIsBetter: ex.higherIsBetter, desc: ex.desc });
    setShowOefeningen(true);
  }

  function cancelOefeningForm() {
    setEditingExerciseId(null);
    setOefeningForm(leegOefeningForm);
  }

  async function saveOefeningForm() {
    if (!oefeningForm.name.trim() || !oefeningForm.metric.trim()) return;
    setErrorMsg("");
    const result = editingExerciseId
      ? await onUpdateCustomExercise({ ...oefeningForm, id: editingExerciseId })
      : await onAddCustomExercise(oefeningForm);
    if (!result.ok) {
      setErrorMsg(result.message);
      return;
    }
    cancelOefeningForm();
  }

  async function handleResetPeriode() {
    if (!confirm("Periode afronden? Het Clausement gaat terug naar 0. Het Recordboek blijft staan.")) return;
    const result = await onResetPeriode();
    if (!result.ok) setErrorMsg(result.message);
  }

  return (
    <div>
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}

      <div className="scorepanel" style={{ padding: 14, marginBottom: 18 }}>
        <div className="cy-medium" style={{ fontSize: 13, marginBottom: 4 }}>Periode {periodNumber} — dag {dagen} van ~56</div>
        <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, marginBottom: 10 }}>Start: {periodStart}</div>
        <button
          onClick={handleResetPeriode}
          className="cy-medium"
          style={{ width: "100%", background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
        >
          Periode afronden &amp; Clausement resetten
        </button>
      </div>

      <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, marginBottom: 8 }}>SPEELSTER TOEVOEGEN</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input placeholder="Naam" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button
          onClick={async () => {
            if (!naam.trim()) return;
            const result = await onAddPlayer(naam.trim());
            if (!result.ok) setErrorMsg(result.message);
            else setNaam("");
          }}
          className="cy-black"
          style={{ background: COLORS.blue, color: COLORS.white, border: "none", borderRadius: 6, padding: "0 18px", fontSize: 14, cursor: "pointer" }}
        >
          +
        </button>
      </div>

      <div className="scorepanel" style={{ padding: 14, marginBottom: 18 }}>
        <div className="cy-medium" style={{ fontSize: 13, marginBottom: 6 }}>Teamdoel</div>
        <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, marginBottom: 8, lineHeight: 1.4 }}>
          Een gezamenlijk mijlpaal: de som van ieders Recordboek-totaal. Iedereen werkt aan haar eigen
          verbetering, en draagt daarmee bij aan iets groters. Leeg laten = geen teamdoel tonen.
        </div>
        <input
          type="number"
          min={0}
          placeholder="bv. 500"
          value={teamGoalInput}
          onChange={(e) => setTeamGoalInput(e.target.value)}
          onBlur={() => onSetTeamGoal(teamGoalInput === "" ? null : Number(teamGoalInput))}
          style={{ ...inputStyle }}
        />
      </div>

      <button
        onClick={() => setShowOefeningen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginBottom: 20, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showOefeningen ? "Eigen oefeningen verbergen" : `Eigen Recordboek-oefeningen (${customExercises.length}) — toevoegen/wijzigen`}
      </button>
      {showOefeningen && (
        <div style={{ marginBottom: 20 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: "#777", marginBottom: 10, lineHeight: 1.5 }}>
            De basisoefeningen uit het Handboek staan vast. Hier voeg je eigen extra oefeningen toe —
            handig voor een individueel accent dat nog niet in de lijst staat. Eigen oefeningen kun je
            later altijd nog wijzigen of verwijderen.
          </div>

          <div style={{ background: COLORS.white, borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div className="cy-medium" style={{ fontSize: 12, color: COLORS.blue, marginBottom: 8 }}>
              {editingExerciseId ? "Oefening wijzigen" : "Nieuwe oefening"}
            </div>
            <input placeholder="Naam" value={oefeningForm.name} onChange={(e) => setOefeningForm({ ...oefeningForm, name: e.target.value })} style={{ ...inputStyle, marginBottom: 6 }} />
            <textarea
              placeholder="Omschrijving — wat moet de speelster precies doen?"
              value={oefeningForm.desc}
              onChange={(e) => setOefeningForm({ ...oefeningForm, desc: e.target.value })}
              style={{ ...inputStyle, height: 60, marginBottom: 6 }}
            />
            <input
              placeholder="Meeteenheid, bv. 'aantal raak van de 10' of 'seconden'"
              value={oefeningForm.metric}
              onChange={(e) => setOefeningForm({ ...oefeningForm, metric: e.target.value })}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select value={oefeningForm.cat} onChange={(e) => setOefeningForm({ ...oefeningForm, cat: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                {baseCategorieen.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                <option value="Eigen accent">Eigen accent</option>
              </select>
              <select value={oefeningForm.station} onChange={(e) => setOefeningForm({ ...oefeningForm, station: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                {["Net", "Veld", "Muur", "Mat", "Vrij"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <label className="cy-regular" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <input type="checkbox" checked={oefeningForm.higherIsBetter} onChange={(e) => setOefeningForm({ ...oefeningForm, higherIsBetter: e.target.checked })} />
              Hoger is beter (uitzetten bij bv. een tijd waarbij lager beter is)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveOefeningForm}
                className="cy-medium"
                style={{ flex: 1, background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "10px 8px", fontSize: 12.5, cursor: "pointer" }}
              >
                {editingExerciseId ? "Wijziging opslaan" : "Oefening toevoegen"}
              </button>
              {editingExerciseId && (
                <button
                  onClick={cancelOefeningForm}
                  className="cy-medium"
                  style={{ background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 12px", fontSize: 12.5, cursor: "pointer" }}
                >
                  Annuleren
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {customExercises.length === 0 && <div className="cy-regular" style={{ fontSize: 12, color: "#999" }}>Nog geen eigen oefeningen toegevoegd.</div>}
            {customExercises.map((ex) => (
              <div key={ex.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.white, borderRadius: 6, padding: "8px 10px" }}>
                <div>
                  <div className="cy-medium" style={{ fontSize: 13 }}>{ex.name}</div>
                  <div className="cy-regular" style={{ fontSize: 10.5, color: "#999" }}>{ex.cat} · {ex.station} · {ex.metric}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <span onClick={() => startEditOefening(ex)} className="cy-medium" style={{ fontSize: 12, color: COLORS.blue, cursor: "pointer" }}>wijzigen</span>
                  <span
                    onClick={async () => {
                      if (confirm(`"${ex.name}" verwijderen?`)) {
                        const result = await onDeleteCustomExercise(ex.id);
                        if (!result.ok) setErrorMsg(result.message);
                      }
                    }}
                    className="cy-medium"
                    style={{ fontSize: 12, color: "#c0392b", cursor: "pointer" }}
                  >
                    verwijderen
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, marginBottom: 8 }}>SPEELSTERS ({players.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {players.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.white, borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
            <span className="cy-regular">{p.name}</span>
            <button
              onClick={async () => {
                const result = await onRemovePlayer(p.id);
                if (!result.ok) setErrorMsg(result.message);
              }}
              style={{ border: "none", background: "none", color: "#c0392b", cursor: "pointer", fontSize: 12 }}
              className="cy-medium"
            >
              verwijderen
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowBackup((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginTop: 22, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showBackup ? "Backup verbergen" : "Backup exporteren"}
      </button>
      {showBackup && (
        <div style={{ marginTop: 10 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: "#777", marginBottom: 8, lineHeight: 1.5 }}>
            Handig als eigen archief naast de automatische Supabase-databasebackups. Bewaar dit JSON-bestand
            ergens veilig. Data terugzetten uit een oude artifact-backup kan via het migratiescript in de
            repository (zie README) — dat is bewust geen knop in de app, om te voorkomen dat live data per
            ongeluk overschreven wordt.
          </div>
          <textarea readOnly value={onExportBackup()} onFocus={(e) => e.target.select()} style={{ ...inputStyle, height: 90, fontSize: 10, fontFamily: "monospace", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(onExportBackup());
                  setBackupMsg("Gekopieerd naar klembord ✓");
                } catch {
                  setBackupMsg("Kopiëren lukte niet — selecteer de tekst hierboven handmatig.");
                }
                setTimeout(() => setBackupMsg(""), 3000);
              }}
              className="cy-medium"
              style={{ flex: 1, background: COLORS.blue, color: COLORS.white, border: "none", borderRadius: 6, padding: "10px 8px", fontSize: 12.5, cursor: "pointer" }}
            >
              Kopieer backup
            </button>
            <button
              onClick={() => {
                try {
                  const blob = new Blob([onExportBackup()], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `clausement-backup-${todayISO()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  setBackupMsg("Downloaden lukte niet — gebruik 'Kopieer backup'.");
                  setTimeout(() => setBackupMsg(""), 3000);
                }
              }}
              className="cy-medium"
              style={{ flex: 1, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 12.5, cursor: "pointer" }}
            >
              Download bestand
            </button>
          </div>
          {backupMsg && <div className="cy-medium" style={{ fontSize: 12, color: COLORS.blue, marginBottom: 14 }}>{backupMsg}</div>}
        </div>
      )}

      <button
        onClick={() => setShowLog((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginTop: 12, background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showLog ? "Logboek verbergen" : `Logboek (${auditLog.length}) — wie heeft wat ingevoerd`}
      </button>
      {showLog && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 380, overflowY: "auto" }}>
          {auditLog.length === 0 && <Empty text="Nog geen wijzigingen gelogd." />}
          {[...auditLog].reverse().map((log) => (
            <div key={log.id} style={{ background: COLORS.white, borderRadius: 4, padding: "8px 10px" }}>
              <div className="cy-regular" style={{ fontSize: 11.5, color: "#555" }}>
                <span className="cy-medium">{log.by || "onbekend"}</span> heeft training van {log.trainingDate} {log.action}
                <span style={{ color: "#aaa" }}> · {new Date(log.at).toLocaleString("nl-NL")}</span>
              </div>
              {log.action === "gewijzigd" && log.previousSummary && (
                <div className="cy-regular" style={{ fontSize: 10.5, color: "#999", marginTop: 4 }}>
                  <div className="cy-medium" style={{ color: "#aaa" }}>was:</div>
                  {log.previousSummary.length === 0 && <div>— geen punten —</div>}
                  {log.previousSummary.map((s) => (
                    <div key={s.name}>{s.name}: open. {s.openingsspel} · doel {s.doel} · wedstrijd {s.wedstrijd || "-"}</div>
                  ))}
                </div>
              )}
              {log.summary && (
                <div className="cy-regular" style={{ fontSize: 10.5, color: "#555", marginTop: 4 }}>
                  {log.action === "gewijzigd" && <div className="cy-medium" style={{ color: COLORS.blue }}>nu:</div>}
                  {log.summary.length === 0 && <div>— geen punten —</div>}
                  {log.summary.map((s) => (
                    <div key={s.name}>{s.name}: open. {s.openingsspel} · doel {s.doel} · wedstrijd {s.wedstrijd || "-"}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
