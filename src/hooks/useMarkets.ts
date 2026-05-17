// src/hooks/useMarkets.ts
"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { MARKET_ABI, formatUsdc } from "@/lib/config";

export type MarketData = {
  address:    `0x${string}`;
  question:   string;
  category:   string;
  closesAt:   number;
  resolvesAt: number;
  state:      number;
  outcome:    number;
  priceYES:   number;
  priceNO:    number;
  totalUSDC:  string;
  volume:     bigint;
};

// Mercados desplegados manualmente (sin factory)
// Agregar nuevas direcciones aquí cuando se creen nuevos mercados
const MARKET_ADDRESSES: `0x${string}`[] = [
  "0x428bC1bB9F9C5B161ea72dC9d734e5498DcbC339", // ¿México pasará de cuartos? Mundial 2026
];

export function useAllMarkets() {
  const contracts = MARKET_ADDRESSES.map((addr) => ({
    address: addr,
    abi: MARKET_ABI,
    functionName: "getMarketInfo" as const,
    args: [] as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({ contracts });

  const markets: MarketData[] = [];

  if (data) {
    for (let i = 0; i < MARKET_ADDRESSES.length; i++) {
      const result = data[i];
      if (result.status !== "success" || !result.result) continue;

      const [question, category, closesAt, resolvesAt, state, outcome, priceYES, priceNO, totalUSDC]
        = result.result as [string, string, bigint, bigint, number, number, bigint, bigint, bigint];

      markets.push({
        address:   MARKET_ADDRESSES[i],
        question,
        category,
        closesAt:  Number(closesAt),
        resolvesAt: Number(resolvesAt),
        state,
        outcome,
        priceYES:  Math.round(Number(priceYES) / 10000),
        priceNO:   Math.round(Number(priceNO)  / 10000),
        totalUSDC: formatUsdc(totalUSDC),
        volume:    totalUSDC,
      });
    }
  }

  return { markets, isLoading, refetch };
}

export function useMarket(address: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi: MARKET_ABI,
    functionName: "getMarketInfo",
  });

  if (!data) return { market: null, isLoading, refetch };

  const [question, category, closesAt, resolvesAt, state, outcome, priceYES, priceNO, totalUSDC]
    = data as [string, string, bigint, bigint, number, number, bigint, bigint, bigint];

  return {
    market: {
      address,
      question,
      category,
      closesAt:  Number(closesAt),
      resolvesAt: Number(resolvesAt),
      state,
      outcome,
      priceYES:  Math.round(Number(priceYES) / 10000),
      priceNO:   Math.round(Number(priceNO)  / 10000),
      totalUSDC: formatUsdc(totalUSDC),
      volume:    totalUSDC,
    } as MarketData,
    isLoading,
    refetch,
  };
}

export function useUserPositions(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getUserPositions",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  if (!data) return { positions: null, hasPosition: false, isLoading, refetch };

  const [sharesYES, sharesNO, valueYES, valueNO] = data as [bigint, bigint, bigint, bigint];

  return {
    positions: { sharesYES, sharesNO, valueYES, valueNO },
    hasPosition: sharesYES > BigInt(0) || sharesNO > BigInt(0),
    isLoading,
    refetch,
  };
}
