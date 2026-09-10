import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Public project values. These are safe to ship (the publishable key is public and
// protected by Row Level Security). They act as a fallback so the app never fails
// to boot when the build environment does not inline the VITE_ variables — which
// previously crashed server-side rendering in production.
const FALLBACK_SUPABASE_URL = "https://dcwkycbttaopqevmlqbn.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_3C6yP7c6YR37aCaUszAC2A_1q1E5pUL";

function readServerEnv(name: string): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  readServerEnv("SUPABASE_URL") ||
  FALLBACK_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  readServerEnv("SUPABASE_PUBLISHABLE_KEY") ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
