"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { computeStandings, doelGeschiedenisVoorSpeler } from "@/lib/logic";
import { daysBetween, todayISO } from "@/lib/util";
import { Empty, RankBadge, inputStyle } from "./shared";

function PuntenUitleg() {
  const [open, setOpen] = useState(false);
  const items = [
    ["Openingsspel", "Punten voor je plaats in het openingsspelletje. Winnaar krijgt het hoogst, elke plek daarna 1 punt minder."],
    ["Doel", "Punten voor je persoonlijke Recordboek-doel: vul bij Invoeren je score van vandaag in. 1 punt voor een eerlijke poging, 1 extra punt als de app ziet dat je je eigen record verbeterde. Die extra bonus telt maar 1x per cyclus (~4 weken) — zo levert een makkelijk te verbeteren oefening niet structureel meer punten op dan een moeilijkere."],
    ["Wedstrijd", "3 punten als je het partijtje van die avond hebt gewonnen, 0 bij verlies of niet gespeeld."],
  ];
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", textAlign: "left", background: COLORS.white, border: `1.5px solid ${COLORS.lightBlue}`, borderRadius: 6, padding: "10px 12px", fontSize: 12.5, color: COLORS.blue, cursor: "pointer" }}
      >
        {open ? "▾" : "▸"} Hoe werkt de puntentelling?
      </button>
      {open && (
        <div style={{ background: COLORS.white, borderRadius: 6, padding: "10px 12px", marginTop: 6 }}>
          {items.map(([k, v]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div className="cy-medium" style={{ fontSize: 12.5, color: COLORS.blue }}>{k}</div>
              <div className="cy-regular" style={{ fontSize: 12, color: "#555", lineHeight: 1.4 }}>{v}</div>
            </div>
          ))}
          <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", lineHeight: 1.4 }}>
            Je totaal is de som van deze drie. Elke periode (~8 weken) begint dit weer op 0 — het
            Recordboek (los tabblad) telt wél het hele seizoen door.
          </div>
        </div>
      )}
    </div>
  );
}

function TeamVoortgang({ recordboek, teamGoal }) {
  const totaal = recordboek.reduce((som, r) => som + r.totaal, 0);
  const percentage = Math.min(100, Math.round((totaal / teamGoal) * 100));
  return (
    <div className="scorepanel" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="cy-medium" style={{ fontSize: 12, color: COLORS.lightBlue }}>TEAMDOEL — SAMEN</span>
        <span className="cy-black" style={{ fontSize: 14, color: COLORS.white }}>{totaal} / {teamGoal}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${percentage}%`, height: "100%", background: percentage >= 100 ? COLORS.yellow : COLORS.lightBlue, transition: "width .3s ease" }} />
      </div>
      <div className="cy-regular" style={{ fontSize: 10.5, color: COLORS.lightBlue, marginTop: 6 }}>
        Som van ieders Recordboek-totaal (heel seizoen) — jij werkt aan je eigen verbetering, en telt daarmee mee voor het team.
      </div>
    </div>
  );
}

function SpelerGeschiedenis({ player, trainings, goals, goalHistory, exercises }) {
  const openingsspelRegels = [...trainings]
    .filter((t) => t.spelers?.[player.id]?.openingsspel)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const wedstrijdRegels = [...trainings]
    .filter((t) => t.spelers?.[player.id]?.wedstrijd)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const doelGeschiedenis = doelGeschiedenisVoorSpeler(
    trainings,
    player.id,
    goalHistory[player.id] || [],
    goals[player.id] || null,
    exercises
  );

  return (
    <div style={{ background: "#f7f7fb", borderRadius: "0 0 8px 8px", padding: "10px 12px", marginBottom: 4 }}>
      <div className="cy-medium" style={{ fontSize: 11.5, color: COLORS.blue, marginBottom: 4 }}>OPENINGSSPEL</div>
      {openingsspelRegels.length === 0 && (
        <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 8 }}>Nog geen scores.</div>
      )}
      {openingsspelRegels.map((t) => (
        <div key={t.id} className="cy-regular" style={{ fontSize: 11, color: "#555" }}>
          {t.date}: {t.spelers[player.id].openingsspel} punten
        </div>
      ))}

      <div className="cy-medium" style={{ fontSize: 11.5, color: COLORS.blue, marginTop: 10, marginBottom: 4 }}>DOEL</div>
      {doelGeschiedenis.length === 0 && (
        <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 8 }}>Nog geen doel gekozen.</div>
      )}
      {[...doelGeschiedenis].reverse().map((h, i) => (
        <div key={i} className="cy-regular" style={{ fontSize: 11, color: "#555" }}>
          {h.assignment.exerciseName} ({h.assignment.chosenAt}
          {h.eindDatum ? ` t/m ${h.eindDatum}` : " · huidig"}): {h.beste !== null ? `beste score ${h.beste}` : "nog geen score"}
        </div>
      ))}

      <div className="cy-medium" style={{ fontSize: 11.5, color: COLORS.blue, marginTop: 10, marginBottom: 4 }}>WEDSTRIJD</div>
      {wedstrijdRegels.length === 0 && (
        <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b" }}>Nog geen wedstrijden.</div>
      )}
      {wedstrijdRegels.map((t) => (
        <div key={t.id} className="cy-regular" style={{ fontSize: 11, color: "#555" }}>
          {t.date}: {t.spelers[player.id].wedstrijd}
        </div>
      ))}
    </div>
  );
}

export default function StandenView({ players, trainings, periodStart, periodNumber, periodHistory, goals, goalHistory, exercises, teamGoal, recordboek }) {
  const periods = [
    { label: `Huidige periode (${periodNumber})`, start: periodStart, end: null },
    ...[...periodHistory].reverse().map((p) => ({ label: `Periode ${p.number} (${p.start} t/m ${p.end})`, start: p.start, end: p.end })),
  ];
  const [gekozen, setGekozen] = useState(0);
  const actief = periods[gekozen] || periods[0];
  const [uitgeklapt, setUitgeklapt] = useState(null);

  const { indivList } = useMemo(
    () => computeStandings(players, trainings, actief.start, actief.end),
    [players, trainings, actief.start, actief.end]
  );

  const dagenInPeriode = daysBetween(periodStart, todayISO());
  const weekNr = Math.min(8, Math.floor(dagenInPeriode / 7) + 1);

  return (
    <div>
      <PuntenUitleg />
      {teamGoal && <TeamVoortgang recordboek={recordboek} teamGoal={teamGoal} />}

      {periods.length > 1 && (
        <select value={gekozen} onChange={(e) => setGekozen(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 10 }}>
          {periods.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
      )}

      {gekozen === 0 && (
        <div className="scorepanel cy-regular" style={{ padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span>Periode {periodNumber}</span>
          <span>Week {weekNr} van 8</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {indivList.length === 0 && <Empty text="Nog geen punten in deze periode." />}
        {indivList.map((r, i) => {
          const open = uitgeklapt === r.player.id;
          return (
            <div key={r.player.id}>
              <div
                onClick={() => setUitgeklapt(open ? null : r.player.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: COLORS.white,
                  borderRadius: open ? "8px 8px 0 0" : 8,
                  padding: "10px 12px",
                  boxShadow: i === 0 && r.totaal > 0 ? "0 3px 10px rgba(44,43,124,.18)" : "0 1px 3px rgba(0,0,0,.07)",
                  border: i === 0 && r.totaal > 0 ? `1.5px solid ${COLORS.yellow}` : "1.5px solid transparent",
                  transition: "box-shadow .15s",
                  cursor: "pointer",
                }}
              >
                <RankBadge rank={i + 1} />
                <div style={{ flex: 1 }}>
                  <div className="cy-medium" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    {r.player.name}
                    {i === 0 && r.totaal > 0 && (
                      <span className="cy-black" style={{ fontSize: 9.5, color: COLORS.black, background: COLORS.yellow, padding: "2px 6px", borderRadius: 10 }}>
                        STRIKE!
                      </span>
                    )}
                  </div>
                  <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b" }}>
                    wedstrijd {r.wedstrijd} · openingsspel {r.openingsspel} · doel {r.doel}
                  </div>
                </div>
                <div className="tile-num" style={{ fontSize: 20, color: COLORS.blue }}>{r.totaal}</div>
                <span style={{ color: "#bbb", fontSize: 11 }}>{open ? "▾" : "▸"}</span>
              </div>
              {open && (
                <SpelerGeschiedenis player={r.player} trainings={trainings} goals={goals} goalHistory={goalHistory} exercises={exercises} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
