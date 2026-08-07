"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { Empty, TextButton } from "./shared";

function scoreLabel(personalRecords, playerId, exerciseId) {
  const v = personalRecords[`${playerId}:${exerciseId}`];
  return v === undefined ? "nog geen score" : String(v);
}

function Kaart({ children }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 6, padding: "10px 12px", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Vergelijking({ mijnNaam, mijnScore, haarNaam, haarScore }) {
  return (
    <div className="cy-medium" style={{ fontSize: 13, color: COLORS.blue, marginTop: 4, marginBottom: 6 }}>
      Jij: {mijnScore} — {haarNaam}: {haarScore}
    </div>
  );
}

export default function RivaliteitPanel({ mijnSpeler, mijnDoel, players, goals, personalRecords, rivalries, onProposeRivalry, onRespondRivalry, onEndRivalry }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [foutmelding, setFoutmelding] = useState("");

  const mijnRivaliteiten = useMemo(
    () => (mijnSpeler ? rivalries.filter((r) => r.playerA === mijnSpeler.id || r.playerB === mijnSpeler.id) : []),
    [rivalries, mijnSpeler]
  );

  if (!mijnSpeler || !mijnDoel) return null;

  const naam = (id) => players.find((p) => p.id === id)?.name || "?";
  const tegenstander = (r) => (r.playerA === mijnSpeler.id ? r.playerB : r.playerA);

  const actief = mijnRivaliteiten.filter((r) => r.status === "actief");
  const inkomend = mijnRivaliteiten.filter((r) => r.status === "voorgesteld" && r.proposedBy !== mijnSpeler.id);
  const uitgaand = mijnRivaliteiten.filter((r) => r.status === "voorgesteld" && r.proposedBy === mijnSpeler.id);

  const bezetTegenstanders = new Set(mijnRivaliteiten.map((r) => tegenstander(r)));
  const kandidaten = players.filter((p) => {
    if (p.id === mijnSpeler.id) return false;
    if (bezetTegenstanders.has(p.id)) return false;
    const haarDoel = goals[p.id];
    return haarDoel && haarDoel.exerciseId === mijnDoel.exerciseId;
  });

  async function actie(busyKey, fn, ...args) {
    setFoutmelding("");
    setBusyId(busyKey);
    const result = await fn(...args);
    setBusyId(null);
    if (!result.ok) setFoutmelding(result.message);
  }

  const totaalBadge = inkomend.length > 0 ? inkomend.length : null;

  return (
    <div style={{ marginTop: 20, marginBottom: 20 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cy-medium"
        style={{
          width: "100%",
          background: "none",
          border: `1.5px solid ${COLORS.blue}`,
          color: COLORS.blue,
          borderRadius: 6,
          padding: "10px 8px",
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {open ? "Rivaliteit verbergen" : "Rivaliteit"}
        {totaalBadge && (
          <span className="cy-black" style={{ fontSize: 10, color: COLORS.black, background: COLORS.yellow, padding: "2px 6px", borderRadius: 10 }}>
            {totaalBadge}
          </span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 10, lineHeight: 1.5 }}>
            Daag een speelster met hetzelfde doel uit. Jullie voortgang is alleen voor jullie tweeën zichtbaar,
            zolang je geen van beiden een nieuw doel kiest — dan vervalt de rivaliteit automatisch.
          </div>

          {foutmelding && (
            <div className="cy-medium" style={{ fontSize: 11.5, color: "#c0392b", marginBottom: 8 }}>{foutmelding}</div>
          )}

          {actief.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="cy-medium" style={{ fontSize: 11, color: COLORS.blue, marginBottom: 4 }}>ACTIEVE RIVALITEIT</div>
              {actief.map((r) => (
                <Kaart key={r.id}>
                  <div className="cy-medium" style={{ fontSize: 13 }}>{mijnDoel.exerciseName} — vs. {naam(tegenstander(r))}</div>
                  <Vergelijking
                    mijnNaam="Jij"
                    mijnScore={scoreLabel(personalRecords, mijnSpeler.id, r.exerciseId)}
                    haarNaam={naam(tegenstander(r))}
                    haarScore={scoreLabel(personalRecords, tegenstander(r), r.exerciseId)}
                  />
                  <TextButton
                    onClick={() => actie(r.id, onEndRivalry, r.id, mijnSpeler.id)}
                    disabled={busyId === r.id}
                    style={{ fontSize: 11.5, color: "#c0392b", opacity: busyId === r.id ? 0.5 : 1 }}
                  >
                    beëindig rivaliteit
                  </TextButton>
                </Kaart>
              ))}
            </div>
          )}

          {inkomend.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="cy-medium" style={{ fontSize: 11, color: COLORS.blue, marginBottom: 4 }}>UITDAGING ONTVANGEN</div>
              {inkomend.map((r) => (
                <Kaart key={r.id}>
                  <div className="cy-medium" style={{ fontSize: 13 }}>{naam(tegenstander(r))} daagt je uit — {mijnDoel.exerciseName}</div>
                  <Vergelijking
                    mijnNaam="Jij"
                    mijnScore={scoreLabel(personalRecords, mijnSpeler.id, r.exerciseId)}
                    haarNaam={naam(tegenstander(r))}
                    haarScore={scoreLabel(personalRecords, tegenstander(r), r.exerciseId)}
                  />
                  <div style={{ display: "flex", gap: 12 }}>
                    <TextButton
                      onClick={() => actie(r.id, onRespondRivalry, r.id, mijnSpeler.id, true)}
                      disabled={busyId === r.id}
                      style={{ fontSize: 12, color: "#2e8b57", opacity: busyId === r.id ? 0.5 : 1 }}
                    >
                      accepteren
                    </TextButton>
                    <TextButton
                      onClick={() => actie(r.id, onRespondRivalry, r.id, mijnSpeler.id, false)}
                      disabled={busyId === r.id}
                      style={{ fontSize: 12, color: "#c0392b", opacity: busyId === r.id ? 0.5 : 1 }}
                    >
                      afwijzen
                    </TextButton>
                  </div>
                </Kaart>
              ))}
            </div>
          )}

          {uitgaand.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="cy-medium" style={{ fontSize: 11, color: COLORS.blue, marginBottom: 4 }}>WACHT OP REACTIE</div>
              {uitgaand.map((r) => (
                <Kaart key={r.id}>
                  <div className="cy-medium" style={{ fontSize: 13 }}>Uitgenodigd: {naam(tegenstander(r))} — {mijnDoel.exerciseName}</div>
                  <TextButton
                    onClick={() => actie(r.id, onEndRivalry, r.id, mijnSpeler.id)}
                    disabled={busyId === r.id}
                    style={{ fontSize: 11.5, color: "#c0392b", opacity: busyId === r.id ? 0.5 : 1 }}
                  >
                    intrekken
                  </TextButton>
                </Kaart>
              ))}
            </div>
          )}

          <div className="cy-medium" style={{ fontSize: 11, color: COLORS.blue, marginBottom: 4 }}>UITDAGEN</div>
          {kandidaten.length === 0 && <Empty text="Niemand anders heeft op dit moment hetzelfde doel." />}
          {kandidaten.map((p) => (
            <Kaart key={p.id}>
              <div className="cy-medium" style={{ fontSize: 13 }}>{p.name}</div>
              <Vergelijking
                mijnNaam="Jij"
                mijnScore={scoreLabel(personalRecords, mijnSpeler.id, mijnDoel.exerciseId)}
                haarNaam={p.name}
                haarScore={scoreLabel(personalRecords, p.id, mijnDoel.exerciseId)}
              />
              <TextButton
                onClick={() => actie(p.id, onProposeRivalry, mijnSpeler.id, p.id)}
                disabled={busyId === p.id}
                style={{ fontSize: 12, color: COLORS.blue, opacity: busyId === p.id ? 0.5 : 1 }}
              >
                daag uit
              </TextButton>
            </Kaart>
          ))}
        </div>
      )}
    </div>
  );
}
