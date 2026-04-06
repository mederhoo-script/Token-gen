"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user?: User | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          🪙 TokenGen
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm hover:underline">
                Dashboard
              </Link>
              <Link href="/create-token" className="text-sm hover:underline">
                Create Token
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
