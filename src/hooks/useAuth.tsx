import { createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

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
  loading: false,
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // താൽക്കാലികമായി ലോഗിൻ ഓഫ് ചെയ്തു വെക്കുന്നു (Mock Auth)
  return (
    <AuthContext.Provider
      value={{
        session: null,
        user: null,
        role: null,
        loading: false,
        refreshRole: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
