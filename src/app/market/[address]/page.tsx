"use client";
// src/app/market/[address]/page.tsx

import { useState, useEffect } from "react";
import { useParams }          from "next/navigation";
import Link                   from "next/link";
import { useAccount }         from "wagmi";
import { ConnectButton }      from "@rainbow-me/rainbowkit";
import { useMarket, useUserPositions } from "@/hooks/useMarkets";
import { useMarketTrade }     from "@/hooks/useMarketTrade";
import { CATEGORIES, formatUsdc } from "@/lib/config";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

// Sparkline SVG chart (price history simulation)
function PriceChart({ priceYes }: { priceYes: number }) {
  // Generate plausible price path ending at current price
  const points = (() => {
    const pts: number[] = [50];
    for (let i = 1; i < 40; i++) {
      const prev  = pts[i-1];
      const drift = (priceYes - 50) / 40;
      const noise = (Math.random() - 0.48) * 4;
      pts.push(Math.min(98, Math.max(2, prev + drift + noise)));
    }
    pts.push(priceYes);
    return pts;
  })();

  const w = 600, h = 120;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(p => h - (p / 100) * h);

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="chart-area">
      <span className="chart-label">PRECIO SÍ (HISTÓRICO 7D)</span>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--green)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartGrad)" />
        <path d={path}  fill="none" stroke="var(--green)" strokeWidth="1.5" />
        {/* Current price dot */}
        <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill="var(--green)" />
      </svg>
    </div>
  );
}

const FAKE_ACTIVITY = [
  { dir: true,  amount: 120, user: "0x4f2a...8c3d", ago: "2m"  },
  { dir: false, amount: 55,  user: "0xa1b9...ff20", ago: "7m"  },
  { dir: true,  amount: 300, user: "0x7c3e...12ab", ago: "15m" },
  { dir: false, amount: 90,  user: "0x2d9f...6611", ago: "22m" },
  { dir: true,  amount: 175, user: "0xb8c1...3390", ago: "31m" },
  { dir: true,  amount: 50,  user: "0x99a2...7741", ago: "45m" },
];

export default function MarketPage() {
  const params  = useParams();
  const addr    = params.address as `0x${string}`;
  const { address } = useAccount();

  const { market,    isLoading }  = useMarket(addr);
  const { positions, hasPosition, refetch: refetchPos } = useUserPositions(addr, address);
  const trade = useMarketTrade(addr);

  const [isYes,  setIsYes]  = useState(true);
  const [amount, setAmount] = useState("");
  const [activity, setActivity] = useState(FAKE_ACTIVITY);

  // Simulate live activity
  useEffect(() => {
    const id = setInterval(() => {
      const item = FAKE_ACTIVITY[Math.floor(Math.random() * FAKE_ACTIVITY.length)];
      setActivity(prev => [{ ...item, ago: "1m" }, ...prev.slice(0, 7)]);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleBuy() {
    if (!amount) return;
    try {
      await trade.buy(isYes, amount);
      setAmount("");
      refetchPos();
    } catch {}
  }

  async function handleRedeem() {
    try { await trade.redeem(); refetchPos(); } catch {}
  }

  if (isLoading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 240 }} />)}
    </div>
  );

  if (!market) return (
    <div className="empty">
      <p>Mercado no encontrado.</p>
      <Link href="/" style={{ color: "var(--green)", marginTop: "12px", display: "block" }}>← Volver</Link>
    </div>
  );

  const cat       = CATEGORIES[market.category] || { label: market.category, emoji: "📊", color: "#888" };
  const isClosed  = Date.now() / 1000 > market.closesAt;
  const isOpen    = market.state === 0 && !isClosed;
  const isResolved= market.state === 2;

  const closesText = isClosed
    ? `Cerrado el ${format(market.closesAt * 1000, "d MMM yyyy", { locale: es })}`
    : `Cierra ${formatDistanceToNow(market.closesAt * 1000, { locale: es, addSuffix: true })}`;

  // P&L de posición
  let positionPnl = 0n;
  let positionPnlStr = "—";
  if (positions && market) {
    const costYes   = positions.sharesYES; // rough: 1 share ~ precio pagado
    const costNo    = positions.sharesNO;
    const curValYes = positions.valueYES;
    const curValNo  = positions.valueNO;
    const pnl = Number(curValYes + curValNo) - Number(costYes + costNo);
    positionPnlStr = (pnl >= 0 ? "+" : "") + pnl.toFixed(2);
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "16px", fontSize: "10px", letterSpacing: "1.5px", color: "var(--text3)" }}>
        <Link href="/" style={{ color: "var(--text3)" }} onMouseEnter={e=>(e.currentTarget.style.color="var(--green)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--text3)")}>
          MERCADOS
        </Link>
        {" "}//{" "}
        <span>{cat.label.toUpperCase()}</span>
      </div>

      <div className="detail-layout">

        {/* ── MAIN ── */}
        <div className="detail-main">
          <div className="detail-cat">
            <span style={{ color: cat.color }}>{cat.emoji}</span>
            {" "}{cat.label.toUpperCase()} · {closesText}
          </div>

          <h1 className="detail-title">{market.question}</h1>

          {/* Big probability */}
          <div className="big-prob">
            <div className="big-prob-cell yes-cell">
              <div className="big-prob-label">SÍ</div>
              <div className="big-prob-num">{market.priceYES}%</div>
            </div>
            <div className="big-prob-cell no-cell">
              <div className="big-prob-label">NO</div>
              <div className="big-prob-num">{market.priceNO}%</div>
            </div>
          </div>

          {/* Price chart */}
          <PriceChart priceYes={market.priceYES} />

          {/* Market info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "var(--border)", marginBottom: "20px" }}>
            {[
              { label: "Volumen",   val: `$${market.totalUSDC} USDC` },
              { label: "Cierre",    val: format(market.closesAt * 1000, "d MMM yyyy", { locale: es }) },
              { label: "Estado",    val: isResolved ? "RESUELTO" : isClosed ? "CERRADO" : "ACTIVO" },
            ].map((item, i) => (
              <div key={i} style={{ background: "var(--surface)", padding: "12px 14px" }}>
                <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text)" }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div>
            <div className="section-head" style={{ marginBottom: "10px" }}>
              <span className="section-title" style={{ fontSize: "11px" }}>// ACTIVIDAD RECIENTE</span>
            </div>
            <ul className="feed-list">
              {activity.map((item, i) => (
                <li key={i} className="feed-item">
                  <span className={`feed-dot ${item.dir ? "yes" : "no"}`} />
                  <span className="feed-text">
                    <span style={{ color: "var(--text3)" }}>{item.user}</span>
                    {" "}apostó{" "}
                    <span className={item.dir ? "green" : "red"}>{item.dir ? "SÍ" : "NO"}</span>
                  </span>
                  <span className="feed-amount">${item.amount}</span>
                  <span className="feed-time">{item.ago}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resolver info */}
          {isResolved && (
            <div style={{ marginTop: "20px", padding: "16px", background: "var(--bg3)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "8px" }}>RESOLUCIÓN</div>
              <div style={{ fontSize: "13px" }}>
                Resultado: <strong className={market.outcome === 1 ? "green" : "red"}>
                  {market.outcome === 1 ? "SÍ ✓" : market.outcome === 2 ? "NO ✗" : "INVÁLIDO ⚠"}
                </strong>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "8px" }}>
                Período de disputa de 24h antes de la ejecución. Ver fuentes en Polygonscan.
              </div>
            </div>
          )}
        </div>

        {/* ── SIDE: Trading panel ── */}
        <div className="detail-side">

          {/* User position (if any) */}
          {address && hasPosition && positions && (
            <div style={{ marginBottom: "16px", padding: "14px", background: "var(--bg3)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "10px" }}>TU POSICIÓN</div>
              {positions.sharesYES > 0n && (
                <div className="balance-row">
                  <span className="balance-label">Shares SÍ</span>
                  <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    {formatUsdc(positions.sharesYES)}
                  </span>
                </div>
              )}
              {positions.sharesNO > 0n && (
                <div className="balance-row">
                  <span className="balance-label">Shares NO</span>
                  <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    {formatUsdc(positions.sharesNO)}
                  </span>
                </div>
              )}
              <div className="balance-row" style={{ borderBottom: "none" }}>
                <span className="balance-label">Valor actual</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  {formatUsdc(positions.valueYES + positions.valueNO)} USDC
                </span>
              </div>

              {/* Redeem button if resolved */}
              {isResolved && (
                <button
                  className="btn-redeem"
                  style={{ width: "100%", marginTop: "10px", padding: "10px" }}
                  onClick={handleRedeem}
                  disabled={trade.isLoading}
                >
                  {trade.isLoading ? "PROCESANDO..." : "COBRAR GANANCIAS →"}
                </button>
              )}
            </div>
          )}

          {/* Trade panel */}
          {isOpen && (
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", padding: "16px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "14px" }}>APOSTAR</div>

              {/* Direction */}
              <div className="dir-toggle" style={{ marginBottom: "12px" }}>
                <button
                  className={`dir-btn yes ${isYes ? "on" : ""}`}
                  onClick={() => setIsYes(true)}
                >✓ SÍ · {market.priceYES}¢</button>
                <button
                  className={`dir-btn no ${!isYes ? "on" : ""}`}
                  onClick={() => setIsYes(false)}
                >✗ NO · {market.priceNO}¢</button>
              </div>

              {/* Amount */}
              <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--text3)", marginBottom: "6px" }}>MONTO (USDC)</div>
              <div className="amount-field">
                <input
                  className="amount-input"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="0.1"
                  step="1"
                />
                <span className="amount-unit">USDC</span>
              </div>

              {/* Presets */}
              <div className="presets">
                {["5","20","50","100"].map(v => (
                  <button key={v} className="preset" onClick={() => setAmount(v)}>${v}</button>
                ))}
              </div>

              {/* Quote */}
              {amount && Number(amount) > 0 && (
                <div className="quote-box">
                  Precio: <strong>{isYes ? market.priceYES : market.priceNO}¢</strong> por share<br/>
                  Shares estimados: <strong>
                    {(Number(amount) / (isYes ? market.priceYES : market.priceNO) * 100).toFixed(2)}
                  </strong><br/>
                  Retorno si aciertas: <strong>
                    +${((Number(amount) / (isYes ? market.priceYES : market.priceNO) * 100) - Number(amount)).toFixed(2)}
                  </strong>
                </div>
              )}

              {/* Status */}
              {trade.status === "approving" && <p className="status-line pending">⏳ Aprobando USDC... (1/2)</p>}
              {trade.status === "trading"   && <p className="status-line pending">⏳ Confirmando en Polygon... (2/2)</p>}
              {trade.status === "success"   && (
                <p className="status-line success">
                  ✓ Confirmado ·{" "}
                  <a href={`https://polygonscan.com/tx/${trade.txHash}`} target="_blank" rel="noopener" style={{ color: "var(--green)" }}>
                    Ver tx →
                  </a>
                </p>
              )}
              {trade.error && <p className="status-line error">✗ {trade.error}</p>}

              {/* Button */}
              {!address ? (
                <div style={{ marginTop: "8px" }}>
                  <ConnectButton label="Conectar Wallet" />
                </div>
              ) : (
                <button
                  className="btn-confirm"
                  onClick={handleBuy}
                  disabled={trade.isLoading || !amount || Number(amount) <= 0}
                >
                  {trade.isLoading ? "PROCESANDO..." : `APOSTAR ${isYes ? "SÍ" : "NO"}`}
                </button>
              )}
            </div>
          )}

          {/* Closed state */}
          {isClosed && !isResolved && (
            <div style={{ padding: "20px", background: "var(--bg3)", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "8px" }}>MERCADO CERRADO</div>
              <div style={{ fontSize: "12px", color: "var(--text2)" }}>Esperando resolución del resultado.<br/>Se publicará en 24–48h.</div>
            </div>
          )}

          {/* Resolved - redeem */}
          {isResolved && !hasPosition && (
            <div style={{ padding: "20px", background: "var(--bg3)", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "8px" }}>MERCADO RESUELTO</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", marginBottom: "8px", color: market.outcome === 1 ? "var(--green)" : "var(--red)" }}>
                {market.outcome === 1 ? "SÍ ✓" : market.outcome === 2 ? "NO ✗" : "INVÁLIDO ⚠"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text3)" }}>Sin posiciones que cobrar.</div>
            </div>
          )}

          {/* Links */}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <a
              href={`https://polygonscan.com/address/${market.address}`}
              target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "var(--text3)", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", border: "1px solid var(--border)", transition: "var(--transition)" }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--border2)")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}
            >
              VER CONTRATO EN POLYGONSCAN <span>→</span>
            </a>
            <a
              href="https://t.me/pronosticosmx"
              target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "var(--text3)", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", border: "1px solid var(--border)", transition: "var(--transition)" }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--border2)")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}
            >
              REPORTAR DISPUTA EN TELEGRAM <span>→</span>
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
