import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const PALETTES = {
  noir: {
    name: "Noir",
    bg: "#111010", page: "#111010", card: "#1C1B1A",
    border: "#2E2C2A", text: "#F0EBE3", muted: "#7A746D",
    dim: "#2E2C2A", accent: "#C9853A", glow: "#C9853A", tag: "#201F1E",
  },
  parchment: {
    name: "Parchment",
    bg: "#F2EDE5", page: "#F2EDE5", card: "#FEFCF9",
    border: "#D8D0C5", text: "#1A1714", muted: "#6B6158",
    dim: "#C8C0B5", accent: "#A8390A", glow: "#A8390A", tag: "#EDE8E0",
  },
  slate: {
    name: "Slate",
    bg: "#0D1117", page: "#0D1117", card: "#161B22",
    border: "#21262D", text: "#E6EDF3", muted: "#7D8590",
    dim: "#21262D", accent: "#2F81F7", glow: "#2F81F7", tag: "#1C2128",
  },
  forest: {
    name: "Forest",
    bg: "#0A0F0A", page: "#0A0F0A", card: "#121812",
    border: "#1E2E1E", text: "#D8EDDA", muted: "#5A8A5A",
    dim: "#1E2E1E", accent: "#3CB371", glow: "#3CB371", tag: "#141E14",
  },
  rose: {
    name: "Rose",
    bg: "#FFFAF9", page: "#FFFAF9", card: "#FFFFFF",
    border: "#F0E0DC", text: "#1A0A08", muted: "#9A6A60",
    dim: "#E8D0C8", accent: "#C04040", glow: "#C04040", tag: "#FBF3F0",
  },
  midnight: {
    name: "Midnight",
    bg: "#070B14", page: "#070B14", card: "#0E1520",
    border: "#18243A", text: "#C8D8F0", muted: "#5070A0",
    dim: "#18243A", accent: "#7AADFF", glow: "#7AADFF", tag: "#101B2E",
  },
};

const TYPEFACES = {
  cormorant: {
    name: "Cormorant",
    url: "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap",
    serif: "'Cormorant', Georgia, serif",
    sans: "'DM Sans', system-ui, sans-serif",
    mono: "'DM Mono', 'Courier New', monospace",
  },
  syne: {
    name: "Syne",
    url: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=Syne+Mono&family=Lato:wght@300;400&display=swap",
    serif: "'Syne', sans-serif",
    sans: "'Lato', sans-serif",
    mono: "'Syne Mono', monospace",
  },
  playfair: {
    name: "Playfair",
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Barlow:wght@300;400&family=Barlow+Condensed:wght@300;400&display=swap",
    serif: "'Playfair Display', Georgia, serif",
    sans: "'Barlow', sans-serif",
    mono: "'Barlow Condensed', sans-serif",
  },
  monument: {
    name: "Monument",
    url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Space+Mono:wght@400&display=swap",
    serif: "'Space Mono', monospace",
    sans: "'Space Grotesk', sans-serif",
    mono: "'Space Mono', monospace",
  },
};

// ─── Surface modes: the headline feature ─────────────────────────────────────
// filled  → card bg + border
// outlined→ transparent + border only
// ghost   → completely invisible, pure content
const SURFACES = {
  filled:   { label: "Filled",   desc: "Card background" },
  outlined: { label: "Outlined", desc: "Border only" },
  ghost:    { label: "Ghost",    desc: "No background" },
};

const RADII = { sharp: 0, soft: 6, round: 14, pill: 22 };
const COLS = 12;

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════
const uid = () => Math.random().toString(36).slice(2, 8);

function surfaceStyle(surface, p, radius, pad) {
  const r = RADII[radius] ?? 14;
  const padding = pad ?? 16;
  if (surface === "ghost")    return { background: "transparent", border: "none",                     borderRadius: r, padding, overflow: "hidden" };
  if (surface === "outlined") return { background: "transparent", border: `1px solid ${p.border}`,   borderRadius: r, padding, overflow: "hidden" };
  return                              { background: p.card,        border: `1px solid ${p.border}`,   borderRadius: r, padding, overflow: "hidden" };
}

const store = {
  async get(k) { try { const r = await window.storage?.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(k, v) { try { await window.storage?.set(k, JSON.stringify(v)); } catch {} },
};

async function ai(system, user, maxTokens = 400) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    const d = await r.json();
    return d.content?.[0]?.text || "";
  } catch { return ""; }
}

async function aiJSON(sys, user, max = 300) {
  const raw = await ai(sys, user, max);
  try { return JSON.parse(raw.replace(/```json?|```/g, "").trim()); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
function Dots({ p }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: p.muted, display: "inline-block", animation: `dotpulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </span>
  );
}

function Btn({ p, f, onClick, loading, children, full, small, variant = "outline" }) {
  const styles = {
    outline: { bg: "transparent", border: `1px solid ${loading ? p.dim : p.accent}`, color: loading ? p.muted : p.accent },
    solid:   { bg: loading ? p.dim : p.accent, border: "none", color: "#fff" },
    ghost:   { bg: "transparent", border: `1px solid ${p.dim}`, color: p.muted },
  }[variant];
  return (
    <button onClick={onClick} disabled={loading} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      background: styles.bg, border: styles.border, borderRadius: 5,
      padding: small ? "0.2rem 0.5rem" : "0.28rem 0.65rem",
      color: styles.color, cursor: loading ? "default" : "pointer",
      fontSize: "0.67rem", fontFamily: "inherit", width: full ? "100%" : undefined,
      transition: "all 0.15s", letterSpacing: "0.03em",
    }}>
      {loading ? <Dots p={p} /> : <>{children}</>}
    </button>
  );
}

function Switch({ p, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 32, height: 18, borderRadius: 9, background: value ? p.accent : p.dim, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", left: value ? "16px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WIDGET CATALOG
// ═══════════════════════════════════════════════════════════════════════
const WIDGETS = [
  { type: "clock",      name: "Clock",       icon: "◷",  w: 8,  h: 2, cat: "Time"  },
  { type: "worldclock", name: "World Clock", icon: "⊕",  w: 4,  h: 2, cat: "Time"  },
  { type: "stopwatch",  name: "Stopwatch",   icon: "⊙",  w: 4,  h: 2, cat: "Time"  },
  { type: "countdown",  name: "Countdown",   icon: "⌛",  w: 4,  h: 2, cat: "Time"  },
  { type: "search",     name: "AI Search",   icon: "✦",  w: 8,  h: 1, cat: "AI"    },
  { type: "chat",       name: "AI Chat",     icon: "⌬",  w: 7,  h: 4, cat: "AI"    },
  { type: "briefing",   name: "Briefing",    icon: "☀",  w: 4,  h: 2, cat: "AI"    },
  { type: "poem",       name: "Poem",        icon: "◊",  w: 4,  h: 2, cat: "AI"    },
  { type: "quote",      name: "Quote",       icon: "❝",  w: 4,  h: 2, cat: "AI"    },
  { type: "weather",    name: "Weather",     icon: "△",  w: 4,  h: 2, cat: "Info"  },
  { type: "news",       name: "Headlines",   icon: "▤",  w: 4,  h: 2, cat: "Info"  },
  { type: "stocks",     name: "Market",      icon: "◈",  w: 4,  h: 2, cat: "Info"  },
  { type: "todo",       name: "Tasks",       icon: "▦",  w: 4,  h: 3, cat: "Work"  },
  { type: "habits",     name: "Habits",      icon: "◉",  w: 4,  h: 3, cat: "Work"  },
  { type: "goals",      name: "Goals",       icon: "◈",  w: 4,  h: 3, cat: "Work"  },
  { type: "journal",    name: "Journal",     icon: "▭",  w: 5,  h: 3, cat: "Work"  },
  { type: "notes",      name: "Notes",       icon: "▤",  w: 4,  h: 2, cat: "Work"  },
  { type: "kanban",     name: "Kanban",      icon: "⊞",  w: 9,  h: 4, cat: "Work"  },
  { type: "pomodoro",   name: "Pomodoro",    icon: "⊘",  w: 4,  h: 2, cat: "Work"  },
  { type: "calendar",   name: "Calendar",    icon: "▦",  w: 4,  h: 3, cat: "Work"  },
  { type: "mood",       name: "Mood",        icon: "◡",  w: 5,  h: 2, cat: "Life"  },
  { type: "breathing",  name: "Breathing",   icon: "◌",  w: 4,  h: 3, cat: "Life"  },
  { type: "water",      name: "Water",       icon: "▽",  w: 3,  h: 2, cat: "Life"  },
  { type: "sleep",      name: "Sleep",       icon: "◑",  w: 4,  h: 2, cat: "Life"  },
  { type: "calc",       name: "Calculator",  icon: "⊞",  w: 4,  h: 3, cat: "Tools" },
  { type: "currency",   name: "Currency",    icon: "⇄",  w: 4,  h: 2, cat: "Tools" },
  { type: "converter",  name: "Converter",   icon: "⇋",  w: 4,  h: 2, cat: "Tools" },
  { type: "heading",    name: "Heading",     icon: "H",  w: 6,  h: 1, cat: "Text"  },
  { type: "label",      name: "Label",       icon: "T",  w: 4,  h: 2, cat: "Text"  },
  { type: "divider",    name: "Divider",     icon: "—",  w: 12, h: 1, cat: "Text"  },
  { type: "image",      name: "Image",       icon: "□",  w: 4,  h: 3, cat: "Text"  },
];

// ═══════════════════════════════════════════════════════════════════════
// INDIVIDUAL WIDGET BODIES
// ═══════════════════════════════════════════════════════════════════════

function WClock({ p, f, s }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const use24 = s.timeFormat === "24h";
  let h = now.getHours(), mm = String(now.getMinutes()).padStart(2, "0"), ss = String(now.getSeconds()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM"; if (!use24) h = h % 12 || 12;
  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const pct = (now.getSeconds() / 60) * 100;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.05em", lineHeight: 1 }}>
        <span style={{ fontFamily: f.serif, fontWeight: 300, fontSize: "clamp(2.8rem,6vw,6.5rem)", letterSpacing: "-0.04em", color: p.text }}>
          {String(h).padStart(2, "0")}
          <span style={{ opacity: 0.18, animation: "blink 1s step-end infinite" }}>:</span>
          {mm}
        </span>
        <span style={{ fontFamily: f.mono, fontSize: "0.9rem", color: p.muted, marginLeft: "0.5rem" }}>{ss}</span>
        {!use24 && <span style={{ fontFamily: f.sans, fontSize: "0.85rem", color: p.muted, marginLeft: "0.3rem", fontWeight: 300 }}>{ap}</span>}
      </div>
      <div style={{ fontFamily: f.mono, color: p.muted, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: "0.5rem" }}>
        {DAYS[now.getDay()]} · {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
      </div>
      <div style={{ height: 1, background: p.dim, marginTop: "0.7rem", borderRadius: 1 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: p.accent, borderRadius: 1, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

const WX_ICONS = { sunny:"○", clear:"◌", cloudy:"◍", rainy:"≈", snowy:"❄", stormy:"↯", foggy:"∿" };
const WX_LABELS = { sunny:"Clear",clear:"Clear night",cloudy:"Overcast",rainy:"Rain",snowy:"Snow",stormy:"Storm",foggy:"Fog" };
function WWeather({ p, f, s }) {
  const [wx, setWx] = useState(null); const [city, setCity] = useState(null);
  const [status, setStatus] = useState("idle"); const [tip, setTip] = useState(""); const [lt, setLt] = useState(false);
  const load = () => {
    setStatus("loading");
    if (!navigator.geolocation) { setStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords: { latitude: lat, longitude: lon } }) => {
      try {
        const unit = s.units === "metric" ? "celsius" : "fahrenheit";
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${unit}`);
        const d = await r.json(); const c = d.current_weather; const wc = c.weathercode;
        const cond = wc >= 95 ? "stormy" : wc >= 71 ? "snowy" : wc >= 51 ? "rainy" : wc >= 45 ? "foggy" : wc >= 3 ? "cloudy" : !c.is_day ? "clear" : "sunny";
        setWx({ temp: Math.round(c.temperature), cond, wind: Math.round(c.windspeed) }); setStatus("ok");
        const g = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const gd = await g.json(); setCity(gd.address?.city || gd.address?.town || null);
      } catch { setStatus("error"); }
    }, () => setStatus("denied"), { timeout: 8000 });
  };
  const getTip = async () => { if (!wx || lt) return; setLt(true); const r = await ai("One practical weather tip. Max 10 words.", `${wx.temp}${s.units === "metric" ? "°C" : "°F"}, ${WX_LABELS[wx.cond]}`); setTip(r); setLt(false); };
  const u = s.units === "metric" ? "°C" : "°F";
  if (status === "idle") return <div style={{ height: "100%", display: "flex", alignItems: "center" }}><button onClick={load} style={{ background: p.accent, border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "#fff", cursor: "pointer", fontFamily: f.sans, fontSize: "0.8rem" }}>Load weather</button></div>;
  if (status === "loading") return <div style={{ color: p.muted, fontSize: "0.8rem", height: "100%", display: "flex", alignItems: "center" }}>Locating…</div>;
  if (status === "denied" || status === "error") return <div style={{ color: p.muted, fontSize: "0.8rem", height: "100%", display: "flex", alignItems: "center" }}>Location unavailable</div>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: f.serif, fontWeight: 300, fontSize: "3rem", lineHeight: 1, color: p.text }}>{wx.temp}{u}</div>
          <div style={{ color: p.muted, fontSize: "0.6rem", marginTop: "0.3rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: f.mono }}>{WX_LABELS[wx.cond]} · {wx.wind} km/h</div>
          {city && <div style={{ color: p.dim, fontSize: "0.56rem", marginTop: "0.18rem", fontFamily: f.mono, letterSpacing: "0.14em", textTransform: "uppercase" }}>{city}</div>}
        </div>
        <div style={{ fontFamily: f.mono, fontSize: "3rem", color: p.dim, lineHeight: 1 }}>{WX_ICONS[wx.cond]}</div>
      </div>
      {tip && <div style={{ color: p.muted, fontSize: "0.74rem", lineHeight: 1.55, fontStyle: "italic", borderTop: `1px solid ${p.border}`, paddingTop: "0.4rem" }}>{tip}</div>}
      <Btn p={p} f={f} onClick={getTip} loading={lt} small>✦ Tip</Btn>
    </div>
  );
}

const HEADLINES = [
  "Breakthrough battery achieves 1,000-mile EV range in lab tests",
  "UN climate summit reaches landmark emissions agreement",
  "New AI model passes medical licensing exam with 98% accuracy",
  "Arctic sea ice extent hits 40-year record high this winter",
  "Quantum computing startup achieves fault-tolerant operation",
  "Remote work reshapes city centers as office vacancy climbs",
  "Ancient genome sequencing rewrites human migration history",
  "Ocean cleanup initiative removes 100,000 tons of plastic",
];
function WNews({ p, f }) {
  const [i, setI] = useState(0); const [vis, setVis] = useState(true); const [ex, setEx] = useState(""); const [load, setLoad] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => { setVis(false); setTimeout(() => { setI(x => (x + 1) % HEADLINES.length); setEx(""); setVis(true); }, 300); }, 8000);
    return () => clearInterval(iv);
  }, []);
  const explain = async () => { setLoad(true); const r = await ai("Explain this headline in 2 clear sentences.", HEADLINES[i]); setEx(r); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ color: p.text, fontSize: "0.88rem", lineHeight: 1.55, fontFamily: f.sans, fontWeight: 300, opacity: vis ? 1 : 0, transition: "opacity 0.3s" }}>{HEADLINES[i]}</div>
        {load && <div style={{ marginTop: "0.4rem" }}><Dots p={p} /></div>}
        {ex && !load && <div style={{ color: p.muted, fontSize: "0.72rem", lineHeight: 1.55, marginTop: "0.5rem", fontStyle: "italic", fontFamily: f.sans }}>{ex}</div>}
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "center", marginTop: "0.5rem" }}>
        {HEADLINES.map((_, idx) => <div key={idx} onClick={() => { setI(idx); setEx(""); }} style={{ height: 2, flex: idx === i ? 3 : 1, background: idx === i ? p.accent : p.dim, borderRadius: 2, cursor: "pointer", transition: "all 0.3s" }} />)}
        <button onClick={explain} disabled={load} style={{ background: "none", border: `1px solid ${p.dim}`, borderRadius: 4, padding: "0.1rem 0.35rem", color: p.accent, cursor: "pointer", fontSize: "0.6rem", marginLeft: 3 }}>✦</button>
      </div>
    </div>
  );
}

function WSearch({ p, f, s }) {
  const [q, setQ] = useState(""); const [ans, setAns] = useState(""); const [load, setLoad] = useState(false);
  const go = async () => { if (!q.trim() || load) return; setLoad(true); setAns(""); const a = await ai(`Answer concisely in 1-3 sentences.${s.aiContext ? ` Context: ${s.aiContext}` : ""}`, q, 200); setAns(a); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", borderBottom: `1px solid ${p.border}`, paddingBottom: "0.35rem" }}>
        <span style={{ color: p.accent, fontFamily: f.mono, fontSize: "0.85rem", flexShrink: 0 }}>✦</span>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} disabled={load}
          placeholder={s.name ? `Ask anything, ${s.name}…` : "Ask anything…"}
          style={{ flex: 1, background: "transparent", border: "none", color: p.text, fontSize: "0.9rem", outline: "none", fontFamily: f.sans, fontWeight: 300 }} />
        {load && <Dots p={p} />}
        {q && !load && <button onClick={go} style={{ background: "none", border: "none", color: p.accent, cursor: "pointer", fontSize: "1.1rem", padding: 0, lineHeight: 1, fontFamily: f.mono }}>→</button>}
        {ans && <button onClick={() => { setAns(""); setQ(""); }} style={{ background: "none", border: "none", color: p.dim, cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>✕</button>}
      </div>
      {ans && <div style={{ color: p.muted, fontSize: "0.84rem", lineHeight: 1.65, fontFamily: f.sans, fontWeight: 300 }}>{ans}</div>}
    </div>
  );
}

function WChat({ p, f, s }) {
  const [msgs, setMsgs] = useState([{ r: "a", c: `Hello${s.name ? ` ${s.name}` : ""}! How can I help today?` }]);
  const [inp, setInp] = useState(""); const [load, setLoad] = useState(false);
  const ref = useRef(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth" }), [msgs, load]);
  const send = async () => {
    const txt = inp.trim(); if (!txt || load) return; setInp("");
    const history = [...msgs, { r: "u", c: txt }]; setMsgs(history); setLoad(true);
    const sys = `Dashboard AI assistant.${s.name ? ` User: ${s.name}.` : ""}${s.aiPersonality ? ` Style: ${s.aiPersonality}.` : ""} ${s.aiContext || ""} Be concise.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, system: sys, messages: history.map(m => ({ role: m.r === "u" ? "user" : "assistant", content: m.c })) }) });
      const d = await r.json(); setMsgs(m => [...m, { r: "a", c: d.content?.[0]?.text || "Error" }]);
    } catch { setMsgs(m => [...m, { r: "a", c: "Connection error." }]); }
    setLoad(false);
  };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem", minHeight: 0, scrollbarWidth: "thin", scrollbarColor: `${p.dim} transparent`, paddingRight: "0.2rem" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.r === "u" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "0.38rem 0.65rem", borderRadius: m.r === "u" ? "8px 8px 2px 8px" : "2px 8px 8px 8px", background: m.r === "u" ? `${p.accent}18` : "transparent", border: m.r === "u" ? `1px solid ${p.accent}28` : "none", color: m.r === "u" ? p.accent : p.muted, fontSize: "0.82rem", lineHeight: 1.65, fontFamily: f.sans, fontWeight: 300 }}>{m.c}</div>
          </div>
        ))}
        {load && <div style={{ padding: "0.2rem" }}><Dots p={p} /></div>}
        <div ref={ref} />
      </div>
      <div style={{ display: "flex", gap: "0.4rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.45rem", marginTop: "0.35rem" }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} disabled={load} placeholder="Message…"
          style={{ flex: 1, background: "transparent", border: "none", color: p.text, fontSize: "0.84rem", outline: "none", fontFamily: f.sans, fontWeight: 300 }} />
        <button onClick={send} disabled={load} style={{ background: load ? "transparent" : p.accent, border: `1px solid ${p.accent}`, borderRadius: 5, color: load ? p.dim : "#fff", cursor: load ? "default" : "pointer", fontSize: "0.72rem", padding: "0.26rem 0.7rem", fontFamily: f.mono, transition: "all 0.15s" }}>→</button>
      </div>
    </div>
  );
}

function WBriefing({ p, f, s }) {
  const [brief, setBrief] = useState(""); const [load, setLoad] = useState(false);
  const gen = async () => { setLoad(true); const h = new Date().getHours(); const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; const r = await ai(`Write a short ${s.briefingStyle || "warm"} ${tod} briefing. 2-3 sentences.`, `For: ${s.name || "friend"}. ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`, 180); setBrief(r); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {!brief && !load && <button onClick={gen} style={{ alignSelf: "flex-start", background: p.accent, border: "none", borderRadius: 7, padding: "0.42rem 0.85rem", color: "#fff", cursor: "pointer", fontSize: "0.78rem", fontFamily: f.sans }}>✦ Generate briefing</button>}
      {load && <div style={{ flex: 1, display: "flex", alignItems: "center" }}><Dots p={p} /></div>}
      {brief && <>
        <div style={{ flex: 1, color: p.muted, fontSize: "0.86rem", lineHeight: 1.7, fontStyle: "italic", fontFamily: f.serif, fontWeight: 300 }}>{brief}</div>
        <Btn p={p} f={f} onClick={gen} loading={load} small>↻ Refresh</Btn>
      </>}
    </div>
  );
}

function WPoem({ p, f }) {
  const [poem, setPoem] = useState(""); const [load, setLoad] = useState(false); const [topic, setTopic] = useState("today");
  const gen = async () => { setLoad(true); const r = await ai("Write a short evocative poem (4-6 lines). Return only the poem.", `Theme: ${topic}`); setPoem(r); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {load ? <div style={{ display: "flex", alignItems: "center", height: "100%" }}><Dots p={p} /></div>
          : <div style={{ color: p.muted, fontSize: "0.82rem", lineHeight: 1.9, fontStyle: "italic", fontFamily: f.serif, whiteSpace: "pre-line", height: "100%", overflowY: "auto", scrollbarWidth: "none" }}>{poem || <span style={{ color: p.dim, fontFamily: f.sans, fontStyle: "normal", fontSize: "0.74rem" }}>Generate a poem…</span>}</div>}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.4rem" }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic…" style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.74rem", outline: "none", fontFamily: f.sans }} />
        <Btn p={p} f={f} onClick={gen} loading={load} small>✦ Write</Btn>
      </div>
    </div>
  );
}

function WQuote({ p, f }) {
  const SQ = [{ q: "The best way to predict the future is to create it.", a: "Drucker" }, { q: "Simplicity is the ultimate sophistication.", a: "da Vinci" }, { q: "It always seems impossible until it's done.", a: "Mandela" }];
  const [q, setQ] = useState(SQ[0]); const [load, setLoad] = useState(false);
  const aiQuote = async () => { setLoad(true); const d = await aiJSON('Return ONLY {"q":"quote","a":"author"} JSON.', "One thought-provoking quote.", 120); if (d?.q) setQ(d); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {load ? <div style={{ flex: 1, display: "flex", alignItems: "center" }}><Dots p={p} /></div> : <>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: f.serif, fontStyle: "italic", color: p.text, fontSize: "0.92rem", lineHeight: 1.65, marginBottom: "0.4rem" }}>"{q.q}"</div>
          <div style={{ color: p.dim, fontSize: "0.6rem", fontFamily: f.mono, letterSpacing: "0.12em", textTransform: "uppercase" }}>— {q.a}</div>
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <Btn p={p} f={f} onClick={() => setQ(SQ[Math.floor(Math.random() * SQ.length)])} small variant="ghost">Next</Btn>
          <Btn p={p} f={f} onClick={aiQuote} loading={load} small>✦ AI</Btn>
        </div>
      </>}
    </div>
  );
}

function WTodo({ p, f }) {
  const [items, setItems] = useState([{ id: 1, text: "Review morning emails", done: false }, { id: 2, text: "Team standup at 10am", done: false }, { id: 3, text: "Finish project draft", done: true }]);
  const [inp, setInp] = useState(""); const [load, setLoad] = useState(false);
  const toggle = id => setItems(ts => ts.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = id => setItems(ts => ts.filter(i => i.id !== id));
  const add = () => { if (!inp.trim()) return; setItems(ts => [...ts, { id: Date.now(), text: inp.trim(), done: false }]); setInp(""); };
  const suggest = async () => { setLoad(true); const d = await aiJSON("Return ONLY a JSON array of 3 short task strings.", `Existing: ${items.map(i => i.text).join(", ")}`); if (Array.isArray(d)) d.forEach(s => setItems(ts => [...ts, { id: Date.now() + Math.random(), text: s, done: false }])); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.38rem", scrollbarWidth: "none" }}>
        {items.sort((a, b) => a.done ? 1 : -1).map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div onClick={() => toggle(item.id)} style={{ width: 14, height: 14, border: `1.5px solid ${item.done ? p.accent : p.border}`, borderRadius: 3, background: item.done ? p.accent : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              {item.done && <span style={{ fontSize: 8, color: p.card, fontWeight: 800, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ flex: 1, color: item.done ? p.dim : p.muted, fontSize: "0.8rem", textDecoration: item.done ? "line-through" : "none", fontFamily: f.sans, fontWeight: 300 }}>{item.text}</span>
            <span onClick={() => remove(item.id)} style={{ color: p.dim, cursor: "pointer", fontSize: "0.62rem", opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0}>✕</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: "0.4rem", marginTop: "0.4rem", display: "flex", gap: "0.4rem" }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add task…" style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.78rem", outline: "none", fontFamily: f.sans }} />
        <button onClick={add} style={{ background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, color: p.accent, cursor: "pointer", fontSize: "0.72rem", padding: "0.14rem 0.42rem", fontFamily: f.mono }}>+</button>
        <Btn p={p} f={f} onClick={suggest} loading={load} small>✦ AI</Btn>
      </div>
    </div>
  );
}

function WHabits({ p, f }) {
  const [habits, setHabits] = useState([{ id: 1, name: "Morning walk", done: false, streak: 3 }, { id: 2, name: "Read 20 min", done: false, streak: 7 }, { id: 3, name: "Drink water", done: true, streak: 12 }, { id: 4, name: "Meditate", done: false, streak: 1 }]);
  const [inp, setInp] = useState(""); const [tip, setTip] = useState(""); const [lt, setLt] = useState(false);
  const toggle = id => setHabits(hs => hs.map(h => h.id === id ? { ...h, done: !h.done } : h));
  const add = () => { if (!inp.trim()) return; setHabits(hs => [...hs, { id: Date.now(), name: inp.trim(), done: false, streak: 0 }]); setInp(""); };
  const done = habits.filter(h => h.done).length;
  const coach = async () => { setLt(true); const r = await ai("1 short motivating habit message. 1 sentence.", `Done: ${habits.filter(h => h.done).map(h => h.name).join(", ") || "none"}`); setTip(r); setLt(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ height: 2, background: p.dim, borderRadius: 1 }}>
        <div style={{ height: "100%", width: `${(done / Math.max(habits.length, 1)) * 100}%`, background: p.accent, borderRadius: 1, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.28rem", scrollbarWidth: "none" }}>
        {habits.map(h => (
          <div key={h.id} onClick={() => toggle(h.id)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
            <div style={{ width: 12, height: 12, border: `1.5px solid ${h.done ? p.accent : p.border}`, borderRadius: "50%", background: h.done ? p.accent : "transparent", flexShrink: 0, transition: "all 0.15s" }} />
            <span style={{ flex: 1, color: h.done ? p.dim : p.muted, fontSize: "0.77rem", textDecoration: h.done ? "line-through" : "none", fontFamily: f.sans }}>{h.name}</span>
            {h.streak > 0 && <span style={{ color: p.dim, fontSize: "0.56rem", fontFamily: f.mono }}>×{h.streak}</span>}
          </div>
        ))}
      </div>
      {tip && <div style={{ color: p.dim, fontSize: "0.68rem", lineHeight: 1.5, fontStyle: "italic", borderTop: `1px solid ${p.border}`, paddingTop: "0.3rem" }}>{tip}</div>}
      <div style={{ display: "flex", gap: "0.35rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.38rem" }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add habit…" style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.72rem", outline: "none", fontFamily: f.sans }} />
        <button onClick={add} style={{ background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, color: p.accent, cursor: "pointer", fontSize: "0.68rem", padding: "0.14rem 0.38rem" }}>+</button>
        <Btn p={p} f={f} onClick={coach} loading={lt} small>✦ Coach</Btn>
      </div>
    </div>
  );
}

function WGoals({ p, f }) {
  const [goals, setGoals] = useState([{ id: 1, text: "Launch side project", pct: 35 }, { id: 2, text: "Read 12 books", pct: 58 }, { id: 3, text: "Exercise consistently", pct: 75 }]);
  const [inp, setInp] = useState(""); const [advice, setAdvice] = useState(""); const [la, setLa] = useState(false);
  const upd = (id, v) => setGoals(gs => gs.map(g => g.id === id ? { ...g, pct: Math.max(0, Math.min(100, v)) } : g));
  const add = () => { if (!inp.trim()) return; setGoals(gs => [...gs, { id: Date.now(), text: inp.trim(), pct: 0 }]); setInp(""); };
  const getAdv = async () => { setLa(true); const r = await ai("2 sentences of specific goal advice.", goals.map(g => `${g.text}: ${g.pct}%`).join(". ")); setAdvice(r); setLa(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.55rem", scrollbarWidth: "none" }}>
        {goals.map(g => (
          <div key={g.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.18rem" }}>
              <span style={{ color: p.muted, fontSize: "0.77rem", fontFamily: f.sans }}>{g.text}</span>
              <span style={{ color: p.dim, fontSize: "0.6rem", fontFamily: f.mono }}>{g.pct}%</span>
            </div>
            <div style={{ height: 3, background: p.dim, borderRadius: 2 }}><div style={{ height: "100%", width: `${g.pct}%`, background: p.accent, borderRadius: 2, transition: "width 0.3s" }} /></div>
            <input type="range" min={0} max={100} value={g.pct} onChange={e => upd(g.id, +e.target.value)} style={{ width: "100%", accentColor: p.accent, height: 8, margin: "0.04rem 0 0" }} />
          </div>
        ))}
      </div>
      {advice && <div style={{ color: p.dim, fontSize: "0.7rem", lineHeight: 1.5, fontStyle: "italic", borderTop: `1px solid ${p.border}`, paddingTop: "0.32rem" }}>{advice}</div>}
      <div style={{ display: "flex", gap: "0.35rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.38rem" }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add goal…" style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.72rem", outline: "none", fontFamily: f.sans }} />
        <button onClick={add} style={{ background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, color: p.accent, cursor: "pointer", fontSize: "0.68rem", padding: "0.14rem 0.38rem" }}>+</button>
        <Btn p={p} f={f} onClick={getAdv} loading={la} small>✦ AI</Btn>
      </div>
    </div>
  );
}

function WJournal({ p, f }) {
  const [entry, setEntry] = useState(""); const [refl, setRefl] = useState(""); const [lr, setLr] = useState(false); const [prompt, setPr] = useState(""); const [lp, setLp] = useState(false);
  const getPrompt = async () => { setLp(true); const r = await ai("One open journal prompt. Just the sentence.", "Now: " + new Date().toLocaleTimeString()); setPr(r); setLp(false); };
  const reflect = async () => { if (!entry.trim()) return; setLr(true); const r = await ai("Short thoughtful reflection on this journal entry. 2 sentences. Warm.", "Entry: " + entry); setRefl(r); setLr(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      {prompt && <div style={{ color: p.accent, fontSize: "0.71rem", lineHeight: 1.4, fontStyle: "italic", borderLeft: `2px solid ${p.accent}`, paddingLeft: "0.5rem", fontFamily: f.sans }}>{prompt}</div>}
      <textarea value={entry} onChange={e => setEntry(e.target.value)} placeholder="Write freely…"
        style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.82rem", outline: "none", resize: "none", fontFamily: f.sans, lineHeight: 1.7, scrollbarWidth: "none", fontWeight: 300 }} />
      {lr && <Dots p={p} />}
      {refl && !lr && <div style={{ color: p.dim, fontSize: "0.71rem", lineHeight: 1.5, fontStyle: "italic", borderTop: `1px solid ${p.border}`, paddingTop: "0.32rem" }}>{refl}</div>}
      <div style={{ display: "flex", gap: "0.35rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.38rem" }}>
        <Btn p={p} f={f} onClick={getPrompt} loading={lp} small>✦ Prompt</Btn>
        <Btn p={p} f={f} onClick={reflect} loading={lr} small>✦ Reflect</Btn>
        <button onClick={() => { setEntry(""); setRefl(""); setPr(""); }} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, padding: "0.16rem 0.42rem", color: p.muted, cursor: "pointer", fontSize: "0.63rem", fontFamily: f.sans }}>Clear</button>
      </div>
    </div>
  );
}

function WNotes({ p, f }) {
  const [text, setText] = useState(""); const [polished, setPolished] = useState(""); const [load, setLoad] = useState(false);
  const polish = async () => { if (!text.trim()) return; setLoad(true); const r = await ai("Polish these notes into clean readable prose. Return only the result.", "Notes: " + text, 300); setPolished(r); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <textarea value={polished || text} onChange={e => { setText(e.target.value); setPolished(""); }} placeholder="Start typing notes…"
        style={{ flex: 1, background: "transparent", border: "none", color: p.muted, fontSize: "0.82rem", outline: "none", resize: "none", fontFamily: f.sans, lineHeight: 1.65, scrollbarWidth: "none", fontWeight: 300 }} />
      <div style={{ display: "flex", gap: "0.35rem", borderTop: `1px solid ${p.border}`, paddingTop: "0.38rem", marginTop: "0.3rem" }}>
        <button onClick={() => { setText(""); setPolished(""); }} style={{ background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, padding: "0.16rem 0.42rem", color: p.muted, cursor: "pointer", fontSize: "0.63rem", fontFamily: f.sans }}>Clear</button>
        <Btn p={p} f={f} onClick={polish} loading={load} small>✦ Polish</Btn>
      </div>
    </div>
  );
}

function WKanban({ p, f }) {
  const [cols, setCols] = useState([
    { id: "todo", label: "To Do", cards: [{ id: 1, text: "Research competitors" }, { id: 2, text: "Write spec" }] },
    { id: "doing", label: "In Progress", cards: [{ id: 3, text: "Design mockups" }, { id: 4, text: "API work" }] },
    { id: "done", label: "Done", cards: [{ id: 5, text: "Project setup" }] },
  ]);
  const colors = { todo: p.muted, doing: p.accent, done: "#3CB371" };
  const [inputs, setInputs] = useState({});
  const [drag, setDrag] = useState(null);
  const addCard = colId => { const txt = (inputs[colId] || "").trim(); if (!txt) return; setCols(cs => cs.map(c => c.id === colId ? { ...c, cards: [...c.cards, { id: Date.now(), text: txt }] } : c)); setInputs(i => ({ ...i, [colId]: "" })); };
  const move = (cardId, toCol) => { let card; setCols(cs => cs.map(c => { const found = c.cards.find(x => x.id === cardId); if (found) card = found; return { ...c, cards: c.cards.filter(x => x.id !== cardId) }; }).map(c => c.id === toCol && card ? { ...c, cards: [...c.cards, card] } : c)); };
  return (
    <div style={{ height: "100%", display: "flex", gap: "0.5rem", overflow: "hidden" }}>
      {cols.map(col => (
        <div key={col.id} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.22rem", minWidth: 0 }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (drag) move(drag, col.id); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.15rem", borderBottom: `1px solid ${p.border}` }}>
            <span style={{ color: colors[col.id], fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: f.mono }}>{col.label}</span>
            <span style={{ color: p.dim, fontSize: "0.56rem", fontFamily: f.mono }}>{col.cards.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.2rem", scrollbarWidth: "none" }}>
            {col.cards.map(card => (
              <div key={card.id} draggable onDragStart={() => setDrag(card.id)} onDragEnd={() => setDrag(null)}
                style={{ padding: "0.3rem 0.4rem", background: drag === card.id ? `${p.accent}10` : p.tag, border: `1px solid ${drag === card.id ? p.accent : p.border}`, borderRadius: 5, cursor: "grab", fontSize: "0.7rem", color: p.muted, display: "flex", justifyContent: "space-between", gap: "0.3rem", fontFamily: f.sans }}>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{card.text}</span>
                <span onClick={() => setCols(cs => cs.map(c => ({ ...c, cards: c.cards.filter(x => x.id !== card.id) })))} style={{ color: p.dim, cursor: "pointer", fontSize: "0.58rem", flexShrink: 0 }}>✕</span>
              </div>
            ))}
          </div>
          <input value={inputs[col.id] || ""} onChange={e => setInputs(i => ({ ...i, [col.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && addCard(col.id)} placeholder="+ card"
            style={{ background: "transparent", border: "none", borderBottom: `1px solid ${p.dim}`, color: p.muted, fontSize: "0.65rem", outline: "none", fontFamily: f.sans, padding: "0.1rem 0" }} />
        </div>
      ))}
    </div>
  );
}

function WPomodoro({ p, f }) {
  const [mode, setMode] = useState("work"); const [secs, setSecs] = useState(25 * 60); const [running, setRunning] = useState(false); const [sessions, setSessions] = useState(0);
  const dur = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  useEffect(() => { if (!running) return; const i = setInterval(() => setSecs(s => { if (s <= 1) { setRunning(false); if (mode === "work") setSessions(n => n + 1); setMode(m => m === "work" ? "short" : "work"); return dur[mode === "work" ? "short" : "work"]; } return s - 1; }), 1000); return () => clearInterval(i); }, [running, mode]);
  const pct = ((dur[mode] - secs) / dur[mode]) * 100;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
        <svg viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="34" cy="34" r="30" fill="none" stroke={p.dim} strokeWidth="3" />
          <circle cx="34" cy="34" r="30" fill="none" stroke={p.accent} strokeWidth="3" strokeDasharray={`${2 * Math.PI * 30}`} strokeDashoffset={`${2 * Math.PI * 30 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: f.mono, fontSize: "0.85rem", color: p.text, fontWeight: 300 }}>{mm}:{ss}</span></div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: p.dim, fontSize: "0.58rem", marginBottom: "0.3rem", fontFamily: f.mono, letterSpacing: "0.1em" }}>{sessions} SESSIONS · {mode.toUpperCase()}</div>
        <div style={{ display: "flex", gap: "0.28rem", marginBottom: "0.3rem" }}>
          {[["work", "25m"], ["short", "5m"], ["long", "15m"]].map(([m, l]) => (
            <div key={m} onClick={() => { setMode(m); setSecs(dur[m]); setRunning(false); }} style={{ flex: 1, padding: "0.18rem", border: `1px solid ${mode === m ? p.accent : p.dim}`, borderRadius: 4, textAlign: "center", cursor: "pointer", color: mode === m ? p.accent : p.dim, fontSize: "0.58rem", fontFamily: f.mono, transition: "all 0.15s" }}>{l}</div>
          ))}
        </div>
        <button onClick={() => setRunning(r => !r)} style={{ width: "100%", padding: "0.32rem", background: running ? "transparent" : p.accent, border: `1px solid ${p.accent}`, borderRadius: 5, color: running ? p.accent : "#fff", cursor: "pointer", fontSize: "0.74rem", fontFamily: f.sans, transition: "all 0.15s" }}>{running ? "Pause" : "Start"}</button>
      </div>
    </div>
  );
}

function WCalendar({ p, f }) {
  const now = new Date(); const [v, setV] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fd = new Date(v.y, v.m, 1).getDay(); const dim = new Date(v.y, v.m + 1, 0).getDate();
  const cells = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const isToday = d => d === now.getDate() && v.m === now.getMonth() && v.y === now.getFullYear();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
        <button onClick={() => setV(x => x.m === 0 ? { y: x.y - 1, m: 11 } : { y: x.y, m: x.m - 1 })} style={{ background: "none", border: "none", color: p.dim, cursor: "pointer", fontSize: "0.9rem" }}>‹</button>
        <span style={{ color: p.muted, fontSize: "0.7rem", fontFamily: f.mono, letterSpacing: "0.08em" }}>{months[v.m]} {v.y}</span>
        <button onClick={() => setV(x => x.m === 11 ? { y: x.y + 1, m: 0 } : { y: x.y, m: x.m + 1 })} style={{ background: "none", border: "none", color: p.dim, cursor: "pointer", fontSize: "0.9rem" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", flex: 1 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ color: p.dim, fontSize: "0.5rem", textAlign: "center", paddingBottom: "0.1rem", fontFamily: f.mono }}>{d}</div>)}
        {cells.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday(d) ? p.accent : "transparent", color: isToday(d) ? "#fff" : d ? p.muted : "transparent", fontSize: "0.6rem", fontFamily: f.mono, fontWeight: isToday(d) ? 600 : 300, lineHeight: 1 }}>{d}</div>)}
      </div>
    </div>
  );
}

function WMood({ p, f }) {
  const moods = [{ e: "◉", l: "Great" }, { e: "◎", l: "Good" }, { e: "○", l: "Okay" }, { e: "◌", l: "Low" }, { e: "⊗", l: "Tense" }];
  const [mood, setMood] = useState(null); const [tip, setTip] = useState(""); const [load, setLoad] = useState(false);
  const pick = async m => { setMood(m); setTip(""); setLoad(true); const r = await ai("One short warm suggestion for this mood. 1 sentence.", "Mood: " + m.l); setTip(r); setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        {moods.map(m => (
          <div key={m.l} onClick={() => pick(m)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem", cursor: "pointer", padding: "0.3rem 0.1rem", borderRadius: 7, background: mood?.l === m.l ? `${p.accent}14` : "transparent", border: `1px solid ${mood?.l === m.l ? p.accent : p.border}`, transition: "all 0.15s" }}>
            <span style={{ fontFamily: f.mono, fontSize: "1.1rem", color: mood?.l === m.l ? p.accent : p.dim }}>{m.e}</span>
            <span style={{ color: mood?.l === m.l ? p.accent : p.dim, fontSize: "0.5rem", fontFamily: f.mono }}>{m.l}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {load ? <Dots p={p} /> : tip ? <div style={{ color: p.muted, fontSize: "0.8rem", lineHeight: 1.6, fontStyle: "italic", fontFamily: f.serif }}>{tip}</div> : <div style={{ color: p.dim, fontSize: "0.74rem", fontFamily: f.sans }}>How are you feeling?</div>}
      </div>
    </div>
  );
}

function WBreathing({ p, f }) {
  const pats = { box: [{ l: "Inhale", d: 4 }, { l: "Hold", d: 4 }, { l: "Exhale", d: 4 }, { l: "Hold", d: 4 }], relax: [{ l: "Inhale", d: 4 }, { l: "Hold", d: 7 }, { l: "Exhale", d: 8 }] };
  const [pat, setPat] = useState("box"); const [active, setActive] = useState(false); const [si, setSi] = useState(0); const [t2, setT2] = useState(0); const [cycles, setCycles] = useState(0);
  const steps = pats[pat];
  useEffect(() => { if (!active) return; if (t2 <= 0) { const ni = (si + 1) % steps.length; if (ni === 0) setCycles(c => c + 1); setSi(ni); setT2(steps[ni].d); return; } const i = setInterval(() => setT2(s => s - 1), 1000); return () => clearInterval(i); }, [active, t2, si, steps]);
  const scale = active ? 1 + (Math.sin((1 - t2 / Math.max(steps[si]?.d || 4, 1)) * Math.PI) * 0.35) : 1;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 3, width: "100%" }}>
        {Object.keys(pats).map(k => <div key={k} onClick={() => { setPat(k); setActive(false); setSi(0); setT2(0); setCycles(0); }} style={{ flex: 1, padding: "0.18rem", border: `1px solid ${pat === k ? p.accent : p.dim}`, borderRadius: 4, textAlign: "center", cursor: "pointer", color: pat === k ? p.accent : p.dim, fontSize: "0.6rem", fontFamily: f.mono, textTransform: "capitalize" }}>{k}</div>)}
      </div>
      <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: `${p.accent}10`, transform: `scale(${scale})`, transition: "transform 1s ease-in-out", boxShadow: `0 0 ${28 * scale}px ${p.glow}15` }} />
        <div style={{ position: "absolute", width: "58%", height: "58%", borderRadius: "50%", background: `${p.accent}18`, transform: `scale(${scale * 0.88})`, transition: "transform 1s ease-in-out" }} />
        <span style={{ fontFamily: f.mono, fontSize: "1.5rem", fontWeight: 200, color: p.text, position: "relative" }}>{active ? t2 : "·"}</span>
      </div>
      {active && <div style={{ color: p.accent, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: f.mono }}>{steps[si]?.l} · {cycles} cycles</div>}
      <button onClick={() => { setActive(a => !a); if (!active) { setSi(0); setT2(steps[0].d); } }} style={{ width: "100%", padding: "0.36rem", background: active ? "transparent" : p.accent, border: `1px solid ${p.accent}`, borderRadius: 5, color: active ? p.accent : "#fff", cursor: "pointer", fontSize: "0.74rem", fontFamily: f.sans, transition: "all 0.15s" }}>{active ? "Stop" : "Begin"}</button>
    </div>
  );
}

function WWater({ p, f }) {
  const [cups, setCups] = useState(3); const goal = 8; const pct = Math.min((cups / goal) * 100, 100);
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: "0.85rem" }}>
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <svg viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r="24" fill="none" stroke={p.dim} strokeWidth="3" />
          <circle cx="28" cy="28" r="24" fill="none" stroke={p.accent} strokeWidth="3" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: f.mono, fontSize: "0.7rem", color: p.muted }}>{cups}/{goal}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: p.dim, fontSize: "0.58rem", marginBottom: "0.35rem", fontFamily: f.mono, letterSpacing: "0.1em", textTransform: "uppercase" }}>Glasses today</div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button onClick={() => setCups(c => Math.max(0, c - 1))} style={{ background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, color: p.muted, cursor: "pointer", fontSize: "0.85rem", width: 28, height: 24, lineHeight: 1 }}>−</button>
          <button onClick={() => setCups(c => Math.min(goal + 4, c + 1))} style={{ flex: 1, background: p.accent, border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontSize: "0.7rem", fontFamily: f.sans }}>+ Glass</button>
        </div>
      </div>
    </div>
  );
}

function WSleep({ p, f }) {
  const [bed, setBed] = useState("23:00"); const [wake, setWake] = useState("07:00"); const [log, setLog] = useState([]); const [tip, setTip] = useState(""); const [lt, setLt] = useState(false);
  const addLog = () => { const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number); const h = ((wh * 60 + wm) - (bh * 60 + bm) + 1440) % 1440 / 60; setLog(l => [{ h: Math.round(h * 10) / 10, q: h >= 7.5 ? "Good" : h >= 6 ? "Fair" : "Poor" }, ...l.slice(0, 2)]); };
  const getTip = async () => { setLt(true); const r = await ai("One sleep improvement tip. 1 sentence.", log.map(l => `${l.h}h ${l.q}`).join("; ")); setTip(r); setLt(false); };
  const inputStyle = { background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.24rem 0.4rem", color: p.text, fontSize: "0.72rem", outline: "none", fontFamily: f.mono, width: "100%", boxSizing: "border-box" };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end" }}>
        {[["Bed", bed, setBed], ["Wake", wake, setWake]].map(([l, v, sv]) => (
          <div key={l} style={{ flex: 1 }}><div style={{ color: p.dim, fontSize: "0.57rem", marginBottom: "0.12rem", fontFamily: f.mono }}>{l}</div><input type="time" value={v} onChange={e => sv(e.target.value)} style={inputStyle} /></div>
        ))}
        <button onClick={addLog} style={{ background: p.accent, border: "none", borderRadius: 5, padding: "0.3rem 0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.7rem", fontFamily: f.sans }}>Log</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.16rem", overflowY: "auto", scrollbarWidth: "none" }}>
        {log.length === 0 && <div style={{ color: p.dim, fontSize: "0.72rem", fontFamily: f.sans }}>No entries yet</div>}
        {log.map((e, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", color: p.dim, fontSize: "0.68rem" }}><span style={{ fontFamily: f.sans }}>{["Last night", "2 nights ago", "3 nights ago"][i]}</span><span style={{ fontFamily: f.mono, color: e.q === "Good" ? p.accent : e.q === "Fair" ? p.muted : p.dim }}>{e.h}h · {e.q}</span></div>)}
      </div>
      {tip && <div style={{ color: p.dim, fontSize: "0.67rem", lineHeight: 1.5, fontStyle: "italic", fontFamily: f.sans }}>{tip}</div>}
      <Btn p={p} f={f} onClick={getTip} loading={lt} full>✦ Sleep tip</Btn>
    </div>
  );
}

function WStocks({ p, f }) {
  const [data, setData] = useState(null); const [load, setLoad] = useState(false); const [ts, setTs] = useState(null);
  const fetch2 = async () => { setLoad(true); const d = await aiJSON('Return ONLY array [{"s":"AAPL","p":182.50,"c":1.2}].', "Approx prices AAPL MSFT NVDA AMZN GOOGL", 250); if (Array.isArray(d)) { setData(d); setTs(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })); } setLoad(false); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.32rem" }}>
      {load ? <div style={{ flex: 1, display: "flex", alignItems: "center" }}><Dots p={p} /></div>
        : data ? <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {data.map(s => <div key={s.s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: p.muted, fontSize: "0.73rem", fontFamily: f.mono }}>{s.s}</span><div style={{ display: "flex", gap: "0.55rem" }}><span style={{ fontFamily: f.mono, color: p.text, fontSize: "0.72rem" }}>${Number(s.p).toLocaleString()}</span><span style={{ fontSize: "0.62rem", fontFamily: f.mono, color: Number(s.c) >= 0 ? "#3CB371" : "#e74c3c" }}>{Number(s.c) >= 0 ? "+" : ""}{s.c}%</span></div></div>)}
        </div> : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: p.dim, fontSize: "0.78rem", fontFamily: f.sans }}>Tap to fetch</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${p.border}`, paddingTop: "0.3rem" }}>
        {ts && <span style={{ color: p.dim, fontSize: "0.56rem", fontFamily: f.mono }}>~{ts}</span>}
        <Btn p={p} f={f} onClick={fetch2} loading={load} small>✦ Refresh</Btn>
      </div>
    </div>
  );
}

function WCalc({ p, f }) {
  const [disp, setDisp] = useState("0"); const [expr, setExpr] = useState("");
  const press = k => {
    if (k === "C") { setDisp("0"); setExpr(""); return; }
    if (k === "=") { try { const r = Function('"use strict";return (' + expr + ")")(); const s = String(+r?.toFixed(10).replace(/\.?0+$/, "") ?? "Err"); setDisp(s); setExpr(s); } catch { setDisp("Err"); } return; }
    if (k === "⌫") { const ne = expr.slice(0, -1) || "0"; setExpr(ne); setDisp(ne); return; }
    const ne = (expr === "0" || expr === "Err") && !"+-*/".includes(k) ? k : expr + k; setExpr(ne); setDisp(ne);
  };
  const map = { "÷": "/", "×": "*", "−": "-" };
  const rows = [["7", "8", "9", "÷"], ["4", "5", "6", "×"], ["1", "2", "3", "−"], ["0", ".", "⌫", "="], ["C", "(", ")", "+"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: f.mono, fontSize: "1.6rem", fontWeight: 300, color: p.text, textAlign: "right", marginBottom: "0.3rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>{disp}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, flex: 1 }}>
        {rows.flat().map(k => <button key={k} onClick={() => press(map[k] || k)} style={{ background: k === "=" ? p.accent : k === "C" ? `${p.accent}18` : p.tag, border: `1px solid ${k === "=" ? p.accent : p.border}`, borderRadius: 5, color: k === "=" ? "#fff" : p.muted, cursor: "pointer", fontSize: "0.88rem", fontFamily: f.mono, fontWeight: 300, transition: "all 0.1s" }}>{k}</button>)}
      </div>
    </div>
  );
}

const WZ = [{ c: "New York", tz: "America/New_York", f: "🇺🇸" }, { c: "London", tz: "Europe/London", f: "🇬🇧" }, { c: "Tokyo", tz: "Asia/Tokyo", f: "🇯🇵" }, { c: "Sydney", tz: "Australia/Sydney", f: "🇦🇺" }, { c: "Dubai", tz: "Asia/Dubai", f: "🇦🇪" }, { c: "São Paulo", tz: "America/Sao_Paulo", f: "🇧🇷" }, { c: "Singapore", tz: "Asia/Singapore", f: "🇸🇬" }, { c: "Paris", tz: "Europe/Paris", f: "🇫🇷" }];
function WWClock({ p, f, widget }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const fmt = tz => now.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true });
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {WZ.slice(0, widget.h <= 2 ? 4 : 8).map(z => (
        <div key={z.tz} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><span style={{ fontSize: "0.72rem" }}>{z.f}</span><span style={{ color: p.muted, fontSize: "0.72rem", fontFamily: f.sans }}>{z.c}</span></div>
          <span style={{ fontFamily: f.mono, color: p.text, fontSize: "0.72rem", fontWeight: 300 }}>{fmt(z.tz)}</span>
        </div>
      ))}
    </div>
  );
}

function WStopwatch({ p, f }) {
  const [ms, setMs] = useState(0); const [run, setRun] = useState(false); const [laps, setLaps] = useState([]);
  const start = useRef(0);
  useEffect(() => { if (!run) return; start.current = Date.now() - ms; const i = setInterval(() => setMs(Date.now() - start.current), 50); return () => clearInterval(i); }, [run]);
  const fmt = n => { const m = Math.floor(n / 60000), s = Math.floor((n % 60000) / 1000), cs = Math.floor((n % 1000) / 10); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`; };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: f.mono, fontSize: "1.9rem", fontWeight: 200, color: p.text, letterSpacing: "0.02em", marginBottom: "0.38rem", lineHeight: 1 }}>{fmt(ms)}</div>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.38rem" }}>
        <button onClick={() => setRun(r => !r)} style={{ flex: 1, padding: "0.32rem", background: run ? "transparent" : p.accent, border: `1px solid ${p.accent}`, borderRadius: 5, color: run ? p.accent : "#fff", cursor: "pointer", fontSize: "0.72rem", fontFamily: f.sans, transition: "all 0.15s" }}>{run ? "Pause" : "Start"}</button>
        <button onClick={() => { if (run) setLaps(l => [fmt(ms), ...l.slice(0, 4)]); else { setMs(0); setLaps([]); } }} style={{ padding: "0.32rem 0.6rem", background: "transparent", border: `1px solid ${p.dim}`, borderRadius: 5, color: p.dim, cursor: "pointer", fontSize: "0.72rem", fontFamily: f.sans }}>{run ? "Lap" : "Reset"}</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {laps.map((l, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", color: p.dim, fontSize: "0.63rem", fontFamily: f.mono, padding: "0.08rem 0", borderBottom: `1px solid ${p.border}20` }}><span>Lap {laps.length - i}</span><span>{l}</span></div>)}
      </div>
    </div>
  );
}

function WCountdown({ p, f, widget, editMode, onUpdate }) {
  const [edit, setEdit] = useState(false); const [tgt, setTgt] = useState(widget.config?.target || ""); const [lbl, setLbl] = useState(widget.config?.label || ""); const [left, setLeft] = useState({});
  useEffect(() => { if (!tgt) return; const calc = () => { const diff = new Date(tgt) - new Date(); if (diff <= 0) { setLeft({ done: true }); return; } setLeft({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) }); }; calc(); const i = setInterval(calc, 1000); return () => clearInterval(i); }, [tgt]);
  if (edit && editMode) return (<div style={{ display: "flex", flexDirection: "column", gap: "0.42rem" }}><input value={lbl} onChange={e => setLbl(e.target.value)} placeholder="Label…" style={{ background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.35rem", color: p.text, fontSize: "0.78rem", outline: "none", fontFamily: f.sans }} /><input type="datetime-local" value={tgt} onChange={e => setTgt(e.target.value)} style={{ background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.35rem", color: p.text, fontSize: "0.7rem", outline: "none", fontFamily: f.mono }} /><button onClick={() => { setEdit(false); onUpdate({ config: { target: tgt, label: lbl } }); }} style={{ background: p.accent, border: "none", borderRadius: 5, padding: "0.3rem", color: "#fff", cursor: "pointer", fontSize: "0.74rem", fontFamily: f.sans }}>Set</button></div>);
  if (!tgt) return <div onClick={() => editMode && setEdit(true)} style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: p.dim, fontSize: "0.78rem", cursor: editMode ? "pointer" : "default", border: `1px dashed ${p.dim}`, borderRadius: 6, fontFamily: f.sans }}>Click to set countdown</div>;
  if (left.done) return <div style={{ textAlign: "center", color: p.accent, fontSize: "1rem", fontFamily: f.mono }}>✦ {lbl || "Done!"}</div>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }} onClick={() => editMode && setEdit(true)}>
      {lbl && <div style={{ color: p.dim, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "0.4rem", fontFamily: f.mono, textAlign: "center" }}>{lbl}</div>}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
        {[["d", "Days"], ["h", "Hrs"], ["m", "Min"], ["s", "Sec"]].map(([k, l]) => (
          <div key={k} style={{ textAlign: "center" }}><div style={{ fontFamily: f.serif, fontSize: "1.65rem", fontWeight: 300, color: p.text, lineHeight: 1 }}>{String(left[k] || 0).padStart(2, "0")}</div><div style={{ color: p.dim, fontSize: "0.48rem", letterSpacing: "0.1em", marginTop: "0.1rem", fontFamily: f.mono }}>{l}</div></div>
        ))}
      </div>
    </div>
  );
}

function WCurrency({ p, f }) {
  const C = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL", "SGD", "MXN"];
  const [amt, setAmt] = useState("100"); const [from, setFrom] = useState("USD"); const [to, setTo] = useState("EUR"); const [res, setRes] = useState(null); const [load, setLoad] = useState(false);
  const go = async () => { setLoad(true); const d = await aiJSON('Return ONLY {"rate":number} JSON.', `${from} to ${to} rate now.`, 80); if (d?.rate) setRes((parseFloat(amt) * d.rate).toFixed(2)); setLoad(false); };
  const sel = { background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.26rem", color: p.text, fontSize: "0.7rem", outline: "none", fontFamily: f.mono };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
        <input value={amt} onChange={e => setAmt(e.target.value)} style={{ flex: 1, background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.3rem 0.4rem", color: p.text, fontSize: "0.88rem", outline: "none", fontFamily: f.mono, minWidth: 0 }} />
        <select value={from} onChange={e => { setFrom(e.target.value); setRes(null); }} style={sel}>{C.map(c => <option key={c}>{c}</option>)}</select>
        <span style={{ color: p.muted, cursor: "pointer", flexShrink: 0 }} onClick={() => { const tmp = from; setFrom(to); setTo(tmp); setRes(null); }}>⇄</span>
        <select value={to} onChange={e => { setTo(e.target.value); setRes(null); }} style={sel}>{C.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      {res && <div style={{ fontFamily: f.serif, fontSize: "1.5rem", fontWeight: 300, color: p.text, lineHeight: 1 }}>{res} <span style={{ fontSize: "0.44em", color: p.dim, fontFamily: f.mono }}>{to}</span></div>}
      <Btn p={p} f={f} onClick={go} loading={load} full>✦ Convert</Btn>
    </div>
  );
}

function WConverter({ p, f }) {
  const cats = { length: { u: ["m", "cm", "km", "in", "ft", "mi"], c: { m: 1, cm: .01, km: 1000, in: .0254, ft: .3048, mi: 1609.34 } }, weight: { u: ["kg", "g", "lb", "oz"], c: { kg: 1, g: .001, lb: .453592, oz: .0283495 } }, temp: { u: ["°C", "°F", "K"], c: null }, speed: { u: ["km/h", "mph", "m/s"], c: { "km/h": 1, mph: 1.60934, "m/s": 3.6 } } };
  const [cat, setCat] = useState("length"); const [from, setFrom] = useState("m"); const [to, setTo] = useState("cm"); const [val, setVal] = useState("1"); const [res, setRes] = useState(null);
  const conv = useCallback(() => { const v = parseFloat(val); if (isNaN(v)) return; if (cat === "temp") { let r; if (from === "°C" && to === "°F") r = v * 9 / 5 + 32; else if (from === "°F" && to === "°C") r = (v - 32) * 5 / 9; else if (from === "°C" && to === "K") r = v + 273.15; else if (from === "K" && to === "°C") r = v - 273.15; else if (from === "°F" && to === "K") r = (v - 32) * 5 / 9 + 273.15; else if (from === "K" && to === "°F") r = (v - 273.15) * 9 / 5 + 32; else r = v; setRes(r?.toFixed(4).replace(/\.?0+$/, "")); } else { const c = cats[cat].c; if (c[from] && c[to]) setRes((v * c[from] / c[to]).toFixed(6).replace(/\.?0+$/, "")); } }, [val, from, to, cat]);
  useEffect(() => conv(), [val, from, to, cat]);
  const units = cats[cat].u; const sel = { background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.26rem", color: p.text, fontSize: "0.7rem", outline: "none", fontFamily: f.mono, width: "100%" };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      <div style={{ display: "flex", gap: 3 }}>{Object.keys(cats).map(c => <div key={c} onClick={() => { setCat(c); setFrom(cats[c].u[0]); setTo(cats[c].u[1]); setRes(null); }} style={{ flex: 1, padding: "0.16rem", border: `1px solid ${cat === c ? p.accent : p.dim}`, borderRadius: 4, textAlign: "center", cursor: "pointer", color: cat === c ? p.accent : p.dim, fontSize: "0.57rem", fontFamily: f.mono, textTransform: "capitalize" }}>{c}</div>)}</div>
      <input value={val} onChange={e => setVal(e.target.value)} style={{ background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.3rem 0.4rem", color: p.text, fontSize: "0.92rem", outline: "none", fontFamily: f.mono, width: "100%", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <select value={from} onChange={e => setFrom(e.target.value)} style={sel}>{units.map(u => <option key={u}>{u}</option>)}</select>
        <span style={{ color: p.muted, cursor: "pointer", flexShrink: 0 }} onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }}>⇄</span>
        <select value={to} onChange={e => setTo(e.target.value)} style={sel}>{units.map(u => <option key={u}>{u}</option>)}</select>
      </div>
      {res !== null && <div style={{ fontFamily: f.mono, fontSize: "1.3rem", fontWeight: 300, color: p.text, lineHeight: 1 }}>{res} <span style={{ fontSize: "0.45em", color: p.dim }}>{to}</span></div>}
    </div>
  );
}

function WHeading({ p, f, widget, editMode, onUpdate }) {
  const [editing, setEditing] = useState(false); const [val, setVal] = useState(widget.config?.text || "Heading");
  if (editing && editMode) return <input value={val} onChange={e => setVal(e.target.value)} autoFocus onBlur={() => { setEditing(false); onUpdate({ config: { ...widget.config, text: val } }); }} style={{ width: "100%", background: "transparent", border: "none", color: p.text, outline: "none", fontFamily: f.serif, fontWeight: 300, fontSize: "2.4rem", letterSpacing: "-0.03em" }} />;
  return <div onClick={() => editMode && setEditing(true)} style={{ height: "100%", display: "flex", alignItems: "center", overflow: "hidden", cursor: editMode ? "text" : "default" }}><span style={{ fontFamily: f.serif, fontWeight: 300, fontSize: "2.4rem", letterSpacing: "-0.03em", color: p.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span></div>;
}

function WLabel({ p, f, widget, editMode, onUpdate }) {
  const [editing, setEditing] = useState(false); const [val, setVal] = useState(widget.config?.text || "Click to edit this text…");
  if (editing && editMode) return <textarea value={val} onChange={e => setVal(e.target.value)} autoFocus onBlur={() => { setEditing(false); onUpdate({ config: { ...widget.config, text: val } }); }} style={{ width: "100%", height: "100%", background: "transparent", border: "none", color: p.muted, outline: "none", resize: "none", fontFamily: f.sans, lineHeight: 1.65, fontSize: "0.85rem", fontWeight: 300 }} />;
  return <div onClick={() => editMode && setEditing(true)} style={{ height: "100%", color: p.muted, fontSize: "0.85rem", lineHeight: 1.65, cursor: editMode ? "text" : "default", overflowY: "auto", scrollbarWidth: "none", fontFamily: f.sans, fontWeight: 300 }}>{val}</div>;
}

function WDivider({ p, widget }) {
  return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}><div style={{ flex: 1, height: widget.config?.thick || 1, background: widget.config?.accent ? p.accent : p.border, borderRadius: 1 }} /></div>;
}

function WImage({ p, widget, editMode, onUpdate }) {
  const [editing, setEditing] = useState(false); const [url, setUrl] = useState(widget.config?.url || "");
  if (editing && editMode) return (<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Image URL…" style={{ background: p.tag, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.38rem", color: p.text, fontSize: "0.78rem", outline: "none", fontFamily: "inherit" }} /><button onClick={() => { setEditing(false); onUpdate({ config: { ...widget.config, url } }); }} style={{ background: p.accent, border: "none", borderRadius: 5, padding: "0.3rem", color: "#fff", cursor: "pointer", fontSize: "0.75rem" }}>Set</button></div>);
  return url ? <div onClick={() => editMode && setEditing(true)} style={{ width: "100%", height: "100%", backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: editMode ? "pointer" : "default", borderRadius: "inherit" }} /> : <div onClick={() => editMode && setEditing(true)} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: p.dim, fontSize: "0.78rem", cursor: editMode ? "pointer" : "default", border: `1px dashed ${p.dim}`, borderRadius: 6 }}>Click to set image</div>;
}

function WidgetBody({ widget, p, f, s, editMode, onUpdate }) {
  const props = { p, f, s, editMode, widget, onUpdate: patch => onUpdate(widget.id, patch) };
  switch (widget.type) {
    case "clock":      return <WClock {...props} />;
    case "weather":    return <WWeather {...props} />;
    case "news":       return <WNews {...props} />;
    case "search":     return <WSearch {...props} />;
    case "chat":       return <WChat {...props} />;
    case "briefing":   return <WBriefing {...props} />;
    case "poem":       return <WPoem {...props} />;
    case "quote":      return <WQuote {...props} />;
    case "todo":       return <WTodo {...props} />;
    case "habits":     return <WHabits {...props} />;
    case "goals":      return <WGoals {...props} />;
    case "journal":    return <WJournal {...props} />;
    case "notes":      return <WNotes {...props} />;
    case "kanban":     return <WKanban {...props} />;
    case "pomodoro":   return <WPomodoro {...props} />;
    case "calendar":   return <WCalendar {...props} />;
    case "mood":       return <WMood {...props} />;
    case "breathing":  return <WBreathing {...props} />;
    case "water":      return <WWater {...props} />;
    case "sleep":      return <WSleep {...props} />;
    case "stocks":     return <WStocks {...props} />;
    case "calc":       return <WCalc {...props} />;
    case "worldclock": return <WWClock {...props} />;
    case "stopwatch":  return <WStopwatch {...props} />;
    case "countdown":  return <WCountdown {...props} />;
    case "currency":   return <WCurrency {...props} />;
    case "converter":  return <WConverter {...props} />;
    case "heading":    return <WHeading {...props} />;
    case "label":      return <WLabel {...props} />;
    case "divider":    return <WDivider {...props} />;
    case "image":      return <WImage {...props} />;
    default:           return <div style={{ color: p.dim, fontSize: "0.8rem", fontFamily: f.mono }}>{widget.type}</div>;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// WIDGET CELL — drag / resize / surface picker
// ═══════════════════════════════════════════════════════════════════════
function Cell({ widget, p, f, s, editMode, selected, onSelect, onMove, onResize, onDelete, onDuplicate, onUpdate, cellW, gap }) {
  const surface = widget.surface || s.defaultSurface || "filled";
  const radius  = s.radius || "round";
  const pad     = s.widgetPad ?? 16;
  const cs = useMemo(() => surfaceStyle(surface, p, radius, pad), [surface, p, radius, pad]);
  const rowH = s.rowH || 82;
  const isSel = selected === widget.id;

  const onMD = useCallback(e => {
    if (!editMode || e.button !== 0) return;
    e.stopPropagation(); onSelect(widget.id);
    const sx = e.clientX, sy = e.clientY, oc = widget.col, or = widget.row;
    const mv = ev => onMove(widget.id, Math.max(1, Math.min(COLS - widget.w + 1, oc + Math.round((ev.clientX - sx) / (cellW + gap)))), Math.max(1, or + Math.round((ev.clientY - sy) / (rowH + gap))));
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  }, [editMode, widget, cellW, gap, rowH, onMove, onSelect]);

  const onRD = useCallback(e => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ow = widget.w, oh = widget.h;
    const mv = ev => onResize(widget.id, Math.max(2, Math.min(COLS - widget.col + 1, ow + Math.round((ev.clientX - sx) / (cellW + gap)))), Math.max(1, oh + Math.round((ev.clientY - sy) / (rowH + gap))));
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  }, [widget, cellW, gap, rowH, onResize]);

  return (
    <div style={{ gridColumn: `${widget.col}/span ${widget.w}`, gridRow: `${widget.row}/span ${widget.h}`, position: "relative", cursor: editMode ? "grab" : "default", userSelect: "none", opacity: widget.opacity || 1 }}
      onMouseDown={onMD} onClick={e => { e.stopPropagation(); if (editMode) onSelect(widget.id); }}>

      {/* Card */}
      <div style={{
        ...cs, height: "100%", boxSizing: "border-box",
        outline: isSel && editMode ? `2px solid ${p.accent}` : editMode && surface === "ghost" ? `1px dashed ${p.border}` : "none",
        outlineOffset: 2, position: "relative", transition: "outline 0.15s",
      }}>
        {/* Small type label in edit mode */}
        {editMode && (
          <div style={{ position: "absolute", top: surface === "ghost" ? -18 : 5, left: surface === "ghost" ? 0 : 8, fontSize: "0.43rem", color: surface === "ghost" ? p.accent : p.muted, textTransform: "uppercase", letterSpacing: "0.18em", pointerEvents: "none", fontFamily: f.mono, background: surface === "ghost" ? `${p.card}CC` : undefined, padding: surface === "ghost" ? "1px 4px" : undefined, borderRadius: surface === "ghost" ? 3 : undefined }}>
            {widget.title || widget.type}
          </div>
        )}
        <div style={{ height: "100%" }}>
          <WidgetBody widget={widget} p={p} f={f} s={s} editMode={editMode} onUpdate={onUpdate} />
        </div>
      </div>

      {/* ─ EDIT TOOLBAR — floats above cell ─────────────────── */}
      {editMode && isSel && (
        <div style={{ position: "absolute", top: surface === "ghost" ? -40 : -36, left: 0, right: 0, display: "flex", alignItems: "center", gap: 3, zIndex: 60, animation: "tbIn 0.15s ease" }}
          onMouseDown={e => e.stopPropagation()}>

          {/* SURFACE PICKER — the key feature, prominently displayed */}
          <div style={{ display: "flex", background: p.card, border: `1px solid ${p.border}`, borderRadius: 6, overflow: "hidden", boxShadow: `0 2px 12px rgba(0,0,0,0.35)` }}>
            {Object.entries(SURFACES).map(([key, mode]) => (
              <button key={key} onClick={() => onUpdate(widget.id, { surface: key })} style={{
                padding: "0.2rem 0.6rem", background: surface === key ? p.accent : "transparent",
                border: "none", borderRight: `1px solid ${p.border}`, color: surface === key ? "#fff" : p.muted,
                cursor: "pointer", fontSize: "0.62rem", fontFamily: f.mono, letterSpacing: "0.04em",
                transition: "all 0.12s", fontWeight: surface === key ? 500 : 300,
              }}>{mode.label}</button>
            ))}
          </div>

          {/* Opacity */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, background: p.card, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.18rem 0.45rem", boxShadow: `0 2px 12px rgba(0,0,0,0.35)` }}>
            <span style={{ color: p.dim, fontSize: "0.5rem", fontFamily: f.mono }}>α</span>
            <input type="range" min={20} max={100} value={Math.round((widget.opacity || 1) * 100)} onChange={e => onUpdate(widget.id, { opacity: +e.target.value / 100 })} style={{ width: 44, accentColor: p.accent, height: 8 }} />
          </div>

          <button onClick={() => onDuplicate(widget.id)} style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: 5, padding: "0.2rem 0.45rem", color: p.muted, cursor: "pointer", fontSize: "0.65rem", fontFamily: f.mono, boxShadow: `0 2px 12px rgba(0,0,0,0.35)` }}>⧉</button>
          <button onClick={() => onDelete(widget.id)} style={{ background: "#c0392b", border: "none", borderRadius: 5, padding: "0.2rem 0.45rem", color: "#fff", cursor: "pointer", fontSize: "0.65rem", fontFamily: f.mono, boxShadow: `0 2px 12px rgba(0,0,0,0.35)` }}>✕</button>
        </div>
      )}

      {/* Resize handle */}
      {editMode && isSel && (
        <div onMouseDown={onRD} onMouseDownCapture={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: 2, right: 2, width: 20, height: 20, cursor: "se-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10"><path d="M2 8L8 2M5 8L8 5" stroke={p.accent} strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PANEL SHELL
// ═══════════════════════════════════════════════════════════════════════
function Panel({ p, f, title, onClose, children }) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 296, maxWidth: "90vw", background: p.card, borderLeft: `1px solid ${p.border}`, zIndex: 500, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "-10px 0 40px rgba(0,0,0,0.2)" }}>
      <div style={{ padding: "1rem 1.1rem 0.65rem", borderBottom: `1px solid ${p.border}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: p.text, fontSize: "0.82rem", fontFamily: f.serif, fontWeight: 400, letterSpacing: "0.01em" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: p.muted, cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0.2rem" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.85rem 1.1rem", scrollbarWidth: "thin", scrollbarColor: `${p.border} transparent` }}>{children}</div>
    </div>
  );
}

function Row({ p, f, label, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ color: p.dim, fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.42rem", fontFamily: f.mono }}>{label}</div>
      {children}
    </div>
  );
}

// ─── DESIGN PANEL ──────────────────────────────────────────────────────────
function DesignPanel({ p, f, s, onChange, onClose }) {
  const [tab, setTab] = useState("look");
  return (
    <Panel p={p} f={f} title="Design" onClose={onClose}>
      <div style={{ display: "flex", gap: 3, marginBottom: "1rem" }}>
        {[["look", "Look"], ["layout", "Layout"], ["canvas", "Canvas"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "0.26rem", background: tab === id ? p.tag : "transparent", border: `1px solid ${tab === id ? p.accent : p.border}`, borderRadius: 5, color: tab === id ? p.accent : p.muted, cursor: "pointer", fontSize: "0.68rem", fontFamily: f.sans, transition: "all 0.12s" }}>{l}</button>
        ))}
      </div>

      {tab === "look" && <>
        <Row p={p} f={f} label="Palette">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem" }}>
            {Object.entries(PALETTES).map(([k, pl]) => (
              <div key={k} onClick={() => onChange("palette", k)} style={{ cursor: "pointer", border: `1px solid ${s.palette === k ? pl.accent : p.border}`, borderRadius: 7, overflow: "hidden", transition: "all 0.12s" }}>
                <div style={{ height: 22, background: pl.bg, display: "flex", alignItems: "flex-end", padding: "0 5px 3px", gap: 2 }}>
                  {[1, 0.55, 0.25].map((o, i) => <div key={i} style={{ flex: 1, height: [14, 9, 5][i], background: pl.accent, borderRadius: 1, opacity: o }} />)}
                </div>
                <div style={{ padding: "0.2rem 0.38rem", background: p.card }}><span style={{ color: p.text, fontSize: "0.62rem", fontFamily: f.sans }}>{pl.name}</span></div>
              </div>
            ))}
          </div>
        </Row>
        <Row p={p} f={f} label="Custom Accent">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: "0.4rem" }}>
            {["#C9853A", "#A8390A", "#2F81F7", "#3CB371", "#C04040", "#9b59b6", "#e74c3c", "#f39c12", "#7AADFF", "#e91e63", "#ffffff", "#94a3b8"].map(c => (
              <div key={c} onClick={() => onChange("customAccent", c)} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${(s.customAccent || p.accent) === c ? "#fff" : "transparent"}`, transition: "border 0.12s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <input type="color" value={s.customAccent || p.accent} onChange={e => onChange("customAccent", e.target.value)} style={{ width: 28, height: 22, border: `1px solid ${p.border}`, borderRadius: 4, background: "transparent", cursor: "pointer", padding: 0 }} />
            {s.customAccent && <button onClick={() => onChange("customAccent", null)} style={{ background: "none", border: `1px solid ${p.border}`, borderRadius: 4, padding: "0.14rem 0.38rem", color: p.muted, cursor: "pointer", fontSize: "0.62rem", fontFamily: f.sans }}>Reset</button>}
          </div>
        </Row>
        <Row p={p} f={f} label="Typeface">
          {Object.entries(TYPEFACES).map(([k, ty]) => (
            <div key={k} onClick={() => onChange("typeface", k)} style={{ cursor: "pointer", padding: "0.4rem 0.52rem", border: `1px solid ${s.typeface === k ? p.accent : p.border}`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.26rem", transition: "all 0.12s", background: s.typeface === k ? p.tag : "transparent" }}>
              <span style={{ color: p.text, fontFamily: ty.serif, fontSize: "0.86rem" }}>{ty.name}</span>
              <span style={{ color: p.dim, fontSize: "0.6rem", fontFamily: f.mono }}>{k}</span>
            </div>
          ))}
        </Row>
        <Row p={p} f={f} label="Default Widget Surface">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {Object.entries(SURFACES).map(([k, m]) => (
              <div key={k} onClick={() => onChange("defaultSurface", k)} style={{ padding: "0.32rem 0.1rem", border: `1px solid ${(s.defaultSurface || "filled") === k ? p.accent : p.border}`, borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.12s", background: (s.defaultSurface || "filled") === k ? `${p.accent}14` : "transparent" }}>
                <div style={{ color: (s.defaultSurface || "filled") === k ? p.accent : p.muted, fontSize: "0.66rem", fontFamily: f.mono, fontWeight: (s.defaultSurface || "filled") === k ? 500 : 300 }}>{m.label}</div>
                <div style={{ color: p.dim, fontSize: "0.5rem", marginTop: 2, fontFamily: f.sans }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </Row>
        <Row p={p} f={f} label="Corner Radius">
          <div style={{ display: "flex", gap: 3 }}>
            {Object.entries(RADII).map(([k, v]) => (
              <div key={k} onClick={() => onChange("radius", k)} style={{ flex: 1, padding: "0.26rem", border: `1px solid ${(s.radius || "round") === k ? p.accent : p.border}`, borderRadius: v + 2, textAlign: "center", cursor: "pointer", color: (s.radius || "round") === k ? p.accent : p.dim, fontSize: "0.58rem", fontFamily: f.mono, transition: "all 0.12s" }}>{k}</div>
            ))}
          </div>
        </Row>
      </>}

      {tab === "layout" && <>
        {[["Gap", "gridGap", 0, 24, 12], ["Row Height", "rowH", 48, 140, 82], ["Padding", "widgetPad", 4, 32, 16]].map(([l, k, min, max, def]) => (
          <Row key={k} p={p} f={f} label={`${l}: ${s[k] ?? def}px`}>
            <input type="range" min={min} max={max} value={s[k] ?? def} onChange={e => onChange(k, +e.target.value)} style={{ width: "100%", accentColor: p.accent }} />
          </Row>
        ))}
        <Row p={p} f={f} label="Custom CSS">
          <textarea value={s.customCSS || ""} onChange={e => onChange("customCSS", e.target.value)} placeholder=".my-class { font-size: 1rem } /* Live */" rows={5} style={{ width: "100%", background: p.tag, border: `1px solid ${p.border}`, borderRadius: 6, padding: "0.38rem 0.45rem", color: p.text, fontSize: "0.68rem", outline: "none", resize: "none", fontFamily: f.mono, lineHeight: 1.6, boxSizing: "border-box" }} />
        </Row>
      </>}

      {tab === "canvas" && <>
        <Row p={p} f={f} label="Background Pattern">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.28rem" }}>
            {[
              { id: "none", name: "Solid" },
              { id: "grid", name: "Grid", style: { backgroundImage: `linear-gradient(${p.border} 1px,transparent 1px),linear-gradient(90deg,${p.border} 1px,transparent 1px)`, backgroundSize: "32px 32px" } },
              { id: "dots", name: "Dots", style: { backgroundImage: `radial-gradient(${p.border} 1px,transparent 1px)`, backgroundSize: "20px 20px" } },
              { id: "fine", name: "Fine Grid", style: { backgroundImage: `linear-gradient(${p.border}70 1px,transparent 1px),linear-gradient(90deg,${p.border}70 1px,transparent 1px)`, backgroundSize: "16px 16px" } },
              { id: "lines", name: "Lines", style: { backgroundImage: `repeating-linear-gradient(0deg,${p.border}50 0,${p.border}50 1px,transparent 1px,transparent 40px)` } },
              { id: "custom", name: "Image URL" },
            ].map(bg => (
              <div key={bg.id} onClick={() => onChange("bgPattern", bg.id)} style={{ border: `1px solid ${s.bgPattern === bg.id ? p.accent : p.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", transition: "all 0.12s" }}>
                <div style={{ height: 26, background: p.bg, ...(bg.style || {}) }} />
                <div style={{ padding: "0.2rem 0.35rem", background: p.card }}><span style={{ color: p.text, fontSize: "0.6rem", fontFamily: f.sans }}>{bg.name}</span></div>
              </div>
            ))}
          </div>
        </Row>
        {s.bgPattern === "custom" && (
          <Row p={p} f={f} label="Image URL">
            <input value={s.bgUrl || ""} onChange={e => onChange("bgUrl", e.target.value)} placeholder="https://… jpg or png" style={{ width: "100%", background: p.tag, border: `1px solid ${p.border}`, borderRadius: 6, padding: "0.35rem 0.45rem", color: p.text, fontSize: "0.74rem", outline: "none", fontFamily: f.sans, boxSizing: "border-box" }} />
          </Row>
        )}
        {[["Film Grain", "noise"], ["Scanlines", "scanlines"], ["Vignette", "vignette"]].map(([l, k]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem" }}>
            <span style={{ color: p.muted, fontSize: "0.74rem", fontFamily: f.sans }}>{l}</span>
            <Switch p={p} value={!!s[k]} onChange={v => onChange(k, v)} />
          </div>
        ))}
      </>}
    </Panel>
  );
}

function ProfilePanel({ p, f, s, onChange, onClose, onReset }) {
  return (
    <Panel p={p} f={f} title="Profile & AI" onClose={onClose}>
      <Row p={p} f={f} label="Identity">
        {[["Name", "name", "Alex"], ["Location", "location", "City…"], ["Role", "role", "Your role…"]].map(([l, k, ph]) => (
          <div key={k} style={{ marginBottom: "0.45rem" }}>
            <div style={{ color: p.dim, fontSize: "0.55rem", marginBottom: "0.12rem", fontFamily: f.mono }}>{l}</div>
            <input value={s[k] || ""} onChange={e => onChange(k, e.target.value)} placeholder={ph} style={{ width: "100%", background: p.tag, border: `1px solid ${p.border}`, borderRadius: 6, padding: "0.38rem 0.5rem", color: p.text, fontSize: "0.84rem", outline: "none", fontFamily: f.sans, boxSizing: "border-box" }} />
          </div>
        ))}
      </Row>
      <Row p={p} f={f} label="AI Personality">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {["Friendly", "Professional", "Socratic", "Creative", "Coach", "Witty"].map(pt => (
            <div key={pt} onClick={() => onChange("aiPersonality", pt)} style={{ padding: "0.2rem 0.5rem", border: `1px solid ${s.aiPersonality === pt ? p.accent : p.border}`, borderRadius: 14, color: s.aiPersonality === pt ? p.accent : p.muted, fontSize: "0.68rem", cursor: "pointer", fontFamily: f.sans, transition: "all 0.12s" }}>{pt}</div>
          ))}
        </div>
      </Row>
      <Row p={p} f={f} label="Briefing Style">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {["Warm", "Motivational", "Minimal", "Poetic", "Practical"].map(st => (
            <div key={st} onClick={() => onChange("briefingStyle", st)} style={{ padding: "0.2rem 0.5rem", border: `1px solid ${s.briefingStyle === st ? p.accent : p.border}`, borderRadius: 14, color: s.briefingStyle === st ? p.accent : p.muted, fontSize: "0.68rem", cursor: "pointer", fontFamily: f.sans, transition: "all 0.12s" }}>{st}</div>
          ))}
        </div>
      </Row>
      <Row p={p} f={f} label="AI Context">
        <textarea value={s.aiContext || ""} onChange={e => onChange("aiContext", e.target.value)} placeholder="Tell the AI about you, your work, interests…" rows={3} style={{ width: "100%", background: p.tag, border: `1px solid ${p.border}`, borderRadius: 6, padding: "0.38rem 0.45rem", color: p.text, fontSize: "0.78rem", outline: "none", resize: "none", fontFamily: f.sans, lineHeight: 1.6, boxSizing: "border-box" }} />
      </Row>
      <Row p={p} f={f} label="Preferences">
        {[["Time", "timeFormat", [{ v: "12h", l: "12h" }, { v: "24h", l: "24h" }]], ["Temperature", "units", [{ v: "imperial", l: "°F" }, { v: "metric", l: "°C" }]]].map(([l, k, opts]) => (
          <div key={k} style={{ marginBottom: "0.5rem" }}>
            <div style={{ color: p.dim, fontSize: "0.55rem", marginBottom: "0.15rem", fontFamily: f.mono }}>{l}</div>
            <div style={{ display: "flex", gap: "0.28rem" }}>
              {opts.map(o => <div key={o.v} onClick={() => onChange(k, o.v)} style={{ flex: 1, padding: "0.32rem", border: `1px solid ${s[k] === o.v ? p.accent : p.border}`, borderRadius: 5, textAlign: "center", cursor: "pointer", color: s[k] === o.v ? p.accent : p.muted, fontSize: "0.74rem", fontFamily: f.sans, transition: "all 0.12s" }}>{o.l}</div>)}
            </div>
          </div>
        ))}
      </Row>
      <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: "0.85rem" }}>
        <button onClick={onReset} style={{ width: "100%", background: "transparent", border: "1px solid #c0392b", borderRadius: 7, padding: "0.42rem", color: "#c0392b", cursor: "pointer", fontSize: "0.76rem", fontFamily: f.sans }}>Reset to defaults</button>
      </div>
    </Panel>
  );
}

function CatalogPanel({ p, f, s, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const categories = ["Time", "AI", "Info", "Work", "Life", "Tools", "Text"];
  const getCat = w => ({ clock: "Time", worldclock: "Time", stopwatch: "Time", countdown: "Time", search: "AI", chat: "AI", briefing: "AI", poem: "AI", quote: "AI", weather: "Info", news: "Info", stocks: "Info", todo: "Work", habits: "Work", goals: "Work", journal: "Work", notes: "Work", kanban: "Work", pomodoro: "Work", calendar: "Work", mood: "Life", breathing: "Life", water: "Life", sleep: "Life", calc: "Tools", currency: "Tools", converter: "Tools", heading: "Text", label: "Text", divider: "Text", image: "Text" })[w.type] || "Other";
  const filtered = search ? WIDGETS.filter(w => w.name.toLowerCase().includes(search.toLowerCase())) : null;
  return (
    <Panel p={p} f={f} title="Add Widget" onClose={onClose}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search widgets…"
        style={{ width: "100%", background: p.tag, border: `1px solid ${p.border}`, borderRadius: 7, padding: "0.4rem 0.55rem", color: p.text, fontSize: "0.82rem", outline: "none", fontFamily: f.sans, boxSizing: "border-box", marginBottom: "0.85rem" }} />
      {filtered ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.24rem" }}>{filtered.map(w => <CatRow key={w.type} w={w} p={p} f={f} onAdd={onAdd} />)}</div>
      ) : categories.map(cat => {
        const ws = WIDGETS.filter(w => getCat(w) === cat);
        if (!ws.length) return null;
        return (
          <div key={cat} style={{ marginBottom: "0.9rem" }}>
            <div style={{ color: p.dim, fontSize: "0.52rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: f.mono, marginBottom: "0.32rem" }}>{cat}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.22rem" }}>{ws.map(w => <CatRow key={w.type} w={w} p={p} f={f} onAdd={onAdd} />)}</div>
          </div>
        );
      })}
    </Panel>
  );
}

function CatRow({ w, p, f, onAdd }) {
  return (
    <div onClick={() => onAdd(w.type)} style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.42rem 0.6rem", border: `1px solid ${p.border}`, borderRadius: 7, cursor: "pointer", transition: "all 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.background = p.tag; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.background = "transparent"; }}>
      <span style={{ fontFamily: f.mono, fontSize: "0.88rem", color: p.dim, width: 20, textAlign: "center", flexShrink: 0 }}>{w.icon}</span>
      <div>
        <div style={{ color: p.text, fontSize: "0.76rem", fontFamily: f.sans, fontWeight: 400 }}>{w.name}</div>
        <div style={{ color: p.dim, fontSize: "0.58rem", fontFamily: f.mono }}>{w.w}×{w.h}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  palette: "noir", typeface: "cormorant", customAccent: null,
  radius: "soft", gridGap: 12, rowH: 82, widgetPad: 16,
  defaultSurface: "filled", bgPattern: "dots", bgUrl: "",
  noise: false, scanlines: false, vignette: false, customCSS: "",
  name: "", location: "", role: "", aiPersonality: "Friendly",
  briefingStyle: "Warm", aiContext: "", timeFormat: "12h", units: "imperial",
};

const DEFAULT_LAYOUT = [
  { id: "c1",  type: "clock",    col: 1, row: 1, w: 8, h: 2, title: "Clock",    surface: "ghost"    },
  { id: "s1",  type: "search",   col: 1, row: 3, w: 8, h: 1, title: "Search",   surface: "outlined" },
  { id: "wx1", type: "weather",  col: 9, row: 1, w: 4, h: 2, title: "Weather",  surface: "filled"   },
  { id: "br1", type: "briefing", col: 9, row: 3, w: 4, h: 2, title: "Briefing", surface: "filled"   },
  { id: "ai1", type: "chat",     col: 1, row: 4, w: 6, h: 4, title: "AI Chat",  surface: "filled"   },
  { id: "td1", type: "todo",     col: 9, row: 5, w: 4, h: 3, title: "Tasks",    surface: "filled"   },
  { id: "qw1", type: "quote",    col: 7, row: 4, w: 2, h: 2, title: "Quote",    surface: "ghost"    },
  { id: "md1", type: "mood",     col: 7, row: 6, w: 2, h: 2, title: "Mood",     surface: "ghost"    },
];

// ═══════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState(null);
  const containerRef = useRef(null);
  const [cellW, setCellW] = useState(100);

  useEffect(() => {
    (async () => {
      const [sv, lv] = await Promise.all([store.get("v9-settings"), store.get("v9-layout")]);
      if (sv) setSettings(x => ({ ...DEFAULT_SETTINGS, ...sv }));
      if (lv) setLayout(lv);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) store.set("v9-settings", settings); }, [settings, ready]);
  useEffect(() => { if (ready) store.set("v9-layout", layout); }, [layout, ready]);

  const p = useMemo(() => {
    const base = { ...PALETTES[settings.palette] || PALETTES.noir };
    if (settings.customAccent) { base.accent = settings.customAccent; base.glow = settings.customAccent; }
    return base;
  }, [settings.palette, settings.customAccent]);

  const f = TYPEFACES[settings.typeface] || TYPEFACES.cormorant;
  const gap = settings.gridGap ?? 12;
  const rowH = settings.rowH ?? 82;
  const maxRow = useMemo(() => layout.reduce((m, w) => Math.max(m, w.row + w.h - 1), 6), [layout]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setCellW((e.contentRect.width - (COLS - 1) * gap) / COLS));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [gap]);

  const update = (k, v) => setSettings(s => ({ ...s, [k]: v }));
  const updateWidget = useCallback((id, patch) => setLayout(l => l.map(w => w.id === id ? { ...w, ...patch } : w)), []);
  const deleteWidget = useCallback(id => { setLayout(l => l.filter(w => w.id !== id)); setSelected(null); }, []);
  const duplicateWidget = useCallback(id => setLayout(l => { const w = l.find(x => x.id === id); return w ? [...l, { ...w, id: uid(), row: w.row + w.h }] : l; }), []);
  const moveWidget = useCallback((id, col, row) => updateWidget(id, { col, row }), [updateWidget]);
  const resizeWidget = useCallback((id, w, h) => updateWidget(id, { w, h }), [updateWidget]);

  const addWidget = useCallback(type => {
    const cat = WIDGETS.find(c => c.type === type); if (!cat) return;
    setLayout(l => [...l, { id: uid(), type, col: 1, row: maxRow + 1, w: cat.w, h: cat.h, title: cat.name, surface: settings.defaultSurface || "filled", config: {} }]);
    setPanel(null);
  }, [maxRow, settings.defaultSurface]);

  const bgStyle = useMemo(() => {
    const pat = settings.bgPattern;
    if (!pat || pat === "none") return { background: p.bg };
    if (pat === "custom" && settings.bgUrl) return { backgroundImage: `url(${settings.bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
    const pats = {
      grid:  { backgroundImage: `linear-gradient(${p.border} 1px,transparent 1px),linear-gradient(90deg,${p.border} 1px,transparent 1px)`, backgroundSize: "32px 32px", background: p.bg },
      dots:  { backgroundImage: `radial-gradient(${p.border} 1.2px,transparent 1.2px)`, backgroundSize: "22px 22px", background: p.bg },
      fine:  { backgroundImage: `linear-gradient(${p.border}80 1px,transparent 1px),linear-gradient(90deg,${p.border}80 1px,transparent 1px)`, backgroundSize: "14px 14px", background: p.bg },
      lines: { backgroundImage: `repeating-linear-gradient(0deg,${p.border}60 0,${p.border}60 1px,transparent 1px,transparent 36px)`, background: p.bg },
    };
    return pats[pat] || { background: p.bg };
  }, [settings.bgPattern, settings.bgUrl, p.bg, p.border]);

  if (!ready) return <div style={{ minHeight: "100vh", background: PALETTES.noir.bg }} />;

  return (
    <div style={{ minHeight: "100vh", ...bgStyle, fontFamily: f.sans, position: "relative", boxSizing: "border-box" }}>
      <style>{`
        @import url('${f.url}');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${p.bg}}
        input::placeholder,textarea::placeholder{color:${p.dim}!important;opacity:1}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${p.border};border-radius:3px}
        select option{background:${p.card};color:${p.text}}
        @keyframes blink{0%,100%{opacity:.2}50%{opacity:.05}}
        @keyframes dotpulse{0%,80%,100%{opacity:.15;transform:scale(.7)}40%{opacity:1;transform:scale(1)}}
        @keyframes tbIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        ${settings.customCSS || ""}
      `}</style>

      {/* Overlay for custom bg */}
      {settings.bgPattern === "custom" && settings.bgUrl && <div style={{ position: "fixed", inset: 0, background: p.bg, opacity: 0.3, pointerEvents: "none", zIndex: 0 }} />}

      {/* Atmospheric effects */}
      {settings.noise && <div style={{ position: "fixed", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, pointerEvents: "none", zIndex: 1 }} />}
      {settings.scanlines && <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)", pointerEvents: "none", zIndex: 1 }} />}
      {settings.vignette && <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.5) 100%)", pointerEvents: "none", zIndex: 1 }} />}

      {/* Panel backdrop */}
      {panel && <div onClick={() => setPanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 490, backdropFilter: "blur(3px)" }} />}

      {/* Side panels */}
      {panel === "design"  && <DesignPanel  p={p} f={f} s={settings} onChange={update} onClose={() => setPanel(null)} />}
      {panel === "profile" && <ProfilePanel p={p} f={f} s={settings} onChange={update} onClose={() => setPanel(null)} onReset={async () => { await store.set("v9-settings", null); await store.set("v9-layout", null); setSettings(DEFAULT_SETTINGS); setLayout(DEFAULT_LAYOUT); setPanel(null); }} />}
      {panel === "catalog" && <CatalogPanel p={p} f={f} s={settings} onAdd={addWidget} onClose={() => setPanel(null)} />}

      {/* ── MAIN ───────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 2, padding: `${gap * 2}px`, paddingBottom: "4rem" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: `${gap * 2}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <span style={{ fontFamily: f.serif, color: p.text, fontSize: "1rem", fontWeight: 300, fontStyle: "italic", letterSpacing: "0.01em" }}>
              {settings.name ? `${settings.name}'s space` : "my space"}
            </span>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.accent, opacity: 0.75 }} />
          </div>
          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            {editMode && (
              <button onClick={() => setPanel(panel === "catalog" ? null : "catalog")} style={{ background: panel === "catalog" ? p.accent : "transparent", border: `1px solid ${panel === "catalog" ? p.accent : p.border}`, borderRadius: 6, padding: "0.27rem 0.7rem", color: panel === "catalog" ? "#fff" : p.muted, cursor: "pointer", fontSize: "0.72rem", fontFamily: f.sans, transition: "all 0.12s" }}>+ Widget</button>
            )}
            {!editMode && [{ id: "design", sym: "◑", tip: "Design" }, { id: "profile", sym: "⊙", tip: "Profile & AI" }].map(b => (
              <button key={b.id} title={b.tip} onClick={() => setPanel(panel === b.id ? null : b.id)} style={{ background: panel === b.id ? p.tag : "transparent", border: `1px solid ${panel === b.id ? p.accent : p.border}`, borderRadius: 6, padding: "0.27rem 0.55rem", color: panel === b.id ? p.accent : p.muted, cursor: "pointer", fontSize: "0.82rem", fontFamily: f.mono, transition: "all 0.12s" }}>{b.sym}</button>
            ))}
            <button onClick={() => { setEditMode(e => !e); setPanel(null); setSelected(null); }} style={{ background: editMode ? p.accent : "transparent", border: `1px solid ${editMode ? p.accent : p.border}`, borderRadius: 6, padding: "0.27rem 0.7rem", color: editMode ? "#fff" : p.muted, cursor: "pointer", fontSize: "0.72rem", fontFamily: f.sans, transition: "all 0.12s", letterSpacing: "0.02em" }}>
              {editMode ? "✓ Done" : "Edit"}
            </button>
          </div>
        </div>

        {/* Edit hint */}
        {editMode && (
          <div style={{ background: `${p.accent}12`, border: `1px solid ${p.accent}22`, borderRadius: 8, padding: "0.42rem 0.85rem", marginBottom: `${gap}px`, color: p.accent, fontSize: "0.7rem", fontFamily: f.sans, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <span>Drag to move · Resize from corner · Click widget → <strong style={{ fontFamily: f.mono }}>Filled / Outlined / Ghost</strong></span>
          </div>
        )}

        {/* Grid */}
        <div ref={containerRef} onClick={() => setSelected(null)}
          style={{ display: "grid", gridTemplateColumns: `repeat(${COLS},1fr)`, gridAutoRows: `${rowH}px`, gap: `${gap}px`, position: "relative", minHeight: `${(maxRow + 2) * (rowH + gap)}px` }}>

          {/* Ghost cells in edit mode */}
          {editMode && Array.from({ length: maxRow + 3 }).flatMap((_, r) => Array.from({ length: COLS }, (_, c) => (
            <div key={`g${r}-${c}`} style={{ gridColumn: c + 1, gridRow: r + 1, border: `1px dashed ${p.border}40`, borderRadius: RADII[settings.radius || "soft"], pointerEvents: "none" }} />
          )))}

          {layout.map(widget => (
            <Cell key={widget.id} widget={widget} p={p} f={f} s={settings}
              editMode={editMode} selected={selected}
              onSelect={setSelected} onMove={moveWidget} onResize={resizeWidget}
              onDelete={deleteWidget} onDuplicate={duplicateWidget} onUpdate={updateWidget}
              cellW={cellW} gap={gap} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "2.5rem", color: p.dim, fontSize: "0.5rem", letterSpacing: "0.32em", textTransform: "uppercase", fontFamily: f.mono }}>
          Claude · Anthropic
        </div>
      </div>
    </div>
  );
}
