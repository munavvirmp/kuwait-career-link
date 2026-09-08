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

      const userRole = data.role as AppRole;

      if (
        userRole === "admin" ||
        userRole === "employer" ||
        userRole === "job_seeker"
      ) {
        setRole(userRole);
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          setSession(null);
          setRole(null);
          return;
        }

        const currentSession = data.session ?? null;
        setSession(currentSession);

        if (currentSession?.user?.id) {
          await loadRole(currentSession.user.id);
        } else {
          setRole(null);
        }
      } catch {
        if (!active) return;

        setSession(null);
        setRole(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      // Do not await Supabase calls directly inside
      // the auth state change callback.
      setTimeout(() => {
        if (!active) return;

        void loadRole(nextSession?.user?.id);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadRole]);

  const refreshRole = useCallback(async () => {
    await loadRole(session?.user?.id);
  }, [loadRole, session?.user?.id]);

  const value = useMemo<AuthContextValue>(
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