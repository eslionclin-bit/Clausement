"use client";

// Lichtgewicht bal/kegel-graphics voor twee momenten: elke geslaagde
// score-opslag (groot, uitbundig — STRIKE!) en het laadscherm (doorlopende
// lus). Puur CSS-animatie op een paar SVG-vormen, geen canvas/afbeeldingen
// nodig. Componenten die deze renderen zijn zelf verantwoordelijk voor het
// niet-mounten ervan onder prefers-reduced-motion (zie usePrefersReducedMotion
// in shared.js) — hier zit alleen de teken- en animatielaag.

import { COLORS } from "@/lib/constants";

// Klein bolletje met vingergaatjes — de "bowlingbal" op app-schaal.
function Ball({ cx, cy, r, fill = COLORS.black, holeFill = "#fff" }) {
  const hr = Math.max(r * 0.13, 1);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx - r * 0.22} cy={cy - r * 0.28} r={hr} fill={holeFill} opacity="0.85" />
      <circle cx={cx + r * 0.22} cy={cy - r * 0.28} r={hr} fill={holeFill} opacity="0.85" />
      <circle cx={cx} cy={cy + r * 0.05} r={hr} fill={holeFill} opacity="0.6" />
    </>
  );
}

function Pin({ x, y, className, stripe = COLORS.yellow }) {
  return (
    <g className={className}>
      <rect x={x} y={y} width="7" height="20" rx="3.5" fill="#fff" />
      <rect x={x} y={y + 5} width="7" height="3" fill={stripe} />
    </g>
  );
}

// Bij elke geslaagde score-opslag — bal rolt door, kegels vallen om, STRIKE!
export function StrikeCelebration() {
  return (
    <div
      style={{
        position: "fixed",
        top: "38%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 999,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <svg width="180" height="64" viewBox="0 0 180 64" style={{ overflow: "visible" }}>
        <Pin x={140} y={20} className="strike-pin-a" />
        <Pin x={160} y={20} className="strike-pin-b" />
        <Pin x={150} y={14} className="strike-pin-c" />
        <Pin x={150} y={26} className="strike-pin-d" />
        <g className="strike-ball">
          <Ball cx={150} cy={46} r={10} />
        </g>
      </svg>
      <div
        className="strike-badge cy-black"
        style={{
          background: COLORS.yellow,
          color: COLORS.black,
          fontSize: 32,
          padding: "14px 28px",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          letterSpacing: 1,
        }}
      >
        STRIKE! 🎳
      </div>
    </div>
  );
}

// Laadscherm — bal rolt herhalend richting een rijtje kegels. Zelfde markup
// in rust (geen "loading-ball"-klasse) dient als statisch beeld bij
// reduced-motion — geen aparte fallback-tekening nodig.
export function LoadingLane({ animated = true }) {
  return (
    <svg width="140" height="40" viewBox="0 0 140 40" style={{ overflow: "visible" }}>
      <Pin x={118} y={6} stripe={COLORS.yellow} />
      <Pin x={110} y={10} stripe={COLORS.yellow} />
      <Pin x={126} y={10} stripe={COLORS.yellow} />
      <line x1="0" y1="30" x2="140" y2="30" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      <g className={animated ? "loading-ball" : undefined}>
        <Ball cx={10} cy={26} r={8} fill={COLORS.yellow} holeFill={COLORS.blue} />
      </g>
    </svg>
  );
}
