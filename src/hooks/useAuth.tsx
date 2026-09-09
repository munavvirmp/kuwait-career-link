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

function getRole(user: User | null): AppRole | null {
  if (!user) return null;

  const role = user.user_metadata?.role;

  if (role === "admin" || role === "employer" || role === "job_seeker") {
    return role;
  }

  return "job_seeker";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const updateAuthState = (nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);
    setRole(getRole(nextUser));
  };

  const refreshRole = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to refresh auth state:", error);
        return;
      }

      updateAuthState(data.session);
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
          updateAuthState(null);
          return;
        }

        updateAuthState(data.session);
      } catch (error) {
        console.error("Failed to initialize authentication:", error);

        if (mounted) {
          updateAuthState(null);
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

        updateAuthState(nextSession);
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

