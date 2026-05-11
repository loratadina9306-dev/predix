// src/hooks/useMarketTrade.ts
"use client";

import { useState, useCallback } from "react";
import {
  useAccount, useWriteContract, useReadContract,
  useWaitForTransactionReceipt, usePublicClient,
} from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { CONTRACTS, MARKET_ABI, ERC20_ABI, parseUsdc } from "@/lib/config";

type TradeStatus = "idle" | "approving" | "approved" | "trading" | "success" | "error";

export function useMarketTrade(marketAddress: `0x${string}`) {
  const { address } = useAccount();
  const client = usePublicClient();

  const [status, setStatus]   = useState<TradeStatus>("idle");
  const [error,  setError]    = useState<string | null>(null);
  const [txHash, setTxHash]   = useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();

  // ─── Check USDC allowance ───────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi:     ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, marketAddress] : undefined,
    query: { enabled: !!address },
  });

  // ─── Check USDC balance ─────────────────────────
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi:     ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ─── BUY ────────────────────────────────────────
  const buy = useCallback(async (isYes: boolean, usdcAmountStr: string, slippageBps = 100) => {
    if (!address) throw new Error("Wallet not connected");

    setStatus("idle");
    setError(null);

    try {
      const usdcAmount = parseUsdc(usdcAmountStr);

      // 1. Cotizar shares esperados
      const quote = await client!.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "quoteBuy",
        args: [isYes, usdcAmount],
      }) as [bigint, bigint];

      const expectedShares = quote[0];
      const minShares = expectedShares * BigInt(10000 - slippageBps) / 10000n;

      // 2. Aprobar si necesario
      const currentAllowance = allowance ?? 0n;
      if (currentAllowance < usdcAmount) {
        setStatus("approving");
        const approveTx = await writeContractAsync({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, maxUint256],
        });

        // Esperar confirmación del approve
        await client!.waitForTransactionReceipt({ hash: approveTx });
        await refetchAllowance();
        setStatus("approved");
      }

      // 3. Ejecutar compra
      setStatus("trading");
      const buyTx = await writeContractAsync({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [isYes, usdcAmount, minShares],
      });

      setTxHash(buyTx);
      await client!.waitForTransactionReceipt({ hash: buyTx });
      setStatus("success");
      return { txHash: buyTx, sharesOut: expectedShares };

    } catch (err: any) {
      setError(err.shortMessage || err.message || "Transaction failed");
      setStatus("error");
      throw err;
    }
  }, [address, marketAddress, allowance, client, writeContractAsync, refetchAllowance]);

  // ─── SELL ───────────────────────────────────────
  const sell = useCallback(async (isYes: boolean, sharesAmount: bigint, slippageBps = 100) => {
    if (!address) throw new Error("Wallet not connected");

    setStatus("trading");
    setError(null);

    try {
      const sellTx = await writeContractAsync({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "sell",
        args: [isYes, sharesAmount, 0n], // minUsdc = 0 (simplificado)
      });

      setTxHash(sellTx);
      await client!.waitForTransactionReceipt({ hash: sellTx });
      setStatus("success");
      return { txHash: sellTx };
    } catch (err: any) {
      setError(err.shortMessage || err.message || "Transaction failed");
      setStatus("error");
      throw err;
    }
  }, [address, marketAddress, client, writeContractAsync]);

  // ─── REDEEM ─────────────────────────────────────
  const redeem = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    setStatus("trading");
    try {
      const redeemTx = await writeContractAsync({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "redeem",
        args: [],
      });

      setTxHash(redeemTx);
      await client!.waitForTransactionReceipt({ hash: redeemTx });
      setStatus("success");
      return { txHash: redeemTx };
    } catch (err: any) {
      setError(err.shortMessage || err.message);
      setStatus("error");
      throw err;
    }
  }, [address, marketAddress, client, writeContractAsync]);

  return {
    buy, sell, redeem,
    status, error, txHash,
    usdcBalance,
    isLoading: status === "approving" || status === "trading",
    isSuccess: status === "success",
    reset: () => { setStatus("idle"); setError(null); setTxHash(null); }
  };
}
