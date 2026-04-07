"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tokenSchema, type TokenFormData } from "@/lib/validation/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SUPPORTED_CHAINS_LIST, getFactoryAddress } from "@/lib/blockchain/chains";
import { DEPLOYMENT_FEE_ETH } from "@/lib/blockchain/constants";
import { FACTORY_ABI } from "@/lib/blockchain/factory-abi";
import { useToast } from "@/lib/hooks/use-toast";
import { useWallet } from "@/lib/hooks/useWallet";

/** Step within the deploy flow — used to show contextual status messages. */
type DeployStep = "idle" | "signing" | "mining" | "saving";

interface DeployResult {
  contractAddress: string;
  deploymentTxHash: string;
  explorerUrl: string;
}

/** Typed interface for the TokenFactory contract methods used in the UI. */
interface TokenFactoryContract {
  deploymentFee(): Promise<bigint>;
  createToken(
    name: string,
    symbol: string,
    initialSupply: bigint,
    decimalsValue: number,
    overrides: { value: bigint },
  ): Promise<ethers.ContractTransactionResponse>;
}

export function TokenForm() {
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<DeployStep>("idle");
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [gasCost, setGasCost] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const queryClient = useQueryClient();
  const { toast: showToast } = useToast();
  const { address, isCorrectChain, connecting, error: walletError, connect, switchToTargetChain, selectedChain, setSelectedChain } =
    useWallet();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
    setValue,
  } = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { decimals: 18 },
    mode: "onChange",
  });

  // Watch fields needed for gas estimation
  const [name, symbol, initialSupply, decimals] = useWatch({
    control,
    name: ["name", "symbol", "initialSupply", "decimals"],
  });

  // Debounced gas estimate: fire whenever the four core fields are valid
  useEffect(() => {
    if (!name || !symbol || !initialSupply || !decimals) {
      setGasCost(null);
      return;
    }
    // Basic checks to avoid spamming the RPC with partial/invalid values
    if (
      name.length < 1 ||
      symbol.length < 1 ||
      initialSupply < 1 ||
      initialSupply > 1_000_000_000
    ) {
      setGasCost(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await fetch("/api/tokens/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, symbol, initialSupply, decimals }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.success) setGasCost(json.data.gasCost);
        else setGasCost(null);
      } catch {
        setGasCost(null);
      } finally {
        setEstimating(false);
      }
    }, 800); // 800 ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, symbol, initialSupply, decimals]);

  function handleSymbolChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("symbol", e.target.value.toUpperCase(), { shouldValidate: true });
  }

  async function onSubmit(data: TokenFormData) {
    setError(null);
    setDeploying(true);
    setDeployStep("signing");
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed.");
        return;
      }
      const factoryAddress = getFactoryAddress(selectedChain.id);
      if (!factoryAddress) {
        setError(
          `Token factory is not deployed on ${selectedChain.name} yet. Please select another network.`,
        );
        return;
      }

      // 1. Connect to the user's wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        factoryAddress,
        FACTORY_ABI,
        signer,
      ) as unknown as TokenFactoryContract;

      // 2. Fetch the on-chain fee so the value is always exact
      const fee = await factory.deploymentFee();

      // 3. Submit the factory transaction — MetaMask opens for user confirmation
      const tx = await factory.createToken(
        data.name,
        data.symbol,
        BigInt(data.initialSupply),
        data.decimals,
        { value: fee },
      );

      // 4. Wait for on-chain confirmation
      setDeployStep("mining");
      const receipt = await tx.wait(1);
      if (!receipt) throw new Error("No receipt returned after mining.");

      // 5. Save to DB via the verify endpoint
      setDeployStep("saving");
      const res = await fetch("/api/tokens/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: receipt.hash,
          name: data.name,
          symbol: data.symbol,
          initialSupply: data.initialSupply,
          decimals: data.decimals,
          chainId: selectedChain.id,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to save token record.");
        return;
      }

      setResult(json.data);
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      showToast({ title: "Token deployed!", description: "Your ERC20 token is live on-chain." });
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deployment failed";
      if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied")) {
        setError("Transaction rejected in MetaMask.");
      } else {
        setError(msg);
      }
    } finally {
      setDeploying(false);
      setDeployStep("idle");
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
            View on {selectedChain.name} Explorer →
          </a>
        </div>
        <Button className="w-full" onClick={() => setResult(null)}>
          Deploy Another Token
        </Button>
      </div>
    );
  }

  function deployStepMessage(): string {
    switch (deployStep) {
      case "signing":
        return "Please confirm the transaction in MetaMask…";
      case "mining":
        return "⏳ Transaction submitted. Waiting for confirmation (20–30s)…";
      case "saving":
        return "Saving your token record…";
      default:
        return "";
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border p-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {walletError && !error && (
        <Alert variant="destructive">
          <AlertDescription>{walletError}</AlertDescription>
        </Alert>
      )}
      {deploying && deployStep !== "idle" && (
        <Alert>
          <AlertDescription>{deployStepMessage()}</AlertDescription>
        </Alert>
      )}

      {/* Network selector */}
      <div className="space-y-1">
        <Label htmlFor="network">Network</Label>
        <select
          id="network"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={selectedChain.id}
          onChange={(e) => {
            const chain = SUPPORTED_CHAINS_LIST.find((c) => c.id === Number(e.target.value));
            if (chain) setSelectedChain(chain);
          }}
          disabled={deploying}
        >
          {SUPPORTED_CHAINS_LIST.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name} ({chain.nativeCurrency.symbol})
            </option>
          ))}
        </select>
      </div>

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

      {/* Gas estimate */}
      {(gasCost || estimating) && (
        <p className="text-sm text-muted-foreground">
          {estimating ? "Estimating network gas…" : `Estimated network gas: ~${gasCost}`}
        </p>
      )}

      {/* Service fee notice */}
      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-medium">Service fee:</span>{" "}
        <span className="font-mono">
          {DEPLOYMENT_FEE_ETH} {selectedChain.nativeCurrency.symbol}
        </span>
        <span className="ml-1 text-muted-foreground">(paid on-chain to deploy your token)</span>
      </div>

      {/* Wallet connection + deploy button */}
      {!address ? (
        <Button type="button" className="w-full" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Wallet to Deploy"}
        </Button>
      ) : !isCorrectChain ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Switch to <strong>{selectedChain.name}</strong> to continue.
          </p>
          <Button type="button" className="w-full" onClick={switchToTargetChain}>
            Switch to {selectedChain.name}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="truncate text-xs text-muted-foreground text-center">
            Connected: {address}
          </p>
          <Button type="submit" className="w-full" disabled={deploying || !isValid}>
            {deploying
              ? deployStep === "signing"
                ? "Waiting for MetaMask…"
                : deployStep === "mining"
                  ? "Confirming on-chain…"
                  : "Saving…"
              : `Deploy Token (${DEPLOYMENT_FEE_ETH} ${selectedChain.nativeCurrency.symbol} fee)`}
          </Button>
        </div>
      )}
    </form>
  );
}
