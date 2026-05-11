"use client";
// src/app/portfolio/page.tsx

import { useAccount }        from "wagmi";
import { ConnectButton }     from "@rainbow-me/rainbowkit";
import Link                  from "next/link";
import { useAllMarkets }     from "@/hooks/useMarkets";
import { useUserPositions }  from "@/hooks/useMarkets";
import { useMarketTrade }    from "@/hooks/useMarketTrade";
import { formatUsdc, CATEGORIES } from "@/lib/config";
import { format }            from "date-fns";
import { es }                from "date-fns/locale";

// One position row - loads positions for a single market
function PositionRow({ market, userAddress }: { market: any; userAddress: `0x${string}` }) {
  const { positions, hasPosition, refetch } = useUserPositions(market.address, userAddress);
  const trade = useMarketTrade(market.address);
  const cat   = CATEGORIES[market.category] || { label: market.category, emoji: "📊", color: "#888" };

  if (!hasPosition) return null;
  if (!positions)   return null;

  const hasYes   = positions.sharesYES > 0n;
  const hasNo    = positions.sharesNO  > 0n;
  const curVal   = Number(positions.valueYES + positions.valueNO) / 1_000_000;
  const shares   = Number(positions.sharesYES + positions.sharesNO) / 1_000_000;
  // Rough PnL: current value - shares bought (since 1 share costs ~priceYES USDC)
  const costBasis = hasYes
    ? Number(positions.sharesYES) / 1_000_000 * market.priceYES / 100
    : Number(positions.sharesNO) / 1_000_000 * market.priceNO / 100;
  const pnl      = curVal - costBasis;
  const pnlSign  = pnl >= 0 ? "+" : "";
  const isResolved = market.state === 2;

  async function handleRedeem() {
    try { await trade.redeem(); refetch(); } catch {}
  }

  return (
    <tr>
      <td>
        <Link
          href={`/market/${market.address}`}
          style={{ display: "block" }}
          onMouseEnter={e=>(e.currentTarget.querySelector(".pos-question")!.style.color="var(--green)")}
          onMouseLeave={e=>(e.currentTarget.querySelector(".pos-question")!.style.color="")}
        >
          <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: cat.color, marginBottom: "4px" }}>
            {cat.emoji} {cat.label.toUpperCase()}
          </div>
          <div className="pos-question">{market.question}</div>
        </Link>
      </td>
      <td>
        {hasYes && <span className="pos-direction yes">SÍ</span>}
        {hasNo  && <span className="pos-direction no">NO</span>}
      </td>
      <td>
        <span className="pos-num">{shares.toFixed(2)}</span>
        <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "2px" }}>shares</div>
      </td>
      <td>
        <span className="pos-num">${curVal.toFixed(2)}</span>
        <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "2px" }}>USDC</div>
      </td>
      <td>
        <span className={`pos-pnl pos-num ${pnl >= 0 ? "pos" : "neg"}`}>
          {pnlSign}{pnl.toFixed(2)}
        </span>
      </td>
      <td>
        {isResolved ? (
          <button
            className="btn-redeem"
            onClick={handleRedeem}
            disabled={trade.isLoading}
          >
            {trade.isLoading ? "..." : "COBRAR →"}
          </button>
        ) : (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            {market.state === 0 ? "ABIERTO" : "CERRADO"}
          </span>
        )}
        {trade.status === "success" && (
          <div style={{ fontSize: "9px", color: "var(--green)", marginTop: "4px" }}>✓ Cobrado</div>
        )}
      </td>
    </tr>
  );
}

// ─── Main Portfolio Page ──────────────────────────────

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { markets, isLoading }   = useAllMarkets();

  if (!isConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "20px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", letterSpacing: "4px", color: "var(--text3)" }}>
          PORTFOLIO
        </div>
        <div style={{ fontSize: "12px", color: "var(--text3)", letterSpacing: "1px" }}>
          Conecta tu wallet para ver tus posiciones
        </div>
        <ConnectButton label="Conectar Wallet" />
      </div>
    );
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <>
      {/* Header */}
      <div className="section-head">
        <span className="section-title">// Portfolio</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text3)" }}>
          {shortAddr}
        </span>
      </div>

      <div className="portfolio-grid">

        {/* SIDEBAR */}
        <div className="portfolio-sidebar">
          <div className="wallet-label">WALLET</div>
          <div className="wallet-display">
            <div className="wallet-addr">
              <strong>{address?.slice(0, 10)}</strong>{address?.slice(10)}
            </div>
          </div>

          {/* Stats */}
          {[
            { label: "Red",        val: "Polygon"  },
            { label: "Colateral",  val: "USDC"     },
            { label: "Fee",        val: "2%"        },
          ].map(s => (
            <div key={s.label} className="balance-row">
              <span className="balance-label">{s.label}</span>
              <span className="balance-val" style={{ fontSize: "16px" }}>{s.val}</span>
            </div>
          ))}

          <div className="divider" />

          {/* Links */}
          <a
            href={`https://polygonscan.com/address/${address}`}
            target="_blank" rel="noopener"
            style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", letterSpacing: "1px", color: "var(--text3)", padding: "8px", border: "1px solid var(--border)", marginBottom: "6px" }}
          >
            VER EN POLYGONSCAN <span>→</span>
          </a>
          <Link
            href="/"
            style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", letterSpacing: "1px", color: "var(--text3)", padding: "8px", border: "1px solid var(--border)" }}
          >
            EXPLORAR MERCADOS <span>→</span>
          </Link>

          <div className="divider" />

          <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.8 }}>
            <div>💡 <strong style={{ color: "var(--text2)" }}>Cómo funciona el P&L:</strong></div>
            <div>Cada share ganador vale 1 USDC.</div>
            <div>Si compraste SÍ a 40¢ y gana, tu retorno es +60¢ por share.</div>
          </div>
        </div>

        {/* MAIN TABLE */}
        <div className="portfolio-main">
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text3)" }}>
              Cargando posiciones desde Polygon...
            </div>
          ) : (
            <table className="pos-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>MERCADO</th>
                  <th>DIRECCIÓN</th>
                  <th>SHARES</th>
                  <th>VALOR</th>
                  <th>P&L</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {markets.map(m => (
                  <PositionRow
                    key={m.address}
                    market={m}
                    userAddress={address!}
                  />
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && markets.length === 0 && (
            <div className="empty">
              <div style={{ marginBottom: "12px" }}>SIN POSICIONES ACTIVAS</div>
              <Link href="/"
                style={{ fontSize: "11px", color: "var(--green)", letterSpacing: "1.5px" }}>
                EXPLORAR MERCADOS →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
