import {
  createContext,
  useContext,
  useEffect,
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

async function getRole(user: User | null): Promise<AppRole | null> {
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user role:", error);
    return null;
  }

  const role = data?.role;

  if (role === "admin" || role === "employer" || role === "job_seeker") {
    return role;
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const updateAuthState = async (nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    const nextRole = await getRole(nextUser);
    setRole(nextRole);
  };

  const refreshRole = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to refresh auth state:", error);
        return;
      }

      await updateAuthState(data.session);
    } catch (error) {
      console.error("Failed to refresh auth state:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Supabase auth initialization error:", error);
          await updateAuthState(null);
          return;
        }

        await updateAuthState(data.session);
      } catch (error) {
        console.error("Failed to initialize authentication:", error);

        if (mounted) {
          await updateAuthState(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const result = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;

        void updateAuthState(nextSession);
      });

      subscription = result.data.subscription;
    } catch (error) {
      console.error("Failed to subscribe to auth state:", error);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        loading,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
