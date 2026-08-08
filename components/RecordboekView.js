"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { aantalKeerGeoefend, doelGeschiedenisVoorSpeler, doelPerPeriode } from "@/lib/logic";
import { addDays, todayISO } from "@/lib/util";
import { Banner, Empty, RankBadge, TextButton, inputStyle } from "./shared";
import RivaliteitPanel from "./RivaliteitPanel";

function EigenOefeningenBeheer({ exercises, customExercises, onAddCustomExercise, onUpdateCustomExercise, onDeleteCustomExercise }) {
  const [showOefeningen, setShowOefeningen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const baseCategorieen = [...new Set(exercises.filter((e) => !e.isCustom).map((ex) => ex.cat))];
  const leegOefeningForm = { cat: baseCategorieen[0] || "Eigen accent", station: "Vrij", name: "", metric: "", higherIsBetter: true, desc: "" };
  const [oefeningForm, setOefeningForm] = useState(leegOefeningForm);

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
    <div style={{ marginTop: 20, marginBottom: 20 }}>
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}
      <button
        onClick={() => setShowOefeningen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showOefeningen ? "Eigen oefeningen verbergen" : `Eigen Recordboek-oefeningen (${customExercises.length}) — toevoegen/wijzigen`}
      </button>
      {showOefeningen && (
        <div style={{ marginTop: 10 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 10, lineHeight: 1.5 }}>
            De basisoefeningen uit het Handboek staan vast. Hier voeg je eigen extra oefeningen toe —
            handig voor een individueel accent dat nog niet in de lijst staat. Eigen oefeningen kun je
            later altijd nog wijzigen of verwijderen — door wie dan ook in het team.
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
            {customExercises.length === 0 && <div className="cy-regular" style={{ fontSize: 12, color: "#6b6b6b" }}>Nog geen eigen oefeningen toegevoegd.</div>}
            {customExercises.map((ex) => (
              <div key={ex.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.white, borderRadius: 6, padding: "8px 10px" }}>
                <div>
                  <div className="cy-medium" style={{ fontSize: 13 }}>{ex.name}</div>
                  <div className="cy-regular" style={{ fontSize: 10.5, color: "#6b6b6b" }}>{ex.cat} · {ex.station} · {ex.metric}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <TextButton onClick={() => startEditOefening(ex)} style={{ fontSize: 12, color: COLORS.blue }}>wijzigen</TextButton>
                  <TextButton
                    onClick={async () => {
                      if (confirm(`"${ex.name}" verwijderen?`)) {
                        const result = await onDeleteCustomExercise(ex.id);
                        if (!result.ok) setErrorMsg(result.message);
                      }
                    }}
                    style={{ fontSize: 12, color: "#c0392b" }}
                  >
                    verwijderen
                  </TextButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PerOefeningRanglijst({ players, exercises, personalRecords }) {
  const [open, setOpen] = useState(false);
  const [gekozenId, setGekozenId] = useState(exercises[0]?.id);
  const ex = exercises.find((e) => e.id === gekozenId);

  const metScore = [];
  const zonderScore = [];
  if (ex) {
    players.forEach((p) => {
      const waarde = personalRecords[`${p.id}:${ex.id}`];
      if (waarde !== undefined) metScore.push({ player: p, waarde });
      else zonderScore.push(p);
    });
    metScore.sort((a, b) => (ex.higherIsBetter ? b.waarde - a.waarde : a.waarde - b.waarde));
  }

  const perCategorie = {};
  exercises.forEach((e) => {
    perCategorie[e.cat] = perCategorie[e.cat] || [];
    perCategorie[e.cat].push(e);
  });

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", background: "none", border: `1.5px solid ${COLORS.lightBlue}`, color: COLORS.blue, borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {open ? "▾" : "▸"} Bekijk per oefening — wie is hier het beste in?
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <select value={gekozenId} onChange={(e) => setGekozenId(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
            {Object.entries(perCategorie).map(([cat, exs]) => (
              <optgroup key={cat} label={cat}>
                {exs.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {ex && (
            <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 10 }}>
              Gerangschikt op: {ex.metric}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {metScore.length === 0 && <Empty text="Nog niemand heeft hier een score voor ingevoerd." />}
            {metScore.map((r, i) => (
              <div key={r.player.id} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.white, borderRadius: 6, padding: "8px 10px" }}>
                <RankBadge rank={i + 1} />
                <div style={{ flex: 1 }} className="cy-medium">{r.player.name}</div>
                <div className="tile-num" style={{ fontSize: 16, color: COLORS.blue }}>{r.waarde}</div>
              </div>
            ))}
          </div>

          {zonderScore.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="cy-medium" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 4 }}>NOG NIET GEPROBEERD</div>
              <div className="cy-regular" style={{ fontSize: 11.5, color: "#6b6b6b" }}>{zonderScore.map((p) => p.name).join(", ")}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecordboekView({
  recordboek,
  players,
  myName,
  goals,
  goalHistory,
  onSetGoal,
  trainings,
  personalRecords,
  cycleBonuses,
  exercises,
  customExercises,
  onAddCustomExercise,
  onUpdateCustomExercise,
  onDeleteCustomExercise,
  rivalries,
  onProposeRivalry,
  onRespondRivalry,
  onEndRivalry,
  isTrainer,
}) {
  const trend = useMemo(() => {
    const vandaag = todayISO();
    const start4wkGeleden = addDays(vandaag, -28);
    const start8wkGeleden = addDays(vandaag, -56);
    const huidig = doelPerPeriode(trainings, start4wkGeleden, null);
    const vorig = doelPerPeriode(trainings, start8wkGeleden, start4wkGeleden);
    const result = {};
    players.forEach((p) => {
      result[p.id] = (huidig[p.id] || 0) > (vorig[p.id] || 0);
    });
    return result;
  }, [trainings, players]);
  const mijnSpeler = players.find((p) => p.name === myName);
  const mijnDoel = mijnSpeler ? goals[mijnSpeler.id] : null;
  const mijnDoelExercise = mijnDoel ? exercises.find((ex) => ex.id === mijnDoel.exerciseId) : null;

  const mijnGeschiedenis = useMemo(() => {
    if (!mijnSpeler) return [];
    return doelGeschiedenisVoorSpeler(trainings, mijnSpeler.id, goalHistory[mijnSpeler.id] || [], mijnDoel, exercises);
  }, [goalHistory, mijnDoel, mijnSpeler, trainings, exercises]);
  const [kiezen, setKiezen] = useState(false);
  const [zoek, setZoek] = useState("");
  const [foutmelding, setFoutmelding] = useState("");

  const aantalGeoefend = useMemo(
    () => (mijnSpeler ? aantalKeerGeoefend(trainings, mijnSpeler.id, mijnDoel) : 0),
    [trainings, mijnSpeler, mijnDoel]
  );
  const kanWisselen = !mijnDoel || aantalGeoefend >= 4;

  const huidigeExerciseId = mijnDoel ? mijnDoel.exerciseId : null;

  const SCHAARSE_STATIONS = ["Net", "Veld"];
  const bezetPerStation = useMemo(() => {
    const bezet = {};
    Object.entries(goals).forEach(([pid, g]) => {
      if (!g) return;
      if (mijnSpeler && pid === mijnSpeler.id) return;
      const ex = exercises.find((e) => e.id === g.exerciseId);
      if (!ex || !SCHAARSE_STATIONS.includes(ex.station)) return;
      if (!bezet[ex.station]) bezet[ex.station] = { exerciseId: ex.id, exerciseName: ex.name };
    });
    return bezet;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, mijnSpeler]);

  const gefilterd = exercises.filter((ex) => ex.name.toLowerCase().includes(zoek.toLowerCase()));
  const perCategorie = {};
  gefilterd.forEach((ex) => {
    perCategorie[ex.cat] = perCategorie[ex.cat] || [];
    perCategorie[ex.cat].push(ex);
  });

  function vol(ex) {
    if (!SCHAARSE_STATIONS.includes(ex.station)) return false;
    const bezet = bezetPerStation[ex.station];
    if (!bezet) return false;
    return bezet.exerciseId !== ex.id;
  }

  function herhaling(ex) {
    return ex.id === huidigeExerciseId;
  }

  async function kiesDoel(ex) {
    if (vol(ex) || herhaling(ex)) return;
    setFoutmelding("");
    const result = await onSetGoal(mijnSpeler.id, ex.id);
    if (!result.ok) {
      setFoutmelding(result.message);
      return;
    }
    setKiezen(false);
    setZoek("");
  }

  return (
    <div>
      <div className="cy-regular" style={{ fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.5 }}>
        Het Recordboek reset nooit — dit zijn de doel-punten van elke speelster over het hele seizoen.
        Je oefent een doel minstens 4x voordat je kunt wisselen — dat voorkomt dat wisselen zelf een
        makkelijke manier wordt om aan bonuspunten te komen. Net en veld zijn er maar één keer: je mag
        daar samen met anderen hetzelfde doel oefenen, maar niet een ander doel kiezen als het net of
        veld al bezet is met iets anders.
      </div>

      {mijnSpeler && (
        <div className="scorepanel" style={{ padding: 12, marginBottom: 16 }}>
          <div className="cy-medium" style={{ fontSize: 12, color: COLORS.lightBlue, marginBottom: 4 }}>MIJN HUIDIGE DOEL</div>
          <div className="cy-black" style={{ fontSize: 15 }}>{mijnDoel ? mijnDoel.exerciseName : "Nog niet gekozen"}</div>
          {mijnDoelExercise && (
            <div className="cy-regular" style={{ fontSize: 12, color: COLORS.lightBlue, marginTop: 4, marginBottom: 2, lineHeight: 1.4 }}>
              {mijnDoelExercise.desc}
            </div>
          )}
          {mijnDoelExercise && (
            <div className="cy-medium" style={{ fontSize: 11, color: COLORS.yellow, marginBottom: 6 }}>
              Meet: {mijnDoelExercise.metric} · Station: {mijnDoelExercise.station}
            </div>
          )}
          {mijnDoelExercise && (
            <div className="cy-medium" style={{ fontSize: 11.5, color: aantalGeoefend >= 4 ? "#ff8a8a" : "#6b6b6b", marginBottom: 10 }}>
              {aantalGeoefend}x geoefend{aantalGeoefend >= 4 ? " — tijd voor een nieuw doel!" : ` van de 4x — dan kun je wisselen`}
            </div>
          )}
          {!mijnDoelExercise && <div style={{ marginBottom: 10 }} />}
          <button
            onClick={() => kanWisselen && setKiezen((v) => !v)}
            disabled={!kanWisselen}
            className="cy-medium"
            style={{
              background: COLORS.yellow,
              color: COLORS.black,
              border: "none",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12.5,
              cursor: kanWisselen ? "pointer" : "not-allowed",
              opacity: kanWisselen ? 1 : 0.5,
            }}
          >
            {kiezen ? "Sluiten" : mijnDoel ? "Doel wijzigen" : "Kies je doel"}
          </button>
          {!kanWisselen && (
            <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, marginTop: 6, lineHeight: 1.4 }}>
              Je kunt pas wisselen na 4x oefenen — dit voorkomt dat wisselen zelf een sluiproute naar
              extra punten wordt. Blessure of verkeerd doel gekozen? Vraag de trainer, die kan het in
              Beheer altijd voor je wijzigen.
            </div>
          )}

          {foutmelding && (
            <div className="cy-medium" style={{ fontSize: 11.5, color: "#ff8a8a", marginTop: 8 }}>{foutmelding}</div>
          )}

          {kiezen && (
            <div style={{ marginTop: 10 }}>
              <input
                placeholder="Zoek een oefening…"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {Object.entries(perCategorie).map(([cat, exs]) => (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div className="cy-medium" style={{ fontSize: 11, color: COLORS.lightBlue, marginBottom: 4 }}>{cat.toUpperCase()}</div>
                    {exs.map((ex) => {
                      const isVol = vol(ex);
                      const isHerhaling = herhaling(ex);
                      const geblokkeerd = isVol || isHerhaling;
                      return (
                        <div
                          key={ex.id}
                          onClick={() => kiesDoel(ex)}
                          style={{
                            padding: "7px 8px",
                            background: geblokkeerd ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.08)",
                            borderRadius: 4,
                            marginBottom: 3,
                            cursor: geblokkeerd ? "not-allowed" : "pointer",
                            opacity: geblokkeerd ? 0.5 : 1,
                          }}
                        >
                          <div className="cy-medium" style={{ fontSize: 12.5, color: COLORS.white, display: "flex", justifyContent: "space-between", gap: 6 }}>
                            <span>{ex.name}</span>
                            {isHerhaling ? (
                              <span style={{ color: "#ff8a8a", fontSize: 10, flexShrink: 0 }}>dit is je huidige doel</span>
                            ) : isVol ? (
                              <span style={{ color: "#ff8a8a", fontSize: 10, flexShrink: 0 }}>
                                {ex.station} bezet: {bezetPerStation[ex.station]?.exerciseName}
                              </span>
                            ) : (
                              SCHAARSE_STATIONS.includes(ex.station) && (
                                <span style={{ color: COLORS.lightBlue, fontSize: 10, flexShrink: 0 }}>{ex.station}: vrij</span>
                              )
                            )}
                          </div>
                          <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, lineHeight: 1.35, marginTop: 1 }}>{ex.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <RivaliteitPanel
        mijnSpeler={mijnSpeler}
        mijnDoel={mijnDoel}
        players={players}
        goals={goals}
        personalRecords={personalRecords}
        rivalries={rivalries}
        onProposeRivalry={onProposeRivalry}
        onRespondRivalry={onRespondRivalry}
        onEndRivalry={onEndRivalry}
      />

      {mijnSpeler && mijnGeschiedenis.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, marginBottom: 8 }}>MIJN VOLTOOIDE DOELEN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...mijnGeschiedenis].reverse().map((h, i) => (
              <div key={i} style={{ background: COLORS.white, borderRadius: 6, padding: "8px 10px", borderLeft: h.actief ? `3px solid ${COLORS.yellow}` : "3px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="cy-medium" style={{ fontSize: 13 }}>{h.assignment.exerciseName}</span>
                  {h.actief && <span className="cy-medium" style={{ fontSize: 9.5, color: COLORS.blue }}>huidig</span>}
                </div>
                <div className="cy-regular" style={{ fontSize: 10.5, color: "#6b6b6b" }}>
                  vanaf {h.assignment.chosenAt}{h.eindDatum ? ` t/m ${h.eindDatum}` : " · nog bezig"}
                </div>
                <div className="cy-medium" style={{ fontSize: 11.5, color: COLORS.blue, marginTop: 2 }}>
                  {h.beste !== null ? `Beste score: ${h.beste}${h.ex ? ` — ${h.ex.metric}` : ""}` : "Nog geen score ingevoerd"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, marginBottom: 8 }}>
        RECORDBOEK-KLASSEMENT (totaal doel-punten, hele seizoen)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recordboek.length === 0 && <Empty text="Nog geen data." />}
        {recordboek.map((r, i) => {
          const doel = goals[r.player.id];
          const stijgend = trend[r.player.id];
          return (
            <div key={r.player.id} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.white, borderRadius: 8, padding: "10px 12px", boxShadow: i === 0 ? "0 3px 10px rgba(44,43,124,.18)" : "0 1px 3px rgba(0,0,0,.07)", border: i === 0 ? `1.5px solid ${COLORS.yellow}` : "1.5px solid transparent" }}>
              <RankBadge rank={i + 1} />
              <div style={{ flex: 1 }} className="cy-medium">
                <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  {r.player.name}
                  {stijgend && (
                    <span style={{ color: "#2e8b57", fontSize: 12 }} title="Meer doel-punten de afgelopen 4 weken dan de 4 weken daarvoor">▲</span>
                  )}
                  {i === 0 && r.totaal > 0 && (
                    <span className="cy-black" style={{ fontSize: 9.5, color: COLORS.black, background: COLORS.yellow, padding: "2px 6px", borderRadius: 10 }}>STRIKE!</span>
                  )}
                </div>
                {doel && <div className="cy-regular" style={{ fontSize: 10.5, color: "#6b6b6b" }}>doel: {doel.exerciseName}</div>}
              </div>
              <div className="tile-num" style={{ fontSize: 20, color: COLORS.lightBlue }}>{r.totaal}</div>
            </div>
          );
        })}
      </div>

      <EigenOefeningenBeheer
        exercises={exercises}
        customExercises={customExercises}
        onAddCustomExercise={onAddCustomExercise}
        onUpdateCustomExercise={onUpdateCustomExercise}
        onDeleteCustomExercise={onDeleteCustomExercise}
      />

      {isTrainer && <PerOefeningRanglijst players={players} exercises={exercises} personalRecords={personalRecords} />}
    </div>
  );
}
