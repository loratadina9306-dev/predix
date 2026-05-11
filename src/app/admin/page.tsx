"use client";
// src/app/admin/page.tsx  — Dashboard principal

import { useAllMarkets } from "@/hooks/useMarkets";
import Link              from "next/link";
import { format }        from "date-fns";
import { es }            from "date-fns/locale";

const STATE_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "ACTIVO",   color: "var(--green)" },
  1: { label: "CERRADO",  color: "var(--gold)"  },
  2: { label: "RESUELTO", color: "var(--text3)" },
};
const OUTCOME_LABEL: Record<number, string> = { 0: "—", 1: "SÍ ✓", 2: "NO ✗", 3: "INVÁLIDO" };

export default function AdminDashboard() {
  const { markets, isLoading, refetch } = useAllMarkets();

  const open     = markets.filter(m => m.state === 0);
  const closed   = markets.filter(m => m.state === 1);
  const resolved = markets.filter(m => m.state === 2);
  const totalVol = markets.reduce((a, m) => a + Number(m.volume) / 1_000_000, 0);
  const fees     = totalVol * 0.02;

  const closingSoon = open.filter(m => {
    const hoursLeft = (m.closesAt - Date.now() / 1000) / 3600;
    return hoursLeft < 48;
  });

  return (
    <>
      <div style={sHead}>
        <span style={sTitle}>// Dashboard</span>
        <button onClick={() => refetch()} style={refreshBtn}>↻ Actualizar</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "var(--border)", marginBottom: "24px" }}>
        {[
          { label: "Mercados Activos",  val: open.length,     sub: `${closed.length} cerrados`, color: "var(--green)" },
          { label: "Volumen Total",     val: `$${totalVol.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, sub: "USDC", color: "var(--gold)" },
          { label: "Fees Acumulados",   val: `$${fees.toFixed(2)}`, sub: "2% por trade", color: "var(--blue)" },
          { label: "Por Resolver",      val: closed.length,   sub: "necesitan resultado", color: closed.length > 0 ? "var(--red)" : "var(--text3)" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "30px", color: k.color, lineHeight: 1, marginBottom: "4px" }}>{k.val}</div>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)" }}>{k.label}</div>
            <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "2px" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {closingSoon.length > 0 && (
        <div style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.25)", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "var(--gold)", fontSize: "16px" }}>⚠</span>
          <div>
            <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: 600, letterSpacing: "1px" }}>
              {closingSoon.length} mercado{closingSoon.length > 1 ? "s" : ""} cierra{closingSoon.length === 1 ? "" : "n"} en menos de 48h
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
              {closingSoon.map(m => m.question.slice(0, 50)).join(" · ")}
            </div>
          </div>
          <Link href="/admin/resolve" style={{ marginLeft: "auto", fontSize: "10px", color: "var(--gold)", letterSpacing: "1px", padding: "6px 12px", border: "1px solid rgba(240,192,64,0.3)" }}>
            RESOLVER →
          </Link>
        </div>
      )}

      {/* Markets table */}
      <div style={card}>
        <div style={sHead}>
          <span style={sTitle}>// Todos los Mercados</span>
          <Link href="/admin/markets" style={actionLink}>+ CREAR NUEVO</Link>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text3)", fontSize: "11px" }}>Cargando desde Polygon...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["PREGUNTA", "CATEGORÍA", "SÍ%", "VOLUMEN", "CIERRE", "ESTADO", "ACCIÓN"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markets.map(m => {
                const st = STATE_LABEL[m.state] || STATE_LABEL[0];
                const daysLeft = Math.ceil((m.closesAt - Date.now() / 1000) / 86400);
                return (
                  <tr key={m.address}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={td}>
                      <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px", maxWidth: "280px", lineHeight: 1.3 }}>
                        {m.question}
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                        {m.address.slice(0, 10)}...{m.address.slice(-6)}
                      </div>
                    </td>
                    <td style={td}><span style={{ fontSize: "10px", color: "var(--text3)", letterSpacing: "1px" }}>{m.category.toUpperCase()}</span></td>
                    <td style={td}><span style={{ color: "var(--green)", fontFamily: "var(--font-display)", fontSize: "18px" }}>{m.priceYES}%</span></td>
                    <td style={td}><span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>${m.totalUSDC}</span></td>
                    <td style={td}>
                      <div style={{ fontSize: "11px" }}>
                        {format(m.closesAt * 1000, "d MMM yy", { locale: es })}
                      </div>
                      {m.state === 0 && (
                        <div style={{ fontSize: "9px", color: daysLeft < 3 ? "var(--red)" : "var(--text3)", marginTop: "2px" }}>
                          {daysLeft > 0 ? `${daysLeft}d restantes` : "HOY"}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: "9px", letterSpacing: "1px", padding: "2px 7px", border: `1px solid ${st.color}33`, color: st.color }}>
                        {st.label}
                      </span>
                      {m.state === 2 && (
                        <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "3px" }}>
                          {OUTCOME_LABEL[m.outcome]}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Link href={`/market/${m.address}`}
                          style={{ fontSize: "9px", letterSpacing: "1px", color: "var(--text3)", padding: "4px 8px", border: "1px solid var(--border)" }}>
                          VER
                        </Link>
                        {(m.state === 0 || m.state === 1) && (
                          <Link href={`/admin/resolve?market=${m.address}`}
                            style={{ fontSize: "9px", letterSpacing: "1px", color: "var(--gold)", padding: "4px 8px", border: "1px solid rgba(240,192,64,0.3)" }}>
                            RESOLVER
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// Styles
const sHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" };
const sTitle: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "3px", color: "var(--text3)" };
const card: React.CSSProperties = { background: "var(--surface)", padding: "20px", border: "1px solid var(--border)" };
const th: React.CSSProperties = { fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", padding: "8px 12px", textAlign: "left", fontWeight: 400, borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "12px", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const refreshBtn: React.CSSProperties = { fontSize: "10px", letterSpacing: "1.5px", color: "var(--text3)", background: "transparent", border: "1px solid var(--border)", padding: "5px 10px", cursor: "pointer" };
const actionLink: React.CSSProperties = { fontSize: "10px", letterSpacing: "1.5px", color: "var(--green)", padding: "5px 12px", border: "1px solid rgba(0,214,143,0.3)", background: "var(--green-dim)" };
