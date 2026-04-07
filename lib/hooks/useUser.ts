"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export function useUser(): { user: User | null; profile: UserProfile | null; loading: boolean } {
  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return { user: null, profile: null };

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      return { user, profile: profile as UserProfile | null };
    },
    staleTime: 5 * 60_000, // 5 minutes
  });

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    loading: isLoading,
  };
}
