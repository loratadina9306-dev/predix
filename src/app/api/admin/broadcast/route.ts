// src/app/api/admin/broadcast/route.ts
// API route que envía mensajes al bot de Telegram

import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN  = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export async function POST(req: NextRequest) {
  // Auth: verificar que la request viene del admin
  const authHeader = req.headers.get("x-admin-address");
  const adminAddr  = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  // Basic check (en producción usar JWT o firma de wallet)
  if (adminAddr && authHeader && authHeader.toLowerCase() !== adminAddr) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();

  if (!message || typeof message !== "string" || message.length > 4096) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  if (!BOT_TOKEN || !CHANNEL_ID) {
    // En desarrollo, simular OK
    console.log("[BROADCAST SIMULADO]", message.slice(0, 100));
    return NextResponse.json({ ok: true, chats: 1, simulated: true });
  }

  try {
    const results = [];

    // Enviar al canal principal
    const channelRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          chat_id:                  CHANNEL_ID,
          text:                     message,
          parse_mode:               "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const channelData = await channelRes.json();
    results.push(channelData.ok);

    const successCount = results.filter(Boolean).length;

    return NextResponse.json({
      ok:    true,
      chats: successCount,
      total: results.length,
    });

  } catch (err: any) {
    console.error("Broadcast error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
