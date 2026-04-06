import { createClient } from "@/lib/supabase/server";
import { TokenList } from "@/components/tokens/TokenList";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tokens } = await supabase
    .from("tokens")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const totalSupply = (tokens ?? []).reduce((sum, t) => sum + (t.initial_supply ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your deployed tokens</p>
        </div>
        <Button asChild>
          <Link href="/create-token">+ Deploy Token</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Tokens Deployed</p>
          <p className="text-2xl font-bold">{(tokens ?? []).length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Supply Issued</p>
          <p className="text-2xl font-bold">{totalSupply.toLocaleString()}</p>
        </div>
      </div>

      <TokenList initialTokens={tokens ?? []} />
    </div>
  );
}
export const dynamic = "force-dynamic";
