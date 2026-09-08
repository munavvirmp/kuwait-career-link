import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

  const loadRole = useCallback(async (userId?: string) => {
    if (!userId) {
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

      const value = data.role;

      if (
        value === "admin" ||
        value === "employer" ||
        value === "job_seeker"
      ) {
        setRole(value);
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        const currentSession = data.session ?? null;

        setSession(currentSession);

        if (currentSession?.user?.id) {
          await loadRole(currentSession.user.id);
        } else {
          setRole(null);
        }
      } catch {
        if (!mounted) return;

        setSession(null);
        setRole(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (event === "SIGNED_OUT") {
        setRole(null);
        return;
      }

      setTimeout(() => {
        if (!mounted) return;
        void loadRole(nextSession?.user?.id);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadRole]);

  const refreshRole = useCallback(async () => {
    await loadRole(session?.user?.id);
  }, [loadRole, session?.user?.id]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading,
      refreshRole,
    }),
    [session, role, loading, refreshRole],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}