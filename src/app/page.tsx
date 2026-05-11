"use client";
// src/app/page.tsx

import { useState, useEffect } from "react";
import { useAllMarkets }   from "@/hooks/useMarkets";
import { MarketCard }      from "@/components/MarketCard";

const FILTERS = [
  { id: "all",      label: "TODO"       },
  { id: "futbol",   label: "⚽ FÚTBOL"  },
  { id: "politica", label: "🗳 POLÍTICA" },
  { id: "economia", label: "💸 ECONOMÍA" },
  { id: "cultura",  label: "🎭 CULTURA"  },
];

const FAKE_FEED = [
  { user: "0x4f2a...8c3d", dir: true,  amount: 250, ago: "2m" },
  { user: "0xa1b9...ff20", dir: false, amount: 80,  ago: "5m" },
  { user: "0x7c3e...12ab", dir: true,  amount: 500, ago: "8m" },
  { user: "0x2d9f...6611", dir: true,  amount: 150, ago: "11m" },
  { user: "0xb8c1...3390", dir: false, amount: 200, ago: "14m" },
  { user: "0x99a2...7741", dir: true,  amount: 75,  ago: "18m" },
];

export default function HomePage() {
  const [filter, setFilter]     = useState("all");
  const [feedItems, setFeedItems] = useState(FAKE_FEED.slice(0, 5));
  const { markets, isLoading, refetch } = useAllMarkets();

  useEffect(() => {
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % FAKE_FEED.length;
      setFeedItems(prev => [FAKE_FEED[idx], ...prev.slice(0, 4)]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const filtered      = filter === "all" ? markets : markets.filter(m => m.category === filter);
  const totalVol      = markets.reduce((a, m) => a + Number(m.volume) / 1_000_000, 0);
  const openCount     = markets.filter(m => m.state === 0).length;
  const resolvedCount = markets.filter(m => m.state === 2).length;

  return (
    <>
      {/* HERO STATS */}
      <div className="hero-strip">
        {[
          { label: "Volumen Total",    val: `$${totalVol.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, sub: "USDC" },
          { label: "Mercados Activos", val: openCount,       sub: "en vivo"  },
          { label: "Resueltos",        val: resolvedCount,   sub: "histórico" },
          { label: "Red Blockchain",   val: "POLYGON",       sub: "~$0.001 gas" },
        ].map((s, i) => (
          <div key={i} className="hero-stat">
            <span className="hero-stat-val">{s.val}</span>
            <span className="hero-stat-label">{s.label}</span>
            <span style={{ fontSize: "9px", color: "var(--text3)", letterSpacing: "1px" }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 272px", gap: "20px", alignItems: "start" }}>

        {/* LEFT: Markets */}
        <div>
          <div className="section-head">
            <span className="section-title">// Mercados Activos</span>
            <span className="section-count">{filtered.length} resultados</span>
          </div>

          <div className="filter-row">
            {FILTERS.map(f => (
              <button key={f.id} className={`filter-pill ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="loading-rows">
              {[1,2,3].map(i => <div key={i} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">SIN MERCADOS EN ESTA CATEGORÍA</div>
          ) : (
            <div className="markets-grid">
              {filtered.map(m => (
                <MarketCard key={m.address} market={m} onTradeComplete={refetch} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", position: "sticky", top: "64px" }}>

          {/* Live feed */}
          <div style={{ background: "var(--surface)", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: "3px", color: "var(--text3)" }}>// ACTIVIDAD</span>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
            </div>
            <ul className="feed-list">
              {feedItems.map((item, i) => (
                <li key={i} className="feed-item" style={{ opacity: Math.max(0.3, 1 - i * 0.18) }}>
                  <span className={`feed-dot ${item.dir ? "yes" : "no"}`} />
                  <span className="feed-text">
                    <span style={{ color: "var(--text3)", fontSize: "10px" }}>{item.user}</span>
                    {" "}<span className={item.dir ? "green" : "red"}>{item.dir ? "SÍ" : "NO"}</span>
                  </span>
                  <span className="feed-amount">${item.amount}</span>
                  <span className="feed-time">{item.ago}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How it works */}
          <div style={{ background: "var(--surface)", padding: "16px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: "3px", color: "var(--text3)", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              // CÓMO FUNCIONA
            </div>
            {[
              { n: "01", t: "Conecta wallet",    d: "MetaMask · USDC en Polygon" },
              { n: "02", t: "Elige SÍ o NO",     d: "Precio = probabilidad del mercado" },
              { n: "03", t: "Cobra ganancias",   d: "1 share = 1 USDC si aciertas" },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--text3)", lineHeight: 1, flexShrink: 0, width: "28px" }}>{s.n}</span>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text)", marginBottom: "2px" }}>{s.t}</div>
                  <div style={{ fontSize: "10px", color: "var(--text3)" }}>{s.d}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: "10px", background: "var(--bg3)", border: "1px solid var(--border)", fontSize: "10px", color: "var(--text3)", lineHeight: 1.8, marginTop: "8px" }}>
              ⛓️ Polygon PoS &nbsp;·&nbsp; USDC colateral<br />
              🔒 Contratos verificados &nbsp;·&nbsp; 2% fee
            </div>
          </div>

          {/* Telegram CTA */}
          <a href="https://t.me/pronosticosmx" target="_blank" rel="noopener"
            style={{ background: "var(--surface)", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid var(--border)", transition: "background var(--transition)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}
          >
            <span style={{ fontSize: "18px" }}>✈️</span>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text)", fontWeight: 500 }}>Únete al canal</div>
              <div style={{ fontSize: "9px", color: "var(--text3)", letterSpacing: "1px" }}>@PRONOSTICOSMX</div>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--text3)", fontSize: "12px" }}>→</span>
          </a>

        </div>
      </div>
    </>
  );
}
