"use client";

import { useState } from "react";
import { COLORS, LOGO_SRC } from "@/lib/constants";
import { inputStyle } from "./shared";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen({ players }) {
  const { pickPlayerName, trainerLogin } = useAuth();
  const [trainerMode, setTrainerMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPlayer(name) {
    setBusy(true);
    setError("");
    const result = await pickPlayerName(name);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  async function submitTrainer() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    const result = await trainerLogin(email.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="header-gradient" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header subtitle={trainerMode ? "Trainer-login" : "Klik op je naam om verder te gaan"} />
      <div style={{ flex: 1, background: COLORS.paper, borderRadius: "24px 24px 0 0", padding: 20, overflowY: "auto" }}>
        {trainerMode ? (
          <div>
            <div className="cy-regular" style={{ fontSize: 12.5, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>
              Dit is een echte, serverside geverifieerde login — alleen geregistreerde trainers
              hebben toegang tot Beheer, het logboek en periode-afronding.
            </div>
            <input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTrainer()}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            {error && (
              <div className="cy-medium" style={{ color: "#c0392b", fontSize: 12, marginBottom: 8 }}>
                {error}
              </div>
            )}
            <button
              onClick={submitTrainer}
              disabled={busy}
              className="cy-black"
              style={{ width: "100%", background: COLORS.yellow, color: COLORS.black, border: "none", borderRadius: 6, padding: "14px 8px", fontSize: 14, cursor: "pointer", marginBottom: 8 }}
            >
              {busy ? "Bezig…" : "Inloggen"}
            </button>
            <button
              onClick={() => {
                setTrainerMode(false);
                setError("");
              }}
              className="cy-medium"
              style={{ width: "100%", background: "none", border: `1.5px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 6, padding: "12px 8px", fontSize: 13, cursor: "pointer" }}
            >
              Terug
            </button>
          </div>
        ) : (
          <>
            {players.length === 0 && (
              <div className="cy-regular" style={{ textAlign: "center", color: "#666", marginTop: 40, fontSize: 14 }}>
                Er zijn nog geen speelsters toegevoegd. Vraag de trainer om het team aan te maken via Beheer.
              </div>
            )}
            {error && (
              <div className="cy-medium" style={{ color: "#c0392b", fontSize: 12, marginBottom: 8 }}>
                {error}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {players.map((p) => (
                <button key={p.id} onClick={() => submitPlayer(p.name)} disabled={busy} className="cy-medium" style={playerButtonStyle}>
                  {p.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTrainerMode(true)}
              className="cy-medium"
              style={{ width: "100%", marginTop: 16, background: COLORS.black, color: COLORS.white, border: "none", borderRadius: 6, padding: "14px 8px", fontSize: 14, cursor: "pointer" }}
            >
              Trainer inloggen
            </button>
            <div className="cy-regular" style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
              Kies gewoon je eigen naam om scores in te vullen — alleen de trainerslogin is een echt account.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Header({ subtitle }) {
  return (
    <div style={{ padding: "40px 24px 20px", textAlign: "center" }}>
      <div style={{ background: COLORS.white, borderRadius: 8, padding: "8px 16px", display: "inline-block", marginBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="VCH" style={{ height: 40, width: "auto", display: "block" }} />
      </div>
      <div className="cy-black" style={{ color: COLORS.white, fontSize: 34, letterSpacing: 0.5 }}>
        HET CLAUSEMENT
      </div>
      <div className="cy-regular" style={{ color: COLORS.lightBlue, fontSize: 14, marginTop: 4 }}>
        {subtitle}
      </div>
    </div>
  );
}

const playerButtonStyle = {
  background: COLORS.white,
  border: `2px solid ${COLORS.blue}`,
  borderRadius: 6,
  padding: "14px 8px",
  fontSize: 14,
  color: COLORS.black,
  cursor: "pointer",
};
