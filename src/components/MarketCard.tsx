"use client";
// src/components/MarketCard.tsx

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { MarketData } from "@/hooks/useMarkets";
import { useMarketTrade } from "@/hooks/useMarketTrade";
import { CATEGORIES } from "@/lib/config";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const CAT_COLORS: Record<string, string> = {
  futbol:   "var(--yes)",
  politica: "#ff7740",
  economia: "var(--gold)",
  cultura:  "var(--purple)",
};

type Props = { market: MarketData; onTradeComplete?: () => void };

export function MarketCard({ market, onTradeComplete }: Props) {
  const { address }       = useAccount();
  const [open, setOpen]   = useState(false);
  const [isYes, setIsYes] = useState(true);
  const [amt, setAmt]     = useState("");
  const trade             = useMarketTrade(market.address);
  const cat               = CATEGORIES[market.category] || { label: market.category, emoji: "📊", color: "#888" };
  const catColor          = CAT_COLORS[market.category] || "#888";

  const isClosed   = Date.now() / 1000 > market.closesAt;
  const isResolved = market.state === 2;
  const isOpen     = market.state === 0 && !isClosed;

  const closesText = isClosed
    ? "Cerrado"
    : formatDistanceToNow(market.closesAt * 1000, { locale: es, addSuffix: true });

  const expectedShares = amt && Number(amt) > 0
    ? (Number(amt) / (isYes ? market.priceYES : market.priceNO) * 100).toFixed(2)
    : "0";
  const potentialProfit = amt && Number(amt) > 0
    ? ((Number(amt) / (isYes ? market.priceYES : market.priceNO) * 100) - Number(amt)).toFixed(2)
    : "0";

  async function handleBuy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!amt || Number(amt) <= 0) return;
    try {
      await trade.buy(isYes, amt);
      setAmt("");
      onTradeComplete?.();
    } catch {}
  }

  return (
    <div className="mcard">
      {/* Category & time */}
      <div className="mcard-cat">
        <span className="mcard-cat-dot" style={{ background: catColor }} />
        <span className="mcard-cat-text">{cat.emoji} {cat.label}</span>
        <span className="mcard-cat-sep" />
        <span className="mcard-cat-time">{closesText}</span>
      </div>

      {/* Question */}
      <Link href={`/market/${market.address}`}>
        <p className="mcard-q">{market.question}</p>
      </Link>

      {/* Probability */}
      <div className="mcard-prob">
        <div className="mcard-prob-nums">
          <div>
            <div className="prob-yes-label">SÍ</div>
            <div className="prob-yes-big">{market.priceYES}%</div>
          </div>
          <div>
            <div className="prob-no-label">NO</div>
            <div className="prob-no-big">{market.priceNO}%</div>
          </div>
        </div>
        <div className="prob-track">
          <div className="prob-fill" style={{ width: `${market.priceYES}%` }} />
        </div>
      </div>

      {/* Meta */}
      <div className="mcard-meta">
        <span className="mcard-vol">
          Vol: <strong>${market.totalUSDC}</strong> USDC
        </span>
        <Link href={`/market/${market.address}`} className="mcard-link">
          VER DETALLE →
        </Link>
      </div>

      {/* Resolved */}
      {isResolved && (
        <div className={`resolved-chip ${market.outcome === 1 ? "yes" : "no"}`}>
          {market.outcome === 1 ? "✓ RESULTADO: SÍ" : market.outcome === 2 ? "✗ RESULTADO: NO" : "⚠ INVÁLIDO"}
        </div>
      )}

      {/* Trade buttons */}
      {isOpen && !open && (
        <div className="trade-row">
          <button className="btn-yes" onClick={() => { setIsYes(true);  setOpen(true); }}>
            SÍ · {market.priceYES}¢
          </button>
          <button className="btn-no"  onClick={() => { setIsYes(false); setOpen(true); }}>
            NO · {market.priceNO}¢
          </button>
        </div>
      )}

      {/* Trade panel */}
      {isOpen && open && (
        <div className="trade-panel" onClick={e => e.stopPropagation()}>

          {/* Direction */}
          <div className="dir-grid">
            <button className={`dir-btn yes ${isYes ? "selected" : ""}`}
              onClick={() => setIsYes(true)}>
              ✓ SÍ · {market.priceYES}¢
            </button>
            <button className={`dir-btn no ${!isYes ? "selected" : ""}`}
              onClick={() => setIsYes(false)}>
              ✗ NO · {market.priceNO}¢
            </button>
          </div>

          {/* Amount */}
          <div className="amount-wrap">
            <input className="amount-input" type="number"
              placeholder="0.00" value={amt}
              onChange={e => setAmt(e.target.value)}
              min="0.1" step="1" />
            <span className="amount-unit">USDC</span>
          </div>

          {/* Presets */}
          <div className="presets">
            {["5","20","50","100"].map(v => (
              <button key={v} className="preset-btn" onClick={() => setAmt(v)}>${v}</button>
            ))}
          </div>

          {/* Quote */}
          {amt && Number(amt) > 0 && (
            <div className="quote-box">
              Shares: <strong>{expectedShares}</strong><br/>
              Retorno si aciertas: <strong>+${potentialProfit} USDC</strong>
            </div>
          )}

          {/* Status messages */}
          {trade.status === "approving" && (
            <p className="status-msg pending">⏳ Aprobando USDC... (1/2)</p>
          )}
          {trade.status === "trading" && (
            <p className="status-msg pending">⏳ Confirmando en Polygon... (2/2)</p>
          )}
          {trade.status === "success" && (
            <p className="status-msg ok">
              ✓ ¡Confirmado!{" "}
              <a href={`https://polygonscan.com/tx/${trade.txHash}`}
                target="_blank" rel="noopener"
                style={{ color: "var(--yes)" }}>
                Ver tx →
              </a>
            </p>
          )}
          {trade.error && <p className="status-msg err">✗ {trade.error}</p>}

          {/* Action */}
          {!address ? (
            <div style={{ marginTop: "8px" }}>
              <ConnectButton label="Conectar para apostar" />
            </div>
          ) : (
            <button className="btn-confirm"
              onClick={handleBuy}
              disabled={trade.isLoading || !amt || Number(amt) <= 0}>
              {trade.isLoading ? "PROCESANDO..." : `APOSTAR ${isYes ? "SÍ" : "NO"}`}
            </button>
          )}

          <button className="btn-cancel"
            onClick={() => { setOpen(false); trade.reset(); }}>
            CANCELAR ✕
          </button>
        </div>
      )}
    </div>
  );
}
