import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "employer" | "job_seeker";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  loading: true,
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      return;
    }
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) {
        console.error("Error loading user role:", error);
        setRole(null);
        return;
      }
      const roles = (data ?? []).map((r) => r.role as AppRole);
      setRole(
        roles.includes("admin")
          ? "admin"
          : roles.includes("employer")
            ? "employer"
            : roles.includes("job_seeker")
              ? "job_seeker"
              : null,
      );
    } catch (err) {
      console.error("Unexpected error loading role:", err);
      setRole(null);
    }
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!active) return;
        setSession(data.session);
        await loadRole(data.session?.user?.id);
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void initializeAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      // Optional chaining used safely here
      void loadRole(nextSession?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading,
      refreshRole: () => loadRole(session?.user?.id),
    }),
    [session, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
