"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { daysBetween, todayISO } from "@/lib/util";
import { Banner, Empty, inputStyle } from "./shared";

const SEIZOEN_BEVESTIGING = "NIEUW SEIZOEN";

export default function BeheerView({
  players,
  onAddPlayer,
  onRemovePlayer,
  periodNumber,
  periodStart,
  onResetPeriode,
  auditLog,
  onEditTraining,
  onStartNewSeason,
  onExportBackup,
  teamGoal,
  onSetTeamGoal,
}) {
  const [naam, setNaam] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [teamGoalInput, setTeamGoalInput] = useState(teamGoal ?? "");
  const [errorMsg, setErrorMsg] = useState("");
  const [nieuweStartDatum, setNieuweStartDatum] = useState(todayISO());
  const dagen = daysBetween(periodStart, todayISO());

  const [showSeizoen, setShowSeizoen] = useState(false);
  const [seizoenStartDatum, setSeizoenStartDatum] = useState(todayISO());
  const [seizoenBevestiging, setSeizoenBevestiging] = useState("");
  const [seizoenBezig, setSeizoenBezig] = useState(false);

  async function handleResetPeriode() {
    if (!confirm(`Periode afronden per ${nieuweStartDatum}? Het Clausement gaat terug naar 0. Het Recordboek blijft staan.`)) return;
    const result = await onResetPeriode(nieuweStartDatum);
    if (!result.ok) setErrorMsg(result.message);
    else setNieuweStartDatum(todayISO());
  }

  async function handleStartNewSeason() {
    setSeizoenBezig(true);
    const result = await onStartNewSeason(seizoenStartDatum);
    setSeizoenBezig(false);
    if (!result.ok) {
      setErrorMsg(result.message);
      return;
    }
    setSeizoenBevestiging("");
    setShowSeizoen(false);
  }

  return (
    <div>
      {errorMsg && <Banner tone="yellow">{errorMsg}</Banner>}

      <div className="scorepanel" style={{ padding: 14, marginBottom: 18 }}>
        <div className="cy-medium" style={{ fontSize: 13, marginBottom: 4 }}>Periode {periodNumber} — dag {dagen} van ~56</div>
        <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, marginBottom: 10 }}>Start: {periodStart}</div>
        <div style={{ marginBottom: 10 }}>
          <div className="cy-regular" style={{ fontSize: 11, color: COLORS.lightBlue, marginBottom: 4 }}>
            Startdatum volgende periode (hoeft niet direct aan te sluiten)
          </div>
          <input type="date" value={nieuweStartDatum} onChange={(e) => setNieuweStartDatum(e.target.value)} style={inputStyle} />
        </div>
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
        onClick={() => setShowSeizoen((v) => !v)}
        className="cy-medium"
        style={{ width: "100%", marginTop: 12, background: "none", border: "1.5px solid #c0392b", color: "#c0392b", borderRadius: 6, padding: "10px 8px", fontSize: 13, cursor: "pointer" }}
      >
        {showSeizoen ? "Nieuw seizoen verbergen" : "Nieuw seizoen starten"}
      </button>
      {showSeizoen && (
        <div style={{ marginTop: 10, marginBottom: 20, background: "#fdecea", borderRadius: 6, padding: 12 }}>
          <div className="cy-medium" style={{ fontSize: 12.5, color: "#c0392b", marginBottom: 6 }}>
            Let op: dit kan niet ongedaan gemaakt worden
          </div>
          <div className="cy-regular" style={{ fontSize: 11.5, color: "#555", marginBottom: 10, lineHeight: 1.5 }}>
            Dit wist definitief het Recordboek (totalen, persoonlijke records, doel-geschiedenis, huidige
            doelen) en alle periodes — het Clausement begint weer bij Periode 1. Oude seizoensdata blijft
            daarna niet meer zichtbaar of vergelijkbaar in de app. Spelers, oefeningen, teamdoel en het
            logboek blijven wel gewoon staan. Exporteer hierboven eerst een backup als je de oude stand wil
            bewaren.
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="cy-regular" style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Startdatum nieuwe Periode 1</div>
            <input type="date" value={seizoenStartDatum} onChange={(e) => setSeizoenStartDatum(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="cy-regular" style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
              Typ &quot;{SEIZOEN_BEVESTIGING}&quot; om te bevestigen
            </div>
            <input
              value={seizoenBevestiging}
              onChange={(e) => setSeizoenBevestiging(e.target.value)}
              placeholder={SEIZOEN_BEVESTIGING}
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleStartNewSeason}
            disabled={seizoenBezig || seizoenBevestiging.trim().toUpperCase() !== SEIZOEN_BEVESTIGING}
            className="cy-medium"
            style={{
              width: "100%",
              background: "#c0392b",
              color: COLORS.white,
              border: "none",
              borderRadius: 6,
              padding: "10px 8px",
              fontSize: 13,
              cursor: seizoenBevestiging.trim().toUpperCase() === SEIZOEN_BEVESTIGING ? "pointer" : "not-allowed",
              opacity: seizoenBevestiging.trim().toUpperCase() === SEIZOEN_BEVESTIGING ? 1 : 0.5,
            }}
          >
            {seizoenBezig ? "BEZIG…" : "NIEUW SEIZOEN STARTEN"}
          </button>
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
              <div className="cy-regular" style={{ fontSize: 11.5, color: "#555", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>
                  <span className="cy-medium">{log.by || "onbekend"}</span>{" "}
                  {log.action === "seizoen gestart" ? (
                    <>heeft een nieuw seizoen gestart (vanaf {log.trainingDate})</>
                  ) : (
                    <>heeft training van {log.trainingDate} {log.action}</>
                  )}
                  <span style={{ color: "#aaa" }}> · {new Date(log.at).toLocaleString("nl-NL")}</span>
                </span>
                {log.action !== "seizoen gestart" && (
                  <span
                    onClick={() => onEditTraining(log.trainingDate)}
                    className="cy-medium"
                    style={{ fontSize: 11, color: COLORS.blue, cursor: "pointer", flexShrink: 0 }}
                  >
                    bewerk scores
                  </span>
                )}
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
              {log.summary && log.action !== "seizoen gestart" && (
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
