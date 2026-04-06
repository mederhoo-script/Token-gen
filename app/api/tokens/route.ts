import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { deployToken } from "@/lib/blockchain/deployer";
import { tokenSchema } from "@/lib/validation/schemas";
import { logServerError } from "@/lib/utils/errors";
import { TOKEN_LIMITS, CHAIN_CONFIG } from "@/lib/blockchain/constants";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: tokens, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logServerError("GET /api/tokens", error, { userId: user.id });
      return NextResponse.json({ success: false, error: "Failed to fetch tokens" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: tokens });
  } catch (error) {
    logServerError("GET /api/tokens", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const parsed = tokenSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message ?? "Validation failed" },
        { status: 400 }
      );
    }

    const { name, symbol, initialSupply, decimals } = parsed.data;

    const oneHourAgo = new Date(Date.now() - TOKEN_LIMITS.windowMs).toISOString();
    const { count } = await supabase
      .from("tokens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= TOKEN_LIMITS.maxPerUser) {
      return NextResponse.json(
        { success: false, error: "Too many deployments. Max 5/hour" },
        { status: 429 }
      );
    }

    let deployResult;
    try {
      deployResult = await deployToken({ name, symbol, initialSupply, decimals });
    } catch (error) {
      logServerError("POST /api/tokens - deployment", error, { userId: user.id });
      return NextResponse.json(
        { success: false, error: "Deployment failed. Please try again." },
        { status: 500 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: token, error: dbError } = await serviceClient
      .from("tokens")
      .insert({
        user_id: user.id,
        name,
        symbol,
        initial_supply: initialSupply,
        decimals,
        contract_address: deployResult.contractAddress,
        deployment_tx_hash: deployResult.deploymentTxHash,
        network_id: CHAIN_CONFIG.id,
        deployed_at: deployResult.deployedAt,
      })
      .select()
      .single();

    if (dbError) {
      logServerError("POST /api/tokens - db insert", dbError, { userId: user.id });
      return NextResponse.json(
        { success: false, error: "Failed to save token record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: token.id,
          contractAddress: deployResult.contractAddress,
          deploymentTxHash: deployResult.deploymentTxHash,
          deployedAt: deployResult.deployedAt,
          explorerUrl: deployResult.explorerUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logServerError("POST /api/tokens", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
