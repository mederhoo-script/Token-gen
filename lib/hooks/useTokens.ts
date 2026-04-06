"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils/api-client";

export interface Token {
  id: string;
  name: string;
  symbol: string;
  initial_supply: number;
  decimals: number;
  contract_address: string;
  deployment_tx_hash: string;
  network_id: number;
  deployed_at: string;
  created_at: string;
}

export function useTokens() {
  return useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await apiRequest<Token[]>("/api/tokens");
      if (!res.success) throw new Error(res.error ?? "Failed to fetch tokens");
      return res.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
