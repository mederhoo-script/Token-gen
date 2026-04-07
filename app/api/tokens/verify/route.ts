import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FACTORY_ADDRESS } from "@/lib/blockchain/constants";
import { getChainConfig, getChainRpcUrl, getFactoryAddress, DEFAULT_CHAIN_ID } from "@/lib/blockchain/chains";
import { FACTORY_ABI } from "@/lib/blockchain/factory-abi";
import { logServerError } from "@/lib/utils/errors";
import { z } from "zod";

const verifySchema = z.object({
  txHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid transaction hash"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name too long"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10, "Symbol too long"),
  initialSupply: z
    .number()
    .int()
    .min(1)
    .max(1_000_000_000),
  decimals: z.union([z.literal(6), z.literal(8), z.literal(18)]),
  /** Chain to verify against. Defaults to Sepolia for backward compatibility. */
  chainId: z.number().int().positive().optional(),
});

/**
 * POST /api/tokens/verify
 *
 * After a user deploys a token via the TokenFactory smart contract in their
 * browser, the frontend calls this endpoint with the confirmed transaction hash
 * and token parameters.  The server:
 *   1. Authenticates the caller.
 *   2. Looks up the transaction receipt on-chain.
 *   3. Validates that it interacted with the known factory contract.
 *   4. Extracts the deployed token address from the TokenCreated event.
 *   5. Persists the token record to Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Auth ---
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { txHash, name, symbol, initialSupply, decimals, chainId: rawChainId } = parsed.data;
    const chainId = rawChainId ?? DEFAULT_CHAIN_ID;

    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { success: false, error: "Unsupported chain" },
        { status: 400 },
      );
    }

    // --- Idempotency check ---
    const { data: existing } = await supabase
      .from("tokens")
      .select("id")
      .eq("deployment_tx_hash", txHash)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Transaction already recorded" },
        { status: 409 },
      );
    }

    // --- On-chain verification ---
    const rpcUrl = getChainRpcUrl(chainId);
    if (!rpcUrl) {
      return NextResponse.json(
        { success: false, error: `RPC not configured for ${chainConfig.name}` },
        { status: 500 },
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Resolve the factory address: prefer the per-chain env var, fall back to the
    // legacy NEXT_PUBLIC_FACTORY_ADDRESS for the default chain.
    const factoryAddress = getFactoryAddress(chainId) || (chainId === DEFAULT_CHAIN_ID ? FACTORY_ADDRESS : "");
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Transaction not found. It may still be pending." },
        { status: 404 },
      );
    }

    if (receipt.status === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction reverted on-chain." },
        { status: 400 },
      );
    }

    // When factoryAddress is configured, verify the tx targeted our contract
    if (factoryAddress && receipt.to?.toLowerCase() !== factoryAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Transaction was not sent to the TokenFactory contract." },
        { status: 400 },
      );
    }

    // --- Extract TokenCreated event ---
    const factoryInterface = new ethers.Interface(FACTORY_ABI);
    let contractAddress: string | null = null;

    for (const log of receipt.logs) {
      try {
        const decoded = factoryInterface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (decoded?.name === "TokenCreated") {
          contractAddress = decoded.args.tokenAddress as string;
          break;
        }
      } catch {
        // Not a log from our factory — skip
      }
    }

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: "TokenCreated event not found in transaction logs." },
        { status: 400 },
      );
    }

    // --- Get the service fee charged and block timestamp ---
    // Read deploymentFee from the factory contract (view call, no gas) so we record only the
    // actual fee collected, not any excess ETH that was refunded to the caller on-chain.
    const [block, serviceFeeWei] = await Promise.all([
      provider.getBlock(receipt.blockNumber),
      factoryAddress
        ? provider
            .call({ to: factoryAddress, data: new ethers.Interface(FACTORY_ABI).encodeFunctionData("deploymentFee") })
            .then((raw) => ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], raw)[0] as bigint)
            .then((fee) => fee.toString())
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const deployedAt = block
      ? new Date(block.timestamp * 1000).toISOString()
      : new Date().toISOString();

    // --- Persist to Supabase ---
    const serviceClient = createServiceClient();
    await serviceClient
      .from("user_profiles")
      .upsert({ id: user.id, email: user.email }, { onConflict: "id", ignoreDuplicates: true });

    const { data: token, error: dbError } = await serviceClient
      .from("tokens")
      .insert({
        user_id: user.id,
        name,
        symbol,
        initial_supply: initialSupply,
        decimals,
        contract_address: contractAddress,
        deployment_tx_hash: txHash,
        network_id: chainId,
        deployed_at: deployedAt,
        fee_paid_wei: serviceFeeWei,
      })
      .select()
      .single();

    if (dbError) {
      logServerError("POST /api/tokens/verify - db insert", dbError, { userId: user.id });
      return NextResponse.json(
        { success: false, error: "Failed to save token record" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: token.id,
          contractAddress,
          deploymentTxHash: txHash,
          deployedAt,
          explorerUrl: `${chainConfig.explorerUrl}/tx/${txHash}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("POST /api/tokens/verify", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
