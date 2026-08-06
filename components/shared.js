"use client";

import { COLORS, FONT_IMPORT } from "@/lib/constants";

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
      @keyframes strikePop {
        0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
        35% { transform: scale(1.15) rotate(3deg); opacity: 1; }
        60% { transform: scale(1) rotate(0deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 0; }
      }
      .strike-badge {
        animation: strikePop 1.4s ease forwards;
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

export function TabButton({ active, onClick, children }) {
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
      }}
    >
      {children}
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
      style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "30px 10px", background: "#fff", borderRadius: 6 }}
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
      <div className="cy-regular" style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>
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
