// src/hooks/useMarkets.ts
"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, FACTORY_ABI, MARKET_ABI, formatUsdc, toPercent } from "@/lib/config";

export type MarketData = {
  address:    `0x${string}`;
  question:   string;
  category:   string;
  closesAt:   number;
  resolvesAt: number;
  state:      number; // 0=OPEN 1=CLOSED 2=RESOLVED
  outcome:    number; // 0=NONE 1=YES 2=NO 3=INVALID
  priceYES:   number; // 0-100 percent
  priceNO:    number;
  totalUSDC:  string; // formatted
  volume:     bigint;
};

// ─── Cargar todos los mercados ─────────────────────────
export function useAllMarkets() {
  // 1. Obtener lista de addresses
  const { data: marketAddresses, isLoading: loadingAddresses } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getAllMarkets",
  });

  // 2. Para cada address, leer getMarketInfo()
  const marketContracts = (marketAddresses || []).map((addr) => ({
    address: addr as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "getMarketInfo" as const,
    args: [] as const,
  }));

  const { data: marketInfos, isLoading: loadingInfos, refetch } = useReadContracts({
    contracts: marketContracts,
    query: { enabled: !!marketAddresses && marketAddresses.length > 0 },
  });

  // 3. Parsear resultados
  const markets: MarketData[] = [];
  if (marketAddresses && marketInfos) {
    for (let i = 0; i < marketAddresses.length; i++) {
      const result = marketInfos[i];
      if (result.status !== "success" || !result.result) continue;

      const [question, category, closesAt, resolvesAt, state, outcome, priceYES, priceNO, totalUSDC]
        = result.result as [string, string, bigint, bigint, number, number, bigint, bigint, bigint];

      markets.push({
        address:    marketAddresses[i] as `0x${string}`,
        question,
        category,
        closesAt:   Number(closesAt),
        resolvesAt: Number(resolvesAt),
        state,
        outcome,
        priceYES:   Math.round(Number(priceYES) / 10000),  // 0-100
        priceNO:    Math.round(Number(priceNO)  / 10000),
        totalUSDC:  formatUsdc(totalUSDC),
        volume:     totalUSDC,
      });
    }
  }

  return {
    markets,
    isLoading: loadingAddresses || loadingInfos,
    refetch,
  };
}

// ─── Cargar un mercado específico ──────────────────────
export function useMarket(address: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi: MARKET_ABI,
    functionName: "getMarketInfo",
  });

  if (!data) return { market: null, isLoading, refetch };

  const [question, category, closesAt, resolvesAt, state, outcome, priceYES, priceNO, totalUSDC]
    = data as [string, string, bigint, bigint, number, number, bigint, bigint, bigint];

  const market: MarketData = {
    address,
    question,
    category,
    closesAt:   Number(closesAt),
    resolvesAt: Number(resolvesAt),
    state,
    outcome,
    priceYES:   Math.round(Number(priceYES) / 10000),
    priceNO:    Math.round(Number(priceNO)  / 10000),
    totalUSDC:  formatUsdc(totalUSDC),
    volume:     totalUSDC,
  };

  return { market, isLoading, refetch };
}

// ─── Posiciones del usuario ────────────────────────────
export function useUserPositions(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getUserPositions",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  if (!data) return { positions: null, isLoading, refetch };

  const [sharesYES, sharesNO, valueYES, valueNO] = data as [bigint, bigint, bigint, bigint];

  return {
    positions: { sharesYES, sharesNO, valueYES, valueNO },
    hasPosition: sharesYES > 0n || sharesNO > 0n,
    isLoading,
    refetch,
  };
}
