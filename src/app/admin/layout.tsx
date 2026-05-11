"use client";
// src/app/admin/layout.tsx
// Solo accesible si la wallet conectada = ADMIN_ADDRESS

import { useAccount }    from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link              from "next/link";
import { usePathname }   from "next/navigation";

const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

const ADMIN_NAV = [
  { href: "/admin",            label: "Dashboard",  icon: "▦" },
  { href: "/admin/markets",    label: "Mercados",   icon: "◈" },
  { href: "/admin/resolve",    label: "Resolver",   icon: "✓" },
  { href: "/admin/broadcast",  label: "Broadcast",  icon: "✈" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();

  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_ADDRESS;

  // Not connected
  if (!isConnected) return (
    <div style={centerStyle}>
      <div style={termBoxStyle}>
        <div style={termHeader}>ACCESO RESTRINGIDO</div>
        <div style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "20px", letterSpacing: "1px" }}>
          Solo el administrador puede acceder a este panel.
        </div>
        <ConnectButton label="Conectar Wallet Admin" />
      </div>
    </div>
  );

  // Wrong wallet
  if (!isAdmin) return (
    <div style={centerStyle}>
      <div style={termBoxStyle}>
        <div style={{ ...termHeader, borderColor: "var(--red)" }}>⛔ ACCESO DENEGADO</div>
        <div style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "12px", letterSpacing: "1px" }}>
          Esta wallet no tiene permisos de administrador.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--red)", padding: "8px", background: "var(--red-dim)", border: "1px solid rgba(255,71,87,0.2)" }}>
          Conectado: {address}<br/>
          Requerido: {ADMIN_ADDRESS || "(no configurado)"}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 48px)", gap: "1px", background: "var(--border)" }}>

      {/* Sidebar */}
      <aside style={{ background: "var(--surface)", padding: "20px 0" }}>
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)", marginBottom: "12px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: "3px", color: "var(--gold)" }}>
            ADMIN
          </div>
          <div style={{ fontSize: "9px", color: "var(--text3)", letterSpacing: "1.5px", marginTop: "4px" }}>
            {address?.slice(0,8)}...{address?.slice(-4)}
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
          {ADMIN_NAV.map(n => (
            <Link key={n.href} href={n.href}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 10px",
                fontSize: "11px", letterSpacing: "1.5px",
                color: pathname === n.href ? "var(--text)" : "var(--text3)",
                background: pathname === n.href ? "var(--surface2)" : "transparent",
                borderLeft: pathname === n.href ? "2px solid var(--green)" : "2px solid transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: pathname === n.href ? "var(--green)" : "var(--text3)" }}>
                {n.icon}
              </span>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* System status */}
        <div style={{ margin: "20px 8px 0", padding: "12px", background: "var(--bg3)", border: "1px solid var(--border)", fontSize: "9px", letterSpacing: "1px", color: "var(--text3)", lineHeight: 2 }}>
          <div style={{ color: "var(--text2)", marginBottom: "4px", letterSpacing: "2px" }}>SISTEMA</div>
          <div><span style={{ color: "var(--green)" }}>●</span> Polygon Mainnet</div>
          <div><span style={{ color: "var(--green)" }}>●</span> Bot Telegram</div>
          <div><span style={{ color: "var(--green)" }}>●</span> Contratos OK</div>
        </div>
      </aside>

      {/* Content */}
      <div style={{ background: "var(--bg2)", padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  minHeight: "60vh",
};
const termBoxStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  padding: "32px", maxWidth: "400px", width: "100%",
};
const termHeader: React.CSSProperties = {
  fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "3px",
  color: "var(--gold)", marginBottom: "16px", paddingBottom: "12px",
  borderBottom: "1px solid var(--border)",
};
