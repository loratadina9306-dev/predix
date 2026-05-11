"use client";
// src/app/admin/markets/page.tsx — Crear nuevos mercados on-chain

import { useState }       from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { CONTRACTS, ERC20_ABI }   from "@/lib/config";
import Link from "next/link";

const FACTORY_ABI_CREATE = [
  {
    name: "createMarket",
    type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "question",         type: "string"  },
      { name: "category",         type: "string"  },
      { name: "closesAt",         type: "uint256" },
      { name: "resolvesAt",       type: "uint256" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "marketAddress", type: "address" }],
  },
] as const;

const CATEGORIES = ["futbol", "politica", "economia", "cultura"];

const TEMPLATES = [
  { question: "¿[EQUIPO] ganará [TORNEO] [AÑO]?",                   category: "futbol",   days: 90  },
  { question: "¿[POLÍTICO] ganará las elecciones de [ESTADO]?",      category: "politica", days: 120 },
  { question: "¿El dólar superará $[PRECIO] MXN antes de [FECHA]?",  category: "economia", days: 60  },
  { question: "¿[PARTIDO] mantendrá su mayoría en [CONGRESO]?",      category: "politica", days: 180 },
  { question: "¿México clasificará al Mundial [AÑO]?",               category: "futbol",   days: 30  },
];

type Step = "form" | "approve" | "deploy" | "done";

export default function AdminCreateMarket() {
  const { address }  = useAccount();
  const client       = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep]     = useState<Step>("form");
  const [txHash, setTxHash] = useState("");
  const [newMarket, setNewMarket] = useState("");
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    question:   "",
    category:   "futbol",
    closesAt:   "",       // date string
    resolvesAt: "",
    liquidity:  "100",    // USDC
  });

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    const closeDate  = new Date(Date.now() + t.days * 86400000);
    const resolveDate= new Date(Date.now() + (t.days + 7) * 86400000);
    setForm(f => ({
      ...f,
      question:   t.question,
      category:   t.category,
      closesAt:   closeDate.toISOString().slice(0,16),
      resolvesAt: resolveDate.toISOString().slice(0,16),
    }));
  }

  function validate(): string | null {
    if (!form.question || form.question.length < 15) return "La pregunta debe tener al menos 15 caracteres";
    if (!form.closesAt)   return "Falta fecha de cierre";
    if (!form.resolvesAt) return "Falta fecha de resolución";
    const close   = new Date(form.closesAt).getTime() / 1000;
    const resolve = new Date(form.resolvesAt).getTime() / 1000;
    const now     = Date.now() / 1000;
    if (close < now + 3600)    return "El cierre debe ser al menos 1 hora en el futuro";
    if (resolve < close + 3600)return "La resolución debe ser después del cierre";
    const liq = Number(form.liquidity);
    if (isNaN(liq) || liq < 50) return "Liquidez mínima: 50 USDC";
    if (liq > 10000) return "Liquidez máxima en esta UI: 10,000 USDC";
    return null;
  }

  async function handleDeploy() {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }

    const closesAt   = BigInt(Math.floor(new Date(form.closesAt).getTime() / 1000));
    const resolvesAt = BigInt(Math.floor(new Date(form.resolvesAt).getTime() / 1000));
    const liqAmount  = parseUnits(form.liquidity, 6); // USDC 6 decimals
    const totalNeeded= liqAmount * 2n; // factory needs 2x (pool 50/50)

    try {
      // Step 1: Approve USDC
      setStep("approve");
      const approveTx = await writeContractAsync({
        address: CONTRACTS.USDC,
        abi:     ERC20_ABI,
        functionName: "approve",
        args:    [CONTRACTS.FACTORY, totalNeeded],
      });
      await client!.waitForTransactionReceipt({ hash: approveTx });

      // Step 2: Create market
      setStep("deploy");
      const deployTx = await writeContractAsync({
        address: CONTRACTS.FACTORY,
        abi:     FACTORY_ABI_CREATE,
        functionName: "createMarket",
        args:    [form.question, form.category, closesAt, resolvesAt, liqAmount],
      });
      setTxHash(deployTx);
      const receipt = await client!.waitForTransactionReceipt({ hash: deployTx });

      // Extract market address from logs (first log, first topic = MarketCreated)
      const marketAddr = receipt.logs[0]?.topics[1]
        ? "0x" + receipt.logs[0].topics[1].slice(26)
        : "—";
      setNewMarket(marketAddr);
      setStep("done");

    } catch (err: any) {
      setError(err.shortMessage || err.message || "Error en la transacción");
      setStep("form");
    }
  }

  function reset() {
    setStep("form");
    setForm({ question: "", category: "futbol", closesAt: "", resolvesAt: "", liquidity: "100" });
    setTxHash("");
    setNewMarket("");
    setError("");
  }

  return (
    <>
      <div style={sHead}>
        <span style={sTitle}>// Crear Nuevo Mercado</span>
        <Link href="/admin" style={backLink}>← Dashboard</Link>
      </div>

      {step === "done" ? (
        // SUCCESS STATE
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "32px", maxWidth: "600px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--green)", letterSpacing: "3px", marginBottom: "16px" }}>
            ✓ MERCADO DESPLEGADO
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 2, marginBottom: "20px" }}>
            <div><strong style={{ color: "var(--text2)" }}>Pregunta:</strong> {form.question}</div>
            <div><strong style={{ color: "var(--text2)" }}>Dirección:</strong> <code style={{ color: "var(--green)" }}>{newMarket}</code></div>
            <div><strong style={{ color: "var(--text2)" }}>Liquidez:</strong> ${form.liquidity} USDC</div>
            <div><strong style={{ color: "var(--text2)" }}>TX:</strong>{" "}
              <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener" style={{ color: "var(--green)" }}>
                {txHash.slice(0,20)}... →
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href={`/market/${newMarket}`}
              style={{ padding: "10px 16px", background: "var(--green)", color: "#000", fontSize: "11px", letterSpacing: "1.5px", fontFamily: "var(--font-mono)" }}>
              VER MERCADO →
            </Link>
            <button onClick={reset}
              style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text3)", fontSize: "11px", letterSpacing: "1.5px", cursor: "pointer" }}>
              CREAR OTRO
            </button>
          </div>
          <div style={{ marginTop: "16px", padding: "12px", background: "var(--bg3)", border: "1px solid var(--border)", fontSize: "10px", color: "var(--text3)", lineHeight: 1.8 }}>
            ✈️ El bot de Telegram notificará automáticamente al canal sobre este nuevo mercado en ~30 segundos.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", alignItems: "start" }}>

          {/* MAIN FORM */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "24px" }}>

            {/* Progress */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
              {(["form", "approve", "deploy"] as Step[]).map((s, i) => (
                <div key={s} style={{ flex: 1, height: "3px", background: step === s ? "var(--green)" : (["approve","deploy","done"].indexOf(step) > i) ? "var(--green)" : "var(--border)" }} />
              ))}
            </div>

            {/* QUESTION */}
            <div style={fieldGroup}>
              <label style={fieldLabel}>PREGUNTA DEL MERCADO *</label>
              <textarea
                style={{ ...fieldInput, minHeight: "80px", resize: "vertical" }}
                placeholder="¿América ganará el Clausura 2025?"
                value={form.question}
                onChange={e => setField("question", e.target.value)}
                maxLength={200}
              />
              <div style={{ fontSize: "9px", color: "var(--text3)", textAlign: "right", marginTop: "4px" }}>
                {form.question.length}/200 · Debe ser una pregunta binaria (SÍ/NO)
              </div>
            </div>

            {/* CATEGORY */}
            <div style={fieldGroup}>
              <label style={fieldLabel}>CATEGORÍA</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px" }}>
                {CATEGORIES.map(c => (
                  <button key={c}
                    style={{
                      padding: "8px", fontSize: "10px", letterSpacing: "1.5px",
                      border: form.category === c ? "1px solid var(--green)" : "1px solid var(--border)",
                      background: form.category === c ? "var(--green-dim)" : "transparent",
                      color: form.category === c ? "var(--green)" : "var(--text3)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onClick={() => setField("category", c)}
                  >
                    {{ futbol: "⚽", politica: "🗳", economia: "💸", cultura: "🎭" }[c]}
                    <div style={{ marginTop: "4px" }}>{c.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* DATES */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>CIERRE DE APUESTAS *</label>
                <input
                  type="datetime-local"
                  style={fieldInput}
                  value={form.closesAt}
                  onChange={e => setField("closesAt", e.target.value)}
                  min={new Date(Date.now() + 3600000).toISOString().slice(0,16)}
                />
                <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "4px" }}>
                  Cuando el evento ocurra o esté decidido
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>LÍMITE DE RESOLUCIÓN *</label>
                <input
                  type="datetime-local"
                  style={fieldInput}
                  value={form.resolvesAt}
                  onChange={e => setField("resolvesAt", e.target.value)}
                  min={form.closesAt || new Date(Date.now() + 7200000).toISOString().slice(0,16)}
                />
                <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "4px" }}>
                  Normalmente 3–7 días después del cierre
                </div>
              </div>
            </div>

            {/* LIQUIDITY */}
            <div style={fieldGroup}>
              <label style={fieldLabel}>LIQUIDEZ INICIAL (USDC) *</label>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", background: "var(--bg)" }}>
                <input
                  type="number"
                  style={{ ...fieldInput, border: "none", flex: 1 }}
                  value={form.liquidity}
                  onChange={e => setField("liquidity", e.target.value)}
                  min="50" step="50"
                />
                <span style={{ padding: "0 12px", fontSize: "10px", color: "var(--text3)", letterSpacing: "1px" }}>USDC</span>
              </div>
              <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                {["50","100","250","500"].map(v => (
                  <button key={v}
                    style={{ flex: 1, padding: "5px", fontSize: "10px", cursor: "pointer", background: form.liquidity === v ? "var(--gold-dim)" : "var(--bg3)", border: `1px solid ${form.liquidity === v ? "rgba(240,192,64,0.3)" : "var(--border)"}`, color: form.liquidity === v ? "var(--gold)" : "var(--text3)" }}
                    onClick={() => setField("liquidity", v)}
                  >${v}</button>
                ))}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "6px" }}>
                El contrato necesitará {Number(form.liquidity) * 2} USDC de tu wallet (pool 50/50 inicial).
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--red)", fontSize: "11px", marginBottom: "16px" }}>
                ✗ {error}
              </div>
            )}

            {/* STATUS */}
            {step === "approve" && (
              <div style={{ padding: "12px", background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.25)", color: "var(--gold)", fontSize: "11px", marginBottom: "12px", letterSpacing: "1px" }}>
                ⏳ PASO 1/2 — Aprobando USDC en MetaMask...
              </div>
            )}
            {step === "deploy" && (
              <div style={{ padding: "12px", background: "var(--green-dim)", border: "1px solid rgba(0,214,143,0.2)", color: "var(--green)", fontSize: "11px", marginBottom: "12px", letterSpacing: "1px" }}>
                ⏳ PASO 2/2 — Desplegando mercado en Polygon...
              </div>
            )}

            {/* SUBMIT */}
            <button
              onClick={handleDeploy}
              disabled={step !== "form"}
              style={{
                width: "100%", padding: "14px",
                background: step === "form" ? "var(--green)" : "var(--surface2)",
                color: step === "form" ? "#000" : "var(--text3)",
                border: "none", fontFamily: "var(--font-mono)", fontSize: "12px",
                fontWeight: 600, letterSpacing: "2px", cursor: step === "form" ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              {step === "form" ? "DESPLEGAR MERCADO EN POLYGON →" : "PROCESANDO..."}
            </button>

            <div style={{ fontSize: "9px", color: "var(--text3)", textAlign: "center", marginTop: "8px", lineHeight: 1.6 }}>
              Se ejecutarán 2 transacciones: Approve USDC + Create Market<br/>
              Gas estimado: ~$0.05 USD en MATIC
            </div>
          </div>

          {/* SIDEBAR: Templates + Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>

            {/* Templates */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px" }}>
              <div style={{ ...sTitle, fontSize: "11px", marginBottom: "12px" }}>// PLANTILLAS RÁPIDAS</div>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)}
                  style={{ width: "100%", textAlign: "left", background: "var(--bg3)", border: "1px solid var(--border)", padding: "10px 12px", marginBottom: "4px", cursor: "pointer", transition: "all 0.15s", display: "block" }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--border2)")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}
                >
                  <div style={{ fontSize: "10px", color: "var(--text2)", marginBottom: "3px", lineHeight: 1.4 }}>{t.question}</div>
                  <div style={{ fontSize: "8px", color: "var(--text3)", letterSpacing: "1px" }}>
                    {t.category.toUpperCase()} · {t.days}D
                  </div>
                </button>
              ))}
            </div>

            {/* Preview */}
            {form.question && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px" }}>
                <div style={{ ...sTitle, fontSize: "11px", marginBottom: "12px" }}>// PREVIEW</div>
                <div style={{ fontSize: "9px", letterSpacing: "1px", color: "var(--text3)", marginBottom: "6px" }}>
                  {{ futbol: "⚽", politica: "🗳", economia: "💸", cultura: "🎭" }[form.category]} {form.category.toUpperCase()}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "14px", lineHeight: 1.3, color: "var(--text)", marginBottom: "12px" }}>
                  {form.question}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", marginBottom: "10px" }}>
                  {[{ l: "SÍ", v: "50%", c: "var(--green)" }, { l: "NO", v: "50%", c: "var(--red)" }].map(p => (
                    <div key={p.l} style={{ background: "var(--bg3)", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: "var(--text3)", marginBottom: "4px" }}>{p.l}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: p.c, lineHeight: 1 }}>{p.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.8 }}>
                  💧 Liquidez: <span style={{ color: "var(--gold)" }}>${form.liquidity} USDC</span><br/>
                  {form.closesAt && `📅 Cierra: ${new Date(form.closesAt).toLocaleDateString("es-MX")}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Styles
const sHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" };
const sTitle: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "3px", color: "var(--text3)" };
const backLink: React.CSSProperties = { fontSize: "10px", letterSpacing: "1.5px", color: "var(--text3)" };
const fieldGroup: React.CSSProperties = { marginBottom: "18px" };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "6px" };
const fieldInput: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "13px", padding: "10px 12px", outline: "none" };
