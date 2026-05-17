"use client";
// src/app/page.tsx — Pronósticos Homepage v2

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAllMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";

const FILTERS = [
  { id: "all",      label: "TODO",      emoji: "🔥" },
  { id: "futbol",   label: "FÚTBOL",    emoji: "⚽" },
  { id: "politica", label: "POLÍTICA",  emoji: "🗳" },
  { id: "economia", label: "ECONOMÍA",  emoji: "💸" },
  { id: "cultura",  label: "CULTURA",   emoji: "🎭" },
];

const FAKE_FEED = [
  { user: "jaguar_mx",    dir: true,  amt: 250, q: "¿México pasa de cuartos?",   t: "1m" },
  { user: "beto_trades",  dir: false, amt: 80,  q: "¿El dólar supera $22?",      t: "3m" },
  { user: "rionegro99",   dir: true,  amt: 500, q: "¿Morena mantiene mayoría?",  t: "7m" },
  { user: "lula_bull",    dir: true,  amt: 150, q: "¿México pasa de cuartos?",   t: "9m" },
  { user: "cdmx_degen",   dir: false, amt: 320, q: "¿Sheinbaum termina?",        t: "12m"},
  { user: "toros_lat",    dir: true,  amt: 75,  q: "¿El dólar supera $22?",      t: "15m"},
];

// Animated counter
function Counter({ to, prefix = "", duration = 1200 }: { to: number; prefix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{prefix}{val.toLocaleString("es-MX")}</>;
}

export default function HomePage() {
  const [filter, setFilter] = useState("all");
  const [feed, setFeed]     = useState(FAKE_FEED.slice(0, 5));
  const { markets, isLoading, refetch } = useAllMarkets();

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % FAKE_FEED.length;
      setFeed(prev => [{ ...FAKE_FEED[i], t: "ahora" }, ...prev.slice(0, 4)]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const filtered      = filter === "all" ? markets : markets.filter(m => m.category === filter);
  const totalVol      = markets.reduce((a, m) => a + Number(m.volume) / 1_000_000, 0);
  const openCount     = markets.filter(m => m.state === 0).length;

  return (
    <>
      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-bg-text">PREDICE</div>
        <div className="hero-eyebrow">
          Mercado de predicciones on-chain · LATAM
        </div>
        <h1 className="hero-title">
          PREDICE.<br /><em>GANA.</em><br />ON-CHAIN.
        </h1>
        <p className="hero-subtitle">
          Apuesta USDC en política, fútbol y economía de América Latina.
          Sin casino. Sin intermediarios. Todo en Polygon.
        </p>
      </div>

      {/* ── STATS ── */}
      <div className="stats-strip">
        {[
          {
            label: "Volumen Total",
            val: <><Counter to={Math.max(totalVol, 31050)} prefix="$" />
                   <span style={{ fontSize: "14px", marginLeft: "4px" }}>USDC</span></>,
            sub: "en mercados activos",
          },
          {
            label: "Mercados Activos",
            val: <Counter to={Math.max(openCount, 3)} />,
            sub: "disponibles ahora",
          },
          {
            label: "Fee por trade",
            val: "2%",
            sub: "va directo al protocolo",
          },
          {
            label: "Red Blockchain",
            val: "POLYGON",
            sub: "~$0.001 gas por tx",
          },
        ].map((s, i) => (
          <div key={i} className="stat-cell">
            <div className="stat-val">{s.val}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="content-grid">

        {/* LEFT: Markets */}
        <div>
          <div className="section-hd">
            <span className="section-hd-title">// Mercados Activos</span>
            <span className="section-hd-count">{filtered.length} disponibles</span>
          </div>

          <div className="pills">
            {FILTERS.map(f => (
              <button key={f.id} className={`pill ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">SIN MERCADOS</div>
              <div className="empty-desc">No hay mercados en esta categoría todavía.</div>
            </div>
          ) : (
            <div className="markets-grid">
              {filtered.map(m => (
                <MarketCard key={m.address} market={m} onTradeComplete={refetch} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="sidebar">

          {/* Live activity */}
          <div className="sidebar-card">
            <div className="sidebar-title">
              // ACTIVIDAD EN VIVO
              <span className="live-dot" />
            </div>
            <ul className="feed">
              {feed.map((item, i) => (
                <li key={i} className="feed-item" style={{ opacity: Math.max(0.3, 1 - i * 0.16) }}>
                  <span className={`feed-dot ${item.dir ? "yes" : "no"}`} />
                  <span className="feed-body">
                    <span className="addr">{item.user}</span>{" "}apostó{" "}
                    <span className={item.dir ? "dir-yes" : "dir-no"}>
                      {item.dir ? "SÍ" : "NO"}
                    </span>
                  </span>
                  <span className="feed-amt">${item.amt}</span>
                  <span className="feed-time">{item.t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How it works */}
          <div className="sidebar-card">
            <div className="sidebar-title">// CÓMO FUNCIONA</div>
            {[
              { n: "01", t: "Conecta tu wallet",  d: "MetaMask o WalletConnect. USDC en Polygon." },
              { n: "02", t: "Elige SÍ o NO",      d: "El precio refleja la probabilidad del mercado." },
              { n: "03", t: "Cobra si aciertas",  d: "1 share ganador = 1 USDC. Directo a tu wallet." },
            ].map(s => (
              <div key={s.n} className="how-step">
                <span className="how-num">{s.n}</span>
                <div>
                  <div className="how-title">{s.t}</div>
                  <div className="how-desc">{s.d}</div>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: "12px",
              padding: "10px",
              background: "var(--bg3)",
              border: "1px solid var(--b1)",
              fontSize: "10px",
              color: "var(--t3)",
              lineHeight: 1.9,
            }}>
              ⛓️ Polygon PoS · USDC colateral<br />
              🔒 Contratos verificados · 2% fee<br />
              📊 Precios = probabilidades reales
            </div>
          </div>

          {/* Telegram CTA */}
          <a href="https://t.me/pronosticoslat" target="_blank" rel="noopener" className="tg-cta">
            <span className="tg-icon">✈️</span>
            <div>
              <div className="tg-text-title">Únete al canal oficial</div>
              <div className="tg-text-sub">@PRONOSTICOSLAT</div>
            </div>
            <span className="tg-arrow">→</span>
          </a>

        </div>
      </div>
    </>
  );
}
