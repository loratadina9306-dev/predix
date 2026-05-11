"use client";
// src/app/admin/resolve/page.tsx — Resolver mercados (proponer resultado)

import { useState, useEffect } from "react";
import { useSearchParams }     from "next/navigation";
import { useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { CONTRACTS }           from "@/lib/config";
import { useAllMarkets }       from "@/hooks/useMarkets";
import Link                    from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { es }                  from "date-fns/locale";

const RESOLVER_ABI = [
  {
    name: "proposeResolution",
    type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "market",   type: "address" },
      { name: "outcome",  type: "uint8"   },
      { name: "evidence", type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "executeResolution",
    type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "market", type: "address" }],
    outputs: [],
  },
  {
    name: "getResolution",
    type: "function", stateMutability: "view",
    inputs: [{ name: "market", type: "address" }],
    outputs: [
      { name: "outcome",      type: "uint8"   },
      { name: "evidence",     type: "string"  },
      { name: "proposedAt",   type: "uint256" },
      { name: "challengeEnd", type: "uint256" },
      { name: "executed",     type: "bool"    },
      { name: "disputeCount", type: "uint256" },
    ],
  },
] as const;

const MARKET_CLOSE_ABI = [
  {
    name: "closeMarket",
    type: "function", stateMutability: "nonpayable",
    inputs: [], outputs: [],
  },
] as const;

type Outcome = 0 | 1 | 2 | 3;
const OUTCOME_OPTS = [
  { val: 1 as Outcome, label: "SÍ", desc: "El evento ocurrió / la condición se cumplió", color: "var(--green)" },
  { val: 2 as Outcome, label: "NO", desc: "El evento NO ocurrió / la condición NO se cumplió", color: "var(--red)" },
  { val: 3 as Outcome, label: "INVÁLIDO", desc: "Ambiguo, pregunta mal formulada, o datos insuficientes", color: "var(--gold)" },
];

export default function AdminResolvePage() {
  const searchParams  = useSearchParams();
  const preselect     = searchParams.get("market");
  const { markets }   = useAllMarkets();
  const client        = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [selected, setSelected] = useState(preselect || "");
  const [outcome,  setOutcome]  = useState<Outcome>(0);
  const [evidence, setEvidence] = useState("");
  const [step,     setStep]     = useState<"idle"|"closing"|"proposing"|"executing"|"done">("idle");
  const [error,    setError]    = useState("");
  const [txHash,   setTxHash]   = useState("");

  // Markets that need resolution (closed or open past closesAt)
  const now = Date.now() / 1000;
  const pendingMarkets = markets.filter(m =>
    m.state !== 2 && (m.state === 1 || m.closesAt < now)
  );

  const selectedMarket = markets.find(m => m.address === selected);

  // Load existing resolution proposal if any
  const { data: resolution } = useReadContract({
    address: CONTRACTS.RESOLVER,
    abi:     RESOLVER_ABI,
    functionName: "getResolution",
    args:    selected ? [selected as `0x${string}`] : undefined,
    query:   { enabled: !!selected },
  });

  const hasProposal    = resolution && Number(resolution[2]) > 0;
  const isExecuted     = resolution?.[4] === true;
  const challengeEnd   = resolution ? Number(resolution[3]) : 0;
  const canExecute     = hasProposal && !isExecuted && Date.now() / 1000 > challengeEnd;
  const disputeCount   = resolution ? Number(resolution[5]) : 0;

  async function handlePropose() {
    if (!selected || !outcome || !evidence) { setError("Completa todos los campos"); return; }
    setError(""); setStep("idle");

    try {
      const market = selectedMarket!;
      const addr   = selected as `0x${string}`;

      // 1. Close market if still open
      if (market.state === 0) {
        setStep("closing");
        const tx = await writeContractAsync({
          address: addr,
          abi:     MARKET_CLOSE_ABI,
          functionName: "closeMarket",
          args:    [],
        });
        await client!.waitForTransactionReceipt({ hash: tx });
      }

      // 2. Propose resolution
      setStep("proposing");
      const tx2 = await writeContractAsync({
        address: CONTRACTS.RESOLVER,
        abi:     RESOLVER_ABI,
        functionName: "proposeResolution",
        args:    [addr, outcome, evidence],
      });
      setTxHash(tx2);
      await client!.waitForTransactionReceipt({ hash: tx2 });
      setStep("done");

    } catch (err: any) {
      setError(err.shortMessage || err.message);
      setStep("idle");
    }
  }

  async function handleExecute() {
    if (!selected) return;
    setError(""); setStep("executing");
    try {
      const tx = await writeContractAsync({
        address: CONTRACTS.RESOLVER,
        abi:     RESOLVER_ABI,
        functionName: "executeResolution",
        args:    [selected as `0x${string}`],
      });
      setTxHash(tx);
      await client!.waitForTransactionReceipt({ hash: tx });
      setStep("done");
    } catch (err: any) {
      setError(err.shortMessage || err.message);
      setStep("idle");
    }
  }

  return (
    <>
      <div style={sHead}>
        <span style={sTitle}>// Resolver Mercados</span>
        <Link href="/admin" style={{ fontSize: "10px", color: "var(--text3)", letterSpacing: "1px" }}>← Dashboard</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1px", background: "var(--border)" }}>

        {/* LEFT: Market selector */}
        <div style={{ background: "var(--surface)", padding: "16px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "10px" }}>
            PENDIENTES ({pendingMarkets.length})
          </div>

          {pendingMarkets.length === 0 ? (
            <div style={{ fontSize: "11px", color: "var(--text3)", padding: "20px 0", textAlign: "center" }}>
              No hay mercados pendientes de resolver
            </div>
          ) : (
            pendingMarkets.map(m => {
              const isSel  = selected === m.address;
              const isPast = m.closesAt < now;
              return (
                <button key={m.address}
                  onClick={() => setSelected(m.address)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: "3px",
                    background: isSel ? "var(--surface2)" : "var(--bg3)",
                    border: `1px solid ${isSel ? "var(--gold)" : "var(--border)"}`,
                    borderLeft: `3px solid ${isPast ? "var(--red)" : "var(--gold)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text)", lineHeight: 1.3, marginBottom: "4px", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                    {m.question.slice(0, 60)}{m.question.length > 60 ? "…" : ""}
                  </div>
                  <div style={{ fontSize: "9px", color: isPast ? "var(--red)" : "var(--gold)", letterSpacing: "1px" }}>
                    {isPast
                      ? `Cerró ${formatDistanceToNow(m.closesAt * 1000, { locale: es, addSuffix: true })}`
                      : `Cierra ${formatDistanceToNow(m.closesAt * 1000, { locale: es, addSuffix: true })}`
                    }
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* RIGHT: Resolution form */}
        <div style={{ background: "var(--surface)", padding: "24px" }}>
          {!selected ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)", fontSize: "11px", letterSpacing: "1px" }}>
              SELECCIONA UN MERCADO PARA RESOLVER
            </div>
          ) : (
            <>
              {/* Market info */}
              <div style={{ marginBottom: "20px", padding: "14px", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--text3)", marginBottom: "6px" }}>MERCADO SELECCIONADO</div>
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "16px", lineHeight: 1.3, marginBottom: "10px" }}>
                  {selectedMarket?.question}
                </div>
                <div style={{ display: "flex", gap: "20px", fontSize: "10px", color: "var(--text3)" }}>
                  <span>Vol: <strong style={{ color: "var(--gold)" }}>${selectedMarket?.totalUSDC} USDC</strong></span>
                  <span>SÍ: <strong style={{ color: "var(--green)" }}>{selectedMarket?.priceYES}%</strong></span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px" }}>{selected.slice(0,10)}...{selected.slice(-6)}</span>
                </div>
              </div>

              {/* Existing proposal */}
              {hasProposal && !isExecuted && (
                <div style={{ marginBottom: "20px", padding: "14px", background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.25)" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--gold)", marginBottom: "8px" }}>PROPUESTA PENDIENTE</div>
                  <div style={{ fontSize: "11px", color: "var(--text2)", marginBottom: "6px" }}>
                    Outcome: <strong>{[,"SÍ ✓","NO ✗","INVÁLIDO"][Number(resolution![0])]}</strong>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text3)", marginBottom: "8px" }}>
                    Evidencia: {resolution![1]}
                  </div>
                  {disputeCount > 0 && (
                    <div style={{ fontSize: "10px", color: "var(--red)", marginBottom: "8px" }}>
                      ⚠ {disputeCount} disputa{disputeCount > 1 ? "s" : ""} registrada{disputeCount > 1 ? "s" : ""}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: canExecute ? "var(--green)" : "var(--text3)" }}>
                    {canExecute
                      ? "✓ Período de disputa terminado — puedes ejecutar"
                      : `Período de disputa termina ${formatDistanceToNow(challengeEnd * 1000, { locale: es, addSuffix: true })}`
                    }
                  </div>
                  {canExecute && (
                    <button
                      onClick={handleExecute}
                      disabled={step === "executing"}
                      style={{ marginTop: "12px", padding: "10px 20px", background: "var(--green)", color: "#000", border: "none", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "2px", cursor: "pointer" }}
                    >
                      {step === "executing" ? "EJECUTANDO..." : "EJECUTAR RESOLUCIÓN →"}
                    </button>
                  )}
                </div>
              )}

              {isExecuted && (
                <div style={{ marginBottom: "20px", padding: "14px", background: "var(--green-dim)", border: "1px solid rgba(0,214,143,0.2)" }}>
                  <div style={{ color: "var(--green)", fontSize: "11px", letterSpacing: "1px" }}>
                    ✓ RESUELTO — Resultado: {[,"SÍ","NO","INVÁLIDO"][Number(resolution![0])]}
                  </div>
                </div>
              )}

              {/* Resolution form (only if no proposal yet) */}
              {!hasProposal && !isExecuted && step !== "done" && (
                <>
                  {/* Outcome selector */}
                  <div style={{ marginBottom: "18px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "8px" }}>RESULTADO *</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {OUTCOME_OPTS.map(o => (
                        <button key={o.val} onClick={() => setOutcome(o.val)}
                          style={{
                            padding: "12px 14px", textAlign: "left", cursor: "pointer",
                            background: outcome === o.val ? `${o.color}18` : "var(--bg3)",
                            border: `1px solid ${outcome === o.val ? o.color : "var(--border)"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: o.color, width: "70px", letterSpacing: "2px" }}>
                              {outcome === o.val ? "◉" : "○"} {o.label}
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--text3)" }}>{o.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evidence URL */}
                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "6px" }}>
                      FUENTE / EVIDENCIA * (URL pública)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.espn.com.mx/resultado-final"
                      value={evidence}
                      onChange={e => setEvidence(e.target.value)}
                      style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "12px", padding: "10px 12px", outline: "none", marginBottom: "4px" }}
                    />
                    <div style={{ fontSize: "9px", color: "var(--text3)" }}>
                      URL verificable (noticia, resultado oficial, INE, ESPN, Banxico, etc.)
                    </div>
                  </div>

                  {/* Warning */}
                  <div style={{ padding: "12px", background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.2)", marginBottom: "16px", fontSize: "10px", color: "var(--gold)", lineHeight: 1.7 }}>
                    ⚠ El resultado propuesto tendrá <strong>24 horas de período de disputa</strong> antes de ejecutarse.<br/>
                    La comunidad puede disputar en Telegram o llamando a raiseDispute() en el contrato.
                  </div>

                  {error && (
                    <div style={{ padding: "10px", background: "var(--red-dim)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--red)", fontSize: "11px", marginBottom: "12px" }}>
                      ✗ {error}
                    </div>
                  )}

                  {step === "closing"   && <div style={statusMsg("var(--gold)")}>⏳ Cerrando mercado...</div>}
                  {step === "proposing" && <div style={statusMsg("var(--gold)")}>⏳ Enviando propuesta de resolución...</div>}

                  <button
                    onClick={handlePropose}
                    disabled={!outcome || !evidence || step !== "idle"}
                    style={{
                      width: "100%", padding: "14px", border: "none",
                      background: (!outcome || !evidence || step !== "idle") ? "var(--surface3)" : "var(--gold)",
                      color: (!outcome || !evidence || step !== "idle") ? "var(--text3)" : "#000",
                      fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "2px",
                      cursor: (!outcome || !evidence || step !== "idle") ? "not-allowed" : "pointer",
                    }}
                  >
                    {step !== "idle" ? "PROCESANDO..." : "PROPONER RESULTADO →"}
                  </button>
                </>
              )}

              {/* Done state */}
              {step === "done" && (
                <div style={{ padding: "20px", background: "var(--green-dim)", border: "1px solid rgba(0,214,143,0.2)", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--green)", letterSpacing: "3px", marginBottom: "8px" }}>
                    ✓ PROPUESTA ENVIADA
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "12px" }}>
                    Período de disputa: 24 horas.<br/>
                    ✈️ El bot de Telegram anunciará el resultado al canal.
                  </div>
                  <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener"
                    style={{ fontSize: "10px", color: "var(--green)", letterSpacing: "1px" }}>
                    Ver transacción en Polygonscan →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const sHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" };
const sTitle: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "3px", color: "var(--text3)" };
const statusMsg = (color: string): React.CSSProperties => ({ padding: "10px", background: `${color}15`, border: `1px solid ${color}40`, color, fontSize: "11px", marginBottom: "12px", letterSpacing: "1px" });
