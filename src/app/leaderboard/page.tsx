"use client";
// src/app/leaderboard/page.tsx

import { useState, useEffect } from "react";
import Link from "next/link";

// En producción esto vendría de The Graph (subgraph que indexa eventos SharesBought)
// Por ahora usamos datos de ejemplo realistas
const MOCK_TRADERS = [
  { addr: "0x4f2a8b1c...8c3d", profit: 2840.50, trades: 47, accuracy: 74, vol: 12400 },
  { addr: "0xa1b9f020...ff20", profit: 1920.00, trades: 33, accuracy: 69, vol: 8900  },
  { addr: "0x7c3e5d91...12ab", profit: 1540.75, trades: 28, accuracy: 71, vol: 7200  },
  { addr: "0x2d9f4a77...6611", profit: 980.20,  trades: 19, accuracy: 68, vol: 4500  },
  { addr: "0xb8c13301...3390", profit: 720.00,  trades: 22, accuracy: 63, vol: 3800  },
  { addr: "0x99a24412...7741", profit: 640.90,  trades: 15, accuracy: 66, vol: 3100  },
  { addr: "0x3f1b9900...aa22", profit: 430.10,  trades: 11, accuracy: 63, vol: 2200  },
  { addr: "0xc7d88711...bb44", profit: 280.50,  trades: 8,  accuracy: 62, vol: 1800  },
  { addr: "0x8e5f2200...cc55", profit: 140.00,  trades: 6,  accuracy: 66, vol: 900   },
  { addr: "0x1a3c4400...dd66", profit: 80.25,   trades: 4,  accuracy: 75, vol: 500   },
];

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

type SortKey = "profit" | "trades" | "accuracy" | "vol";

export default function LeaderboardPage() {
  const [sort,    setSort]    = useState<SortKey>("profit");
  const [period,  setPeriod]  = useState<"all" | "month" | "week">("all");
  const [traders, setTraders] = useState(MOCK_TRADERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from subgraph
    setTimeout(() => setLoading(false), 600);
  }, []);

  // Sort
  const sorted = [...traders].sort((a, b) => b[sort] - a[sort]);

  // Global stats
  const totalVol    = traders.reduce((a, t) => a + t.vol, 0);
  const totalProfit = traders.reduce((a, t) => a + t.profit, 0);
  const avgAccuracy = Math.round(traders.reduce((a, t) => a + t.accuracy, 0) / traders.length);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "profit",   label: "GANANCIA"  },
    { key: "trades",   label: "TRADES"    },
    { key: "accuracy", label: "PRECISIÓN" },
    { key: "vol",      label: "VOLUMEN"   },
  ];

  return (
    <>
      {/* Header */}
      <div className="section-head">
        <span className="section-title">// Ranking de Traders</span>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "month", "week"] as const).map(p => (
            <button
              key={p}
              className={`filter-pill ${period === p ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p === "all" ? "TODO" : p === "month" ? "MES" : "SEMANA"}
            </button>
          ))}
        </div>
      </div>

      {/* Global stats */}
      <div className="hero-strip" style={{ marginBottom: "20px" }}>
        {[
          { label: "Volumen Total",  val: `$${totalVol.toLocaleString("es-MX")}`,  sub: "USDC" },
          { label: "Ganancias",      val: `$${totalProfit.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, sub: "distribuidas" },
          { label: "Precisión Media",val: `${avgAccuracy}%`,                         sub: "top 10" },
          { label: "Traders",        val: traders.length,                            sub: "en ranking" },
        ].map((s, i) => (
          <div key={i} className="hero-stat">
            <span className="hero-stat-val">{s.val}</span>
            <span className="hero-stat-label">{s.label}</span>
            <span style={{ fontSize: "9px", color: "var(--text3)", letterSpacing: "1px" }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="filter-row" style={{ marginBottom: "12px" }}>
        {SORT_OPTIONS.map(o => (
          <button
            key={o.key}
            className={`filter-pill ${sort === o.key ? "active" : ""}`}
            onClick={() => setSort(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-rows">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (
        <div style={{ background: "var(--border)", display: "flex", flexDirection: "column", gap: "1px" }}>

          {/* Header row */}
          <div style={{ background: "var(--surface)", display: "grid", gridTemplateColumns: "60px 1fr 120px 90px 90px 90px", padding: "8px 16px", alignItems: "center" }}>
            {["#", "WALLET", "GANANCIA", "TRADES", "PRECISIÓN", "VOLUMEN"].map((h, i) => (
              <div key={i} style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", textAlign: i > 1 ? "right" : "left" }}>
                {h}
              </div>
            ))}
          </div>

          {sorted.map((trader, i) => (
            <div
              key={trader.addr}
              style={{
                background: i < 3 ? "var(--surface2)" : "var(--surface)",
                display: "grid",
                gridTemplateColumns: "60px 1fr 120px 90px 90px 90px",
                padding: "14px 16px",
                alignItems: "center",
                transition: "background var(--transition)",
                borderLeft: i === 0 ? "2px solid var(--gold)" : i === 1 ? "2px solid #aaa" : i === 2 ? "2px solid #c8743c" : "2px solid transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface3)")}
              onMouseLeave={e => (e.currentTarget.style.background = i < 3 ? "var(--surface2)" : "var(--surface)")}
            >
              {/* Rank */}
              <div>
                {RANK_MEDAL[i] ? (
                  <span style={{ fontSize: "18px" }}>{RANK_MEDAL[i]}</span>
                ) : (
                  <span className="lb-rank">{i + 1}</span>
                )}
              </div>

              {/* Wallet */}
              <div>
                <a
                  className="lb-addr"
                  href={`https://polygonscan.com/address/${trader.addr}`}
                  target="_blank" rel="noopener"
                  style={{ transition: "color var(--transition)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "")}
                >
                  {trader.addr}
                </a>
                {i === 0 && (
                  <span style={{ marginLeft: "8px", fontSize: "8px", letterSpacing: "1px", padding: "2px 6px", background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid rgba(240,192,64,0.3)" }}>
                    TOP TRADER
                  </span>
                )}
              </div>

              {/* Profit */}
              <div style={{ textAlign: "right" }}>
                <span className="lb-profit">${trader.profit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Trades */}
              <div style={{ textAlign: "right" }}>
                <span className="lb-trades">{trader.trades}</span>
              </div>

              {/* Accuracy */}
              <div style={{ textAlign: "right" }}>
                <span className="lb-acc">{trader.accuracy}%</span>
              </div>

              {/* Volume */}
              <div style={{ textAlign: "right" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text2)" }}>
                  ${trader.vol.toLocaleString("es-MX")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div style={{ marginTop: "20px", padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", fontSize: "10px", color: "var(--text3)", lineHeight: 1.8 }}>
        <div style={{ fontFamily: "var(--font-display)", letterSpacing: "2px", marginBottom: "6px", color: "var(--text2)" }}>NOTA SOBRE EL RANKING</div>
        El ranking se actualiza cada hora con datos de la blockchain de Polygon.
        Los datos de traders son pseudónimos (dirección de wallet).
        Puedes <a href="https://t.me/pronosticosmx" target="_blank" rel="noopener" style={{ color: "var(--green)" }}>unirte al canal de Telegram</a> para ver tu posición.
        <br /><br />
        En próximas versiones: historial completo por wallet, badges de logros, y torneos de predicción.
      </div>
    </>
  );
}
