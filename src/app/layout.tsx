// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers }  from "./providers";
import { Topbar }     from "@/components/Topbar";

export const metadata: Metadata = {
  title:       "Pronósticos.MX — Mercado de Predicciones",
  description: "Apuesta USDC en política, fútbol y economía de México. On-chain en Polygon.",
  openGraph: {
    title:       "Pronósticos.MX",
    description: "El primer mercado de predicciones on-chain para México.",
    siteName:    "Pronósticos.MX",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div className="app-shell">
            <Topbar />
            <main>
              <div className="main-content">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
