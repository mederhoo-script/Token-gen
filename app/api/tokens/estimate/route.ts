import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateDeploymentGas } from "@/lib/blockchain/deployer";
import { tokenSchema } from "@/lib/validation/schemas";
import { logServerError } from "@/lib/utils/errors";

/**
 * POST /api/tokens/estimate
 *
 * Returns a gas cost estimate for deploying the described token.
 * Requires authentication so only valid users can hit the RPC.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    // Re-use the token schema but omit the confirmation checkbox
    const parsed = tokenSchema.omit({ confirmed: true }).safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const estimate = await estimateDeploymentGas(parsed.data);

    return NextResponse.json({
      success: true,
      data: {
        gasCost: estimate.gasCost,
        gasUnits: estimate.gasEstimate.toString(),
      },
    });
  } catch (error) {
    logServerError("POST /api/tokens/estimate", error);
    return NextResponse.json(
      { success: false, error: "Gas estimation failed. Try again." },
      { status: 500 },
    );
  }
}
