// src/lib/config.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, polygonMumbai } from "wagmi/chains";

export const config = getDefaultConfig({
  appName:   "Pronósticos",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains:    [polygon, polygonMumbai],
  ssr:       true,
});

export const CONTRACTS = {
  MARKET:   (process.env.NEXT_PUBLIC_MARKET_ADDRESS   || "0x428bC1bB9F9C5B161ea72dC9d734e5498DcbC339") as `0x${string}`,
  FACTORY:  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS  || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  RESOLVER: (process.env.NEXT_PUBLIC_RESOLVER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  USDC:     (process.env.NEXT_PUBLIC_USDC_ADDRESS     || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174") as `0x${string}`,
};

export const MARKET_ABI = [
  { name: "question",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "category",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "closesAt",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "resolvesAt", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "state",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "outcome",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "priceYES",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "priceNO",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalUSDC",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getMarketInfo", type: "function", stateMutability: "view", inputs: [],
    outputs: [
      { name: "_question",  type: "string"  },
      { name: "_category",  type: "string"  },
      { name: "_closesAt",  type: "uint256" },
      { name: "_resolvesAt",type: "uint256" },
      { name: "_state",     type: "uint8"   },
      { name: "_outcome",   type: "uint8"   },
      { name: "_priceYES",  type: "uint256" },
      { name: "_priceNO",   type: "uint256" },
      { name: "_totalUSDC", type: "uint256" },
    ]
  },
  {
    name: "getUserPositions", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "_sharesYES", type: "uint256" },
      { name: "_sharesNO",  type: "uint256" },
      { name: "_valueYES",  type: "uint256" },
      { name: "_valueNO",   type: "uint256" },
    ]
  },
  {
    name: "quoteBuy", type: "function", stateMutability: "view",
    inputs: [{ name: "isYes", type: "bool" }, { name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "sharesOut", type: "uint256" }, { name: "pricePerShare", type: "uint256" }]
  },
  {
    name: "buy", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "isYes",     type: "bool"    },
      { name: "usdcAmount",type: "uint256" },
      { name: "minShares", type: "uint256" },
    ], outputs: []
  },
  {
    name: "sell", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "isYes",       type: "bool"    },
      { name: "sharesAmount",type: "uint256" },
      { name: "minUsdc",     type: "uint256" },
    ], outputs: []
  },
  { name: "redeem", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const ERC20_ABI = [
  {
    name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }]
  },
  {
    name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
] as const;

export const PRECISION = BigInt(1_000_000);

export function formatUsdc(raw: bigint): string {
  const whole = raw / PRECISION;
  const frac  = raw % PRECISION;
  return `${whole}.${frac.toString().padStart(6, "0").slice(0, 2)}`;
}

export function parseUsdc(amount: string): bigint {
  const [w, f = ""] = amount.split(".");
  return BigInt(w || "0") * PRECISION + BigInt(f.slice(0, 6).padEnd(6, "0"));
}

export const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  futbol:   { label: "Fútbol",   emoji: "⚽", color: "var(--yes)" },
  politica: { label: "Política", emoji: "🗳️", color: "#ff7740"   },
  economia: { label: "Economía", emoji: "💸", color: "var(--gold)"},
  cultura:  { label: "Cultura",  emoji: "🎭", color: "var(--purple)" },
};
