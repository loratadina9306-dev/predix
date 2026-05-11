"use client";
// src/components/Topbar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton }   from "@rainbow-me/rainbowkit";
import { useAllMarkets }   from "@/hooks/useMarkets";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/",            label: "Mercados"    },
  { href: "/portfolio",   label: "Portfolio"   },
  { href: "/leaderboard", label: "Ranking"     },
];

export function Topbar() {
  const pathname = usePathname();
  const { markets } = useAllMarkets();
  const [tick, setTick] = useState(0);

  // Ticker animation tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const openMarkets = markets.filter(m => m.state === 0);
  const topMarket   = openMarkets[tick % Math.max(openMarkets.length, 1)];

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Logo */}
        <Link href="/" className="logo">
          <span className="logo-text">PRONÓSTICOS</span>
          <span className="logo-text logo-accent">.</span>
          <span className="logo-text">MX</span>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", gap: "24px" }}>
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${pathname === n.href ? "active" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Live ticker */}
        {topMarket && (
          <div className="ticker-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "var(--text3)", fontSize: "9px", letterSpacing: "2px" }}>LIVE</span>
            <span
              key={tick}
              style={{
                fontSize: "10px",
                color: "var(--text2)",
                animation: "fadeUp 0.4s ease",
                maxWidth: "260px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {topMarket.question.slice(0, 50)}
            </span>
            <span className="ticker-up">SÍ {topMarket.priceYES}%</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Total markets */}
        <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: "var(--text3)" }}>
          {openMarkets.length} MERCADOS
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
