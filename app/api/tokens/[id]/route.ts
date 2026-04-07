import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: token, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !token) {
      return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: token });
  } catch (error) {
    logServerError("GET /api/tokens/[id]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
