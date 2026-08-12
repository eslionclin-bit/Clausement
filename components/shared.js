"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_IMPORT } from "@/lib/constants";

// Voor animaties die prefers-reduced-motion moeten respecteren: als dit true
// is, tonen componenten alleen een korte statische bevestiging (geen
// beweging) i.p.v. de bal/kegel-animaties.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function GlobalStyle() {
  return (
    <style>{`
      ${FONT_IMPORT}
      .cy-black { font-family: 'Archivo Black', 'Archivo', sans-serif; font-weight: 900; }
      .cy-medium { font-family: 'Archivo', sans-serif; font-weight: 500; }
      .cy-regular { font-family: 'Archivo', sans-serif; font-weight: 400; }
      .scorepanel {
        background: linear-gradient(135deg, ${COLORS.blue} 0%, #1c1b5c 100%);
        color: ${COLORS.white};
        border-radius: 8px;
        box-shadow: 0 3px 8px rgba(44,43,124,.25);
      }
      .header-gradient {
        background: linear-gradient(160deg, ${COLORS.blue} 0%, #22215f 100%);
      }
      .tile-num {
        font-family: 'Archivo Black', sans-serif;
        font-variant-numeric: tabular-nums;
      }
      .stripe {
        background: #1c1b5c;
      }
      @keyframes strikeOverlayFade {
        0% { opacity: 0; }
        6% { opacity: 1; }
        82% { opacity: 1; }
        100% { opacity: 0; }
      }
      .strike-overlay {
        animation: strikeOverlayFade 2.6s ease both;
      }
      @keyframes screenFlash {
        0% { opacity: 0; }
        18% { opacity: 1; }
        100% { opacity: 0; }
      }
      .strike-flash {
        animation: screenFlash 1.1s ease-out both;
      }
      @keyframes strikePop {
        0% { transform: scale(0.3) rotate(-12deg); opacity: 0; }
        45% { transform: scale(1.3) rotate(4deg); opacity: 1; }
        65% { transform: scale(0.94) rotate(-2deg); }
        82% { transform: scale(1.08) rotate(1deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      .strike-badge {
        animation: strikePop .7s cubic-bezier(.34,1.6,.5,1) .6s both;
      }
      @keyframes strikeBallRoll {
        0% { transform: translateX(-150px) rotate(0deg); opacity: 0; }
        7% { opacity: 1; }
        58% { transform: translateX(0) rotate(620deg); opacity: 1; }
        100% { transform: translateX(0) rotate(620deg); opacity: 1; }
      }
      .strike-ball {
        animation: strikeBallRoll 1.05s cubic-bezier(.3,.9,.4,1) both;
        transform-box: fill-box;
        transform-origin: center;
      }
      @keyframes impactRing {
        0%, 55% { transform: scale(0); opacity: 0; }
        60% { transform: scale(0.3); opacity: .9; }
        100% { transform: scale(3); opacity: 0; }
      }
      .strike-impact {
        animation: impactRing .8s ease-out .52s both;
        transform-box: fill-box;
        transform-origin: center;
      }
      @keyframes pinScatter {
        0%, 55% { transform: translate(0,0) rotate(0deg); opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
      }
      .strike-pin {
        animation: pinScatter .95s ease-in both;
        transform-box: fill-box;
        transform-origin: center;
      }
      @keyframes confettiBurst {
        0%, 52% { transform: rotate(var(--angle)) translateX(0) rotate(0deg); opacity: 0; }
        60% { opacity: 1; }
        100% { transform: rotate(var(--angle)) translateX(var(--distance)) rotate(720deg); opacity: 0; }
      }
      .confetti-piece {
        position: absolute;
        top: 0;
        left: 0;
        animation: confettiBurst 1.3s cubic-bezier(.2,.8,.3,1) .48s both;
      }
      @keyframes loadingBallRoll {
        0% { transform: translateX(0) rotate(0deg); }
        100% { transform: translateX(95px) rotate(360deg); }
      }
      .loading-ball {
        animation: loadingBallRoll 1.1s linear infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      @keyframes fadeInUp {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .fade-in {
        animation: fadeInUp .4s ease both;
      }
      @media (prefers-reduced-motion: reduce) {
        .strike-overlay, .strike-flash, .strike-badge, .strike-ball, .strike-impact, .strike-pin, .confetti-piece, .loading-ball, .fade-in {
          animation: none !important;
        }
      }
      button { transition: transform .1s ease, box-shadow .15s ease, opacity .15s ease; }
      button:active { transform: scale(0.97); }
      input, select { font-family: 'Archivo', sans-serif; }
      ::selection { background: ${COLORS.yellow}; color: ${COLORS.black}; }
      body { margin: 0; }
    `}</style>
  );
}

export function Banner({ tone = "yellow", children }) {
  const bg = tone === "yellow" ? COLORS.yellow : COLORS.lightBlue;
  return (
    <div
      className="cy-medium"
      style={{
        background: bg,
        color: COLORS.black,
        padding: "10px 14px",
        borderRadius: 4,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// Voor tekst-acties ("wijzigen", "verwijderen", "accepteren", ...) die er als
// link uitzien maar wél een echte, met toetsenbord bereikbare knop moeten
// zijn — vervangt de eerdere <span onClick> die Tab volledig oversloeg.
export function TextButton({ onClick, disabled, className = "cy-medium", style, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        textAlign: "inherit",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function TabButton({ active, onClick, badge, children }) {
  return (
    <button
      onClick={onClick}
      className="cy-medium"
      style={{
        flex: 1,
        padding: "10px 6px",
        fontSize: 13,
        border: "none",
        borderRadius: "4px 4px 0 0",
        background: active ? COLORS.yellow : "transparent",
        color: active ? COLORS.black : COLORS.white,
        opacity: active ? 1 : 0.75,
        cursor: "pointer",
        transition: "all .15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {children}
      {badge > 0 && (
        <span
          className="cy-black"
          style={{
            fontSize: 10,
            color: active ? COLORS.white : COLORS.black,
            background: active ? COLORS.blue : COLORS.yellow,
            padding: "2px 6px",
            borderRadius: 10,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function RankBadge({ rank }) {
  const gradients = {
    1: `linear-gradient(145deg, #ffe046, ${COLORS.yellow})`,
    2: "linear-gradient(145deg, #ececec, #cfcfcf)",
    3: "linear-gradient(145deg, #dc9f5f, #b97a3a)",
  };
  const bg = gradients[rank] || COLORS.blue;
  const fg = rank <= 3 ? COLORS.black : COLORS.white;
  return (
    <div
      className="tile-num"
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        flexShrink: 0,
        boxShadow: rank <= 3 ? "0 2px 4px rgba(0,0,0,.2)" : "none",
      }}
    >
      {rank}
    </div>
  );
}

export function Empty({ text }) {
  return (
    <div
      className="cy-regular"
      style={{ textAlign: "center", color: "#6b6b6b", fontSize: 13, padding: "30px 10px", background: "#fff", borderRadius: 6 }}
    >
      {text}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="cy-medium" style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function MiniNum({ label, value, onChange, max, warnAbove }) {
  const teHoog = warnAbove && Number(value) > warnAbove;
  return (
    <div style={{ flex: 1 }}>
      <div className="cy-regular" style={{ fontSize: 10, color: "#6b6b6b", marginBottom: 2 }}>
        {label}
      </div>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          let v = Math.max(0, Number(e.target.value) || 0);
          if (max) v = Math.min(max, v);
          onChange(v);
        }}
        style={{
          ...inputStyle,
          padding: "6px 8px",
          fontSize: 13,
          textAlign: "center",
          borderColor: teHoog ? "#c0392b" : undefined,
          background: teHoog ? "#fdecea" : COLORS.white,
        }}
      />
      {teHoog && (
        <div className="cy-regular" style={{ fontSize: 9, color: "#c0392b", marginTop: 2, lineHeight: 1.2 }}>
          Weet je het zeker? Dat is best hoog.
        </div>
      )}
    </div>
  );
}

export const inputStyle = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 6,
  border: `1.5px solid #d7d7e0`,
  fontSize: 14,
  background: COLORS.white,
  boxSizing: "border-box",
};
