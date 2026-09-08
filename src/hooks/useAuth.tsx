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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(); // Prevents multi-row crash errors

      if (error || !data) {
        setRole(null);
        return;
      }
      
      const userRole = data.role as AppRole;
      if (["admin", "employer", "job_seeker"].includes(userRole)) {
        setRole(userRole);
      } else {
        setRole(null);
      }
    } catch (err) {
      setRole(null);
    }
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session ?? null);
        await loadRole(data.session?.user?.id);
      } catch (err) {
        // Fallback safely
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!active) return;
      setSession(nextSession);
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
