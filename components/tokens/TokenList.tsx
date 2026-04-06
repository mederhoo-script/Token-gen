"use client";
import { useTokens, type Token } from "@/lib/hooks/useTokens";
import { TokenCard } from "./TokenCard";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TokenListProps {
  initialTokens?: Token[];
}

export function TokenList({ initialTokens = [] }: TokenListProps) {
  const { data: tokens, isLoading, error } = useTokens();
  const displayTokens = tokens ?? initialTokens;

  if (isLoading && initialTokens.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Failed to load tokens. Please refresh.</p>;
  }

  if (displayTokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
        <div className="text-5xl mb-4">🪙</div>
        <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
        <p className="text-muted-foreground mb-4">Deploy your first ERC20 token in seconds.</p>
        <Button asChild>
          <Link href="/create-token">Create your first token</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {displayTokens.map((token) => (
        <TokenCard key={token.id} token={token} />
      ))}
    </div>
  );
}
