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
    if (!userId || !supabase) {
      setRole(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

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

    if (!supabase) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        
        const currentSession = data?.session ?? null;
        setSession(currentSession);
        await loadRole(currentSession?.user?.id);
      } catch (err) {
        if (active) {
          setSession(null);
          setRole(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      void loadRole(nextSession?.user?.id);
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
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
