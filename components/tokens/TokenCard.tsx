"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAddress, formatSupply, formatDate } from "@/lib/utils/format";
import { getChainConfig, DEFAULT_CHAIN_ID } from "@/lib/blockchain/chains";
import type { Token } from "@/lib/hooks/useTokens";

export function TokenCard({ token }: { token: Token }) {
  const [copied, setCopied] = useState(false);
  const chain = getChainConfig(token.network_id) ?? getChainConfig(DEFAULT_CHAIN_ID)!;

  async function copy() {
    await navigator.clipboard.writeText(token.contract_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{token.name}</h3>
          <Badge variant="secondary">{token.symbol}</Badge>
        </div>
        <span className="text-sm text-muted-foreground">{formatDate(token.deployed_at)}</span>
      </div>
      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Supply:</span>{" "}
          {formatSupply(token.initial_supply)} ({token.decimals} decimals)
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Contract:</span>
          <span className="font-mono text-xs">{formatAddress(token.contract_address)}</span>
          <button onClick={copy} className="text-xs text-primary hover:underline">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="w-full">
        <a
          href={`${chain.explorerUrl}/address/${token.contract_address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on {chain.name} Explorer ↗
        </a>
      </Button>
    </div>
  );
}
