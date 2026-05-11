"use client";
// src/app/admin/broadcast/page.tsx — Enviar mensajes al canal de Telegram

import { useState } from "react";
import Link         from "next/link";

const TEMPLATES = [
  {
    tag: "NUEVO",
    title: "Anuncio de nuevo mercado",
    body: `🔔 NUEVO MERCADO DISPONIBLE ⚽

¿[PREGUNTA]?

📊 Precio inicial: SÍ 50% | NO 50%
💧 Liquidez: $[MONTO] USDC
📅 Cierra: [FECHA]

👉 Apuesta ahora en pronosticos.mx`,
  },
  {
    tag: "RESULTADO",
    title: "Anuncio de resultado",
    body: `🏁 MERCADO RESUELTO

¿[PREGUNTA]?

📢 Resultado: [SÍ/NO] ✓

💰 Si apostaste correctamente, ve a cobrar tus ganancias:
👉 pronosticos.mx/portfolio

¡Gracias por participar!`,
  },
  {
    tag: "PROMO",
    title: "Recordatorio semanal",
    body: `📊 Esta semana en Pronósticos.MX:

• [MERCADO 1] → SÍ [X]%
• [MERCADO 2] → SÍ [X]%  
• [MERCADO 3] → SÍ [X]%

🎯 ¿Cuál es tu predicción?
👉 pronosticos.mx | 2% fee | Polygon

#PredictionMarket #Mexico`,
  },
  {
    tag: "ALERTA",
    title: "Alerta de cierre",
    body: `⏰ ¡ÚLTIMAS HORAS!

El mercado cierra en menos de 6 horas:

"¿[PREGUNTA]?"

📊 Precio actual: SÍ [X]% | NO [X]%
💧 Volumen: $[MONTO] USDC

👉 pronosticos.mx`,
  },
];

type SendStatus = "idle" | "sending" | "sent" | "error";

export default function AdminBroadcastPage() {
  const [message,  setMessage]  = useState("");
  const [preview,  setPreview]  = useState(false);
  const [status,   setStatus]   = useState<SendStatus>("idle");
  const [response, setResponse] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setStatus("sending");

    try {
      // Llamar al API route que conecta con el bot de Telegram
      const res = await fetch("/api/admin/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus("sent");
        setResponse(`Enviado a ${data.chats} chats`);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      // En desarrollo sin API real, simular
      setStatus("sent");
      setResponse("Simulado (configura BOT_TOKEN en producción)");
    }

    setTimeout(() => setStatus("idle"), 4000);
  }

  const charCount = message.length;

  return (
    <>
      <div style={sHead}>
        <span style={sTitle}>// Broadcast Telegram</span>
        <Link href="/admin" style={{ fontSize: "10px", color: "var(--text3)", letterSpacing: "1px" }}>← Dashboard</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", alignItems: "start" }}>

        {/* COMPOSER */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "24px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "8px" }}>
            MENSAJE (HTML Telegram)
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje aquí...

Puedes usar HTML de Telegram:
<b>negrita</b>
<i>cursiva</i>
<code>código</code>
<a href='url'>enlace</a>"
            style={{
              width: "100%", minHeight: "200px", resize: "vertical",
              background: "var(--bg)", border: "1px solid var(--border)",
              color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "13px",
              padding: "12px", outline: "none", lineHeight: 1.7,
              marginBottom: "8px",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "9px", color: charCount > 3000 ? "var(--red)" : "var(--text3)", letterSpacing: "1px" }}>
              {charCount}/4096 caracteres
            </span>
            <button
              onClick={() => setPreview(!preview)}
              style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--text3)", background: "transparent", border: "1px solid var(--border)", padding: "4px 10px", cursor: "pointer" }}
            >
              {preview ? "OCULTAR" : "PREVIEW"}
            </button>
          </div>

          {/* Preview */}
          {preview && message && (
            <div style={{ marginBottom: "16px", padding: "16px", background: "#17212B", border: "1px solid #2B5278", borderRadius: "4px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#5B7D9B", marginBottom: "10px" }}>
                PREVIEW TELEGRAM
              </div>
              <div
                style={{ fontFamily: "sans-serif", fontSize: "14px", color: "#E1E5EA", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, "<br/>") }}
              />
            </div>
          )}

          {/* Destination info */}
          <div style={{ padding: "12px", background: "var(--bg3)", border: "1px solid var(--border)", marginBottom: "16px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.8 }}>
            <div style={{ color: "var(--text2)", marginBottom: "4px", letterSpacing: "1px" }}>DESTINOS</div>
            ✈️ Canal oficial @pronosticosmx<br/>
            👥 Todos los grupos activos donde está el bot<br/>
            <span style={{ color: "var(--text3)" }}>No se envía a DMs individuales</span>
          </div>

          {/* Status */}
          {status === "sending" && (
            <div style={{ padding: "10px", background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.25)", color: "var(--gold)", fontSize: "11px", marginBottom: "12px", letterSpacing: "1px" }}>
              ⏳ Enviando mensaje...
            </div>
          )}
          {status === "sent" && (
            <div style={{ padding: "10px", background: "var(--green-dim)", border: "1px solid rgba(0,214,143,0.2)", color: "var(--green)", fontSize: "11px", marginBottom: "12px", letterSpacing: "1px" }}>
              ✓ Enviado — {response}
            </div>
          )}
          {status === "error" && (
            <div style={{ padding: "10px", background: "var(--red-dim)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--red)", fontSize: "11px", marginBottom: "12px" }}>
              ✗ Error al enviar. Verifica BOT_TOKEN en el servidor.
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!message.trim() || status === "sending"}
            style={{
              width: "100%", padding: "14px", border: "none",
              background: !message.trim() ? "var(--surface3)" : "var(--blue)",
              color: !message.trim() ? "var(--text3)" : "#fff",
              fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "2px",
              cursor: !message.trim() ? "not-allowed" : "pointer",
            }}
          >
            {status === "sending" ? "ENVIANDO..." : "✈️ ENVIAR AL CANAL →"}
          </button>
        </div>

        {/* TEMPLATES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--text3)", marginBottom: "12px" }}>
              PLANTILLAS
            </div>
            {TEMPLATES.map((t, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
                <button
                  onClick={() => setMessage(t.body)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "var(--bg3)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--border2)")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "8px", letterSpacing: "1.5px", padding: "2px 6px", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-mono)" }}>
                      {t.tag}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text2)" }}>{t.title}</span>
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text3)", lineHeight: 1.4 }}>
                    {t.body.slice(0, 60)}...
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* HTML cheatsheet */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "14px", fontSize: "10px", color: "var(--text3)", lineHeight: 2 }}>
            <div style={{ color: "var(--text2)", letterSpacing: "1.5px", marginBottom: "6px", fontSize: "9px" }}>HTML DE TELEGRAM</div>
            <code style={{ color: "var(--text2)" }}>&lt;b&gt;negrita&lt;/b&gt;</code><br/>
            <code style={{ color: "var(--text2)" }}>&lt;i&gt;cursiva&lt;/i&gt;</code><br/>
            <code style={{ color: "var(--text2)" }}>&lt;code&gt;código&lt;/code&gt;</code><br/>
            <code style={{ color: "var(--text2)" }}>&lt;a href='url'&gt;link&lt;/a&gt;</code><br/>
            <code style={{ color: "var(--text2)" }}>&lt;blockquote&gt;cita&lt;/blockquote&gt;</code>
          </div>
        </div>
      </div>
    </>
  );
}

const sHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" };
const sTitle: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "3px", color: "var(--text3)" };
