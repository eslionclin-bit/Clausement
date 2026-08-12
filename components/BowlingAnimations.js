"use client";

// Lichtgewicht bal/kegel-graphics voor twee momenten: elke geslaagde
// score-opslag (beeldvullend, drie afwisselende varianten — STRIKE!) en het
// laadscherm (doorlopende lus). Puur CSS-animatie op een paar SVG-vormen,
// geen canvas/afbeeldingen nodig. Componenten die deze renderen zijn zelf
// verantwoordelijk voor het niet-mounten ervan onder prefers-reduced-motion
// (zie usePrefersReducedMotion in shared.js) — hier zit alleen de teken- en
// animatielaag.

import { COLORS } from "@/lib/constants";

// Bowlingbal met vingergaatjes, op de gewenste schaal.
function Ball({ cx = 0, cy = 0, r, fill = COLORS.black, holeFill = "#fff" }) {
  const hr = Math.max(r * 0.13, 1);
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={r} fill={fill} />
      <circle cx={-r * 0.22} cy={-r * 0.28} r={hr} fill={holeFill} opacity="0.85" />
      <circle cx={r * 0.22} cy={-r * 0.28} r={hr} fill={holeFill} opacity="0.85" />
      <circle cx={0} cy={r * 0.05} r={hr} fill={holeFill} opacity="0.6" />
    </g>
  );
}

function Pin({ x, y, dx, dy, rot, delay, stripe = COLORS.yellow }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g className="strike-pin" style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, "--rot": `${rot}deg`, animationDelay: `${delay}s` }}>
        <rect x={-3.5} y={-10} width="7" height="20" rx="3.5" fill="#fff" />
        <rect x={-3.5} y={-5} width="7" height="3" fill={stripe} />
      </g>
    </g>
  );
}

// Volledig 10-kegel bowlingrek (klassieke driehoek), apex naar links — de
// bal rolt van links naar rechts en raakt 'm daar als eerste. dx/dy zijn de
// richtingen waarin elke kegel uit elkaar spat bij impact.
const PIN_LAYOUT = [
  { x: 0, y: 0, dx: -75, dy: 0, rot: -200 },
  { x: 15, y: -9, dx: -55, dy: -58, rot: 250, delay: 0.02 },
  { x: 15, y: 9, dx: -55, dy: 58, rot: -250, delay: 0.03 },
  { x: 30, y: -18, dx: -20, dy: -90, rot: 310, delay: 0.05 },
  { x: 30, y: 0, dx: 15, dy: -80, rot: -190, delay: 0.01 },
  { x: 30, y: 18, dx: -20, dy: 90, rot: -310, delay: 0.06 },
  { x: 45, y: -27, dx: 35, dy: -95, rot: 270, delay: 0.08 },
  { x: 45, y: -9, dx: 60, dy: -42, rot: -230, delay: 0.04 },
  { x: 45, y: 9, dx: 60, dy: 42, rot: 230, delay: 0.07 },
  { x: 45, y: 27, dx: 35, dy: 95, rot: -270, delay: 0.09 },
];

const CONFETTI_COLORS = [COLORS.yellow, COLORS.lightBlue, "#fff", "#ff6b6b", "#2e8b57"];
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  angle: (360 / 26) * i + (i % 2) * 7,
  distance: 130 + ((i * 41) % 110),
  size: 5 + (i % 4) * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: (i % 7) * 0.025,
}));

function Confetti() {
  return (
    <div style={{ position: "fixed", top: "42%", left: "50%", zIndex: 1000, pointerEvents: "none" }}>
      {CONFETTI.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 1,
            "--angle": `${p.angle}deg`,
            "--distance": `${p.distance}px`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Drie visueel verschillende varianten die om beurten getoond worden, zodat
// het bij elke opslag knalt zonder dat het na een paar keer saai wordt.
const VARIANTS = [
  { rotate: 0, flash: "radial-gradient(circle at 50% 45%, rgba(255,212,0,.55), transparent 65%)", badgeBg: COLORS.yellow, badgeColor: COLORS.black, emoji: "🎳" },
  { rotate: 90, flash: "radial-gradient(circle at 50% 45%, rgba(117,170,219,.6), transparent 65%)", badgeBg: COLORS.lightBlue, badgeColor: COLORS.white, emoji: "💥" },
  { rotate: -35, flash: "radial-gradient(circle at 50% 45%, rgba(255,107,107,.5), transparent 65%)", badgeBg: "#ff6b6b", badgeColor: COLORS.white, emoji: "✨" },
];

export function strikeVariantCount() {
  return VARIANTS.length;
}

// Beeldvullende viering bij elke geslaagde score-opslag — bal rolt in,
// volledig kegelrek spat alle kanten op, confetti barst los, STRIKE-badge
// knalt erover. `variantIndex` kiest welke van de VARIANTS getoond wordt.
export function StrikeCelebration({ variantIndex = 0 }) {
  const v = VARIANTS[variantIndex % VARIANTS.length];
  return (
    <div className="strike-overlay" style={{ position: "fixed", inset: 0, zIndex: 998, pointerEvents: "none" }}>
      <div className="strike-flash" style={{ position: "absolute", inset: 0, background: v.flash }} />
      <Confetti />
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <svg width="340" height="288" viewBox="-130 -110 260 220" style={{ overflow: "visible", maxWidth: "88vw", height: "auto" }}>
          <g transform={`rotate(${v.rotate})`}>
            <circle className="strike-impact" r="16" fill={v.badgeBg} opacity="0.5" />
            {PIN_LAYOUT.map((p, i) => (
              <Pin key={i} {...p} delay={0.5 + (p.delay || 0)} />
            ))}
            <g className="strike-ball">
              <Ball r={16} />
            </g>
          </g>
        </svg>
        <div
          className="strike-badge cy-black"
          style={{
            background: v.badgeBg,
            color: v.badgeColor,
            fontSize: "clamp(28px, 9vw, 40px)",
            padding: "16px 32px",
            borderRadius: 14,
            boxShadow: "0 10px 32px rgba(0,0,0,.4)",
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          STRIKE! {v.emoji}
        </div>
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
      <g transform="translate(118,16)">
        <rect x={-3.5} y={-10} width="7" height="20" rx="3.5" fill="#fff" />
        <rect x={-3.5} y={-5} width="7" height="3" fill={COLORS.yellow} />
      </g>
      <g transform="translate(110,20)">
        <rect x={-3.5} y={-10} width="7" height="20" rx="3.5" fill="#fff" />
        <rect x={-3.5} y={-5} width="7" height="3" fill={COLORS.yellow} />
      </g>
      <g transform="translate(126,20)">
        <rect x={-3.5} y={-10} width="7" height="20" rx="3.5" fill="#fff" />
        <rect x={-3.5} y={-5} width="7" height="3" fill={COLORS.yellow} />
      </g>
      <line x1="0" y1="30" x2="140" y2="30" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      <g className={animated ? "loading-ball" : undefined}>
        <Ball cx={10} cy={26} r={8} fill={COLORS.yellow} holeFill={COLORS.blue} />
      </g>
    </svg>
  );
}
