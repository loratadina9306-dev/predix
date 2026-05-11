"use client";
// src/components/MarketCard.tsx

import { useState }        from "react";
import Link                from "next/link";
import { useAccount }      from "wagmi";
import { ConnectButton }   from "@rainbow-me/rainbowkit";
import type { MarketData } from "@/hooks/useMarkets";
import { useMarketTrade }  from "@/hooks/useMarketTrade";
import { CATEGORIES }      from "@/lib/config";
import { formatDistanceToNow } from "date-fns";
import { es }              from "date-fns/locale";

type Props = { market: MarketData; onTradeComplete?: () => void };

export function MarketCard({ market, onTradeComplete }: Props) {
  const { address }        = useAccount();
  const [open, setOpen]    = useState(false);
  const [isYes, setIsYes]  = useState(true);
  const [amt,   setAmt]    = useState("");
  const trade              = useMarketTrade(market.address);
  const cat                = CATEGORIES[market.category] || { label: market.category, emoji: "📊", color: "#888" };

  const isClosed   = Date.now() / 1000 > market.closesAt;
  const isResolved = market.state === 2;
  const isOpen     = market.state === 0 && !isClosed;

  const closesText = isClosed
    ? "Cerrado"
    : `${formatDistanceToNow(market.closesAt * 1000, { locale: es, addSuffix: true })}`;

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
      <div className="mcard-cat">
        <span className="cat-pip" style={{ background: cat.color }} />
        {cat.emoji} {cat.label.toUpperCase()} · {closesText}
      </div>

      <Link href={`/market/${market.address}`}>
        <p className="mcard-q"
          onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
          onMouseLeave={e => (e.currentTarget.style.color = "")}
        >{market.question}</p>
      </Link>

      <div className="prob-wrap">
        <div className="prob-nums">
          <div>
            <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--text3)", display: "block", marginBottom: "2px" }}>SÍ</span>
            <span className="prob-yes-val">{market.priceYES}%</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--text3)", display: "block", marginBottom: "2px" }}>NO</span>
            <span className="prob-no-val">{market.priceNO}%</span>
          </div>
        </div>
        <div className="prob-bar-track">
          <div className="prob-bar-fill" style={{ width: `${market.priceYES}%` }} />
        </div>
      </div>

      <div className="mcard-meta">
        <span>Vol: <span className="vol-val">${market.totalUSDC}</span> USDC</span>
        <Link href={`/market/${market.address}`}
          style={{ fontSize: "9px", letterSpacing: "1px", color: "var(--text3)" }}
          onMouseEnter={e=>(e.currentTarget.style.color="var(--green)")}
          onMouseLeave={e=>(e.currentTarget.style.color="var(--text3)")}
        >DETALLE →</Link>
      </div>

      {isResolved && (
        <div className={`resolved-badge ${market.outcome === 1 ? "yes" : "no"}`}>
          {market.outcome === 1 ? "✓ RESULTADO: SÍ" : market.outcome === 2 ? "✗ RESULTADO: NO" : "⚠ INVÁLIDO"}
        </div>
      )}

      {isOpen && !open && (
        <div className="trade-btns">
          <button className="btn-yes" onClick={() => { setIsYes(true);  setOpen(true); }}>SÍ · {market.priceYES}¢</button>
          <button className="btn-no"  onClick={() => { setIsYes(false); setOpen(true); }}>NO · {market.priceNO}¢</button>
        </div>
      )}

      {isOpen && open && (
        <div className="trade-panel" onClick={e => e.stopPropagation()}>
          <div className="dir-toggle">
            <button className={`dir-btn yes ${isYes ? "on" : ""}`}  onClick={() => setIsYes(true)}>✓ SÍ · {market.priceYES}¢</button>
            <button className={`dir-btn no  ${!isYes ? "on" : ""}`} onClick={() => setIsYes(false)}>✗ NO · {market.priceNO}¢</button>
          </div>
          <div className="amount-field">
            <input className="amount-input" type="number" placeholder="0.00"
              value={amt} onChange={e => setAmt(e.target.value)} min="0.1" step="1" />
            <span className="amount-unit">USDC</span>
          </div>
          <div className="presets">
            {["5","20","50","100"].map(v => (
              <button key={v} className="preset" onClick={() => setAmt(v)}>${v}</button>
            ))}
          </div>
          {amt && Number(amt) > 0 && (
            <div className="quote-box">
              Shares: <strong>{(Number(amt) / (isYes ? market.priceYES : market.priceNO) * 100).toFixed(2)}</strong><br/>
              Retorno: <strong>+${((Number(amt) / (isYes ? market.priceYES : market.priceNO) * 100) - Number(amt)).toFixed(2)} USDC</strong>
            </div>
          )}
          {trade.status === "approving" && <p className="status-line pending">⏳ Aprobando USDC... (1/2)</p>}
          {trade.status === "trading"   && <p className="status-line pending">⏳ Confirmando... (2/2)</p>}
          {trade.status === "success"   && <p className="status-line success">✓ Confirmado · <a href={`https://polygonscan.com/tx/${trade.txHash}`} target="_blank" style={{color:"var(--green)"}}>Ver tx →</a></p>}
          {trade.error                  && <p className="status-line error">✗ {trade.error}</p>}
          {!address ? (
            <div style={{ marginTop: "8px" }}><ConnectButton label="Conectar para apostar" /></div>
          ) : (
            <button className="btn-confirm" onClick={handleBuy} disabled={trade.isLoading || !amt || Number(amt) <= 0}>
              {trade.isLoading ? "PROCESANDO..." : `APOSTAR ${isYes ? "SÍ" : "NO"}`}
            </button>
          )}
          <button className="btn-cancel" onClick={() => { setOpen(false); trade.reset(); }}>CANCELAR ✕</button>
        </div>
      )}
    </div>
  );
}
