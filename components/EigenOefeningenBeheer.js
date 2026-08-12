"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { Banner, TextButton, inputStyle } from "./shared";

// Toevoegen/wijzigen van eigen Recordboek-oefeningen. Gebruikt op twee
// plekken: binnen het blauwe "MIJN HUIDIGE DOEL"-blok bij Recordboek
// (dark=true, spelersweergave), en bij Beheer voor de trainer (dark=false,
// gewone lichte thema — niet meer onder het klassement bij Recordboek).
export default function EigenOefeningenBeheer({ exercises, customExercises, onAddCustomExercise, onUpdateCustomExercise, onDeleteCustomExercise, myName, isTrainer, dark = true }) {
  const [showOefeningen, setShowOefeningen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const baseCategorieen = [...new Set(exercises.filter((e) => !e.isCustom).map((ex) => ex.cat))];
  const leegOefeningForm = { cat: baseCategorieen[0] || "Eigen accent", station: "Vrij", name: "", metric: "", higherIsBetter: true, desc: "" };
  const [oefeningForm, setOefeningForm] = useState(leegOefeningForm);

  const toonKleur = dark ? COLORS.white : COLORS.black;
  const zachtKleur = dark ? COLORS.lightBlue : "#6b6b6b";
  const rijAchtergrond = dark ? "rgba(255,255,255,.08)" : COLORS.white;
  const toggleBorder = dark ? COLORS.lightBlue : COLORS.blue;
  const wijzigKleur = dark ? COLORS.yellow : COLORS.blue;
  const verwijderKleur = dark ? "#ff8a8a" : "#c0392b";

  function magWijzigen(ex) {
    return isTrainer || !ex.createdBy || ex.createdBy === myName;
  }

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

  return (
    <div style={{ marginTop: 14 }}>
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}
      <button
        onClick={() => setShowOefeningen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", background: "none", border: `1.5px solid ${toggleBorder}`, color: toonKleur, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showOefeningen ? "Eigen oefeningen verbergen" : `Eigen Recordboek-oefeningen (${customExercises.length}) — toevoegen/wijzigen`}
      </button>
      {showOefeningen && (
        <div style={{ marginTop: 10 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: zachtKleur, marginBottom: 10, lineHeight: 1.5 }}>
            De basisoefeningen uit het Handboek staan vast. Hier voeg je eigen extra oefeningen toe —
            handig voor een individueel accent dat nog niet in de lijst staat. Alleen jijzelf (of de
            trainer) kan een eigen oefening later nog wijzigen; verwijderen kan alleen de trainer.
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
            {customExercises.length === 0 && <div className="cy-regular" style={{ fontSize: 12, color: zachtKleur }}>Nog geen eigen oefeningen toegevoegd.</div>}
            {customExercises.map((ex) => (
              <div key={ex.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: rijAchtergrond, borderRadius: 6, padding: "8px 10px" }}>
                <div>
                  <div className="cy-medium" style={{ fontSize: 13, color: toonKleur }}>{ex.name}</div>
                  <div className="cy-regular" style={{ fontSize: 10.5, color: zachtKleur }}>{ex.cat} · {ex.station} · {ex.metric}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {magWijzigen(ex) && (
                    <TextButton onClick={() => startEditOefening(ex)} style={{ fontSize: 12, color: wijzigKleur }}>wijzigen</TextButton>
                  )}
                  {isTrainer && (
                    <TextButton
                      onClick={async () => {
                        if (confirm(`"${ex.name}" verwijderen?`)) {
                          const result = await onDeleteCustomExercise(ex.id);
                          if (!result.ok) setErrorMsg(result.message);
                        }
                      }}
                      style={{ fontSize: 12, color: verwijderKleur }}
                    >
                      verwijderen
                    </TextButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
