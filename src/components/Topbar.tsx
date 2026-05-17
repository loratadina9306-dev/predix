"use client";
// src/components/Topbar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAllMarkets } from "@/hooks/useMarkets";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/",            label: "Mercados"  },
  { href: "/portfolio",   label: "Portfolio" },
  { href: "/leaderboard", label: "Ranking"   },
];

export function Topbar() {
  const pathname = usePathname();
  const { markets } = useAllMarkets();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const open = markets.filter(m => m.state === 0);
  const top  = open[tick % Math.max(open.length, 1)];

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {/* Logo */}
        <Link href="/" className="logo">
          <span>PRONÓSTICOS</span>
          <span className="logo-accent">.</span>
          <span className="logo-badge">LATAM</span>
        </Link>

        {/* Nav */}
        <nav className="nav">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`nav-link ${pathname === n.href ? "active" : ""}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Live ticker */}
        {top && (
          <div className="live-ticker">
            <span className="live-dot" />
            <span className="ticker-text" key={tick}>
              {top.question.slice(0, 45)}
            </span>
            <span className="ticker-price">SÍ {top.priceYES}%</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--t3)" }}>
          {open.length} MERCADOS
        </span>
        <ConnectButton
          label="Conectar"
          showBalance={{ smallScreen: false, largeScreen: true }}
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </header>
  );
}
