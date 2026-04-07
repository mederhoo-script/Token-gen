"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tokenSchema, type TokenFormData } from "@/lib/validation/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CHAIN_CONFIG } from "@/lib/blockchain/constants";

interface DeployResult {
  contractAddress: string;
  deploymentTxHash: string;
  explorerUrl: string;
}

export function TokenForm() {
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setValue,
  } = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { decimals: 18 },
    mode: "onChange",
  });

  function handleSymbolChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("symbol", e.target.value.toUpperCase(), { shouldValidate: true });
  }

  async function onSubmit(data: TokenFormData) {
    setError(null);
    setDeploying(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Deployment failed");
        return;
      }
      setResult(json.data);
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeploying(false);
    }
  }

  async function copyAddress() {
    if (!result?.contractAddress) return;
    await navigator.clipboard.writeText(result.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4 rounded-lg border p-6">
        <div className="text-center text-4xl">🎉</div>
        <h2 className="text-center text-xl font-semibold">Token Deployed!</h2>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Contract Address:</p>
          <div className="flex items-center gap-2 rounded bg-muted p-2 font-mono text-xs break-all">
            <span className="flex-1">{result.contractAddress}</span>
            <button onClick={copyAddress} className="shrink-0 text-primary hover:underline">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-primary hover:underline"
          >
            View on {CHAIN_CONFIG.name} Etherscan →
          </a>
        </div>
        <Button className="w-full" onClick={() => setResult(null)}>
          Deploy Another Token
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border p-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {deploying && (
        <Alert>
          <AlertDescription>
            ⏳ Deploying contract... This takes 20–30 seconds. Please wait.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="name">Token Name</Label>
        <Input id="name" {...register("name")} placeholder="My Custom Token" disabled={deploying} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="symbol">Symbol</Label>
        <Input
          id="symbol"
          {...register("symbol")}
          onChange={handleSymbolChange}
          placeholder="MCT"
          maxLength={10}
          disabled={deploying}
        />
        {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="initialSupply">Initial Supply</Label>
        <Input
          id="initialSupply"
          type="number"
          {...register("initialSupply", { valueAsNumber: true })}
          placeholder="1000000"
          min={1}
          max={1_000_000_000}
          disabled={deploying}
        />
        {errors.initialSupply && (
          <p className="text-sm text-destructive">{errors.initialSupply.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="decimals">Decimals</Label>
        <select
          id="decimals"
          {...register("decimals", { valueAsNumber: true })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          disabled={deploying}
        >
          <option value={6}>6</option>
          <option value={8}>8</option>
          <option value={18}>18 (default)</option>
        </select>
        {errors.decimals && <p className="text-sm text-destructive">{errors.decimals.message}</p>}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="confirmed"
          type="checkbox"
          {...register("confirmed")}
          className="mt-1"
          disabled={deploying}
        />
        <Label htmlFor="confirmed" className="cursor-pointer">
          I understand this costs gas and is irreversible
        </Label>
      </div>
      {errors.confirmed && <p className="text-sm text-destructive">{errors.confirmed.message}</p>}

      <Button type="submit" className="w-full" disabled={deploying || !isValid}>
        {deploying ? "Deploying..." : "Deploy Token"}
      </Button>
    </form>
  );
}
