import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NOINDEX_META } from "@/lib/seo";

type AuthSearch = {
  mode?: "login" | "signup" | undefined;
  role?: "job_seeker" | "employer" | undefined;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "signup" ? "signup" : "login",
    role: search["role"] === "employer" ? "employer" : "job_seeker",
  }),
  head: () => ({
    meta: [
      { title: "Sign In or Create an Account — KuwaitJobs" },
      { name: "description", content: "Log in or register as a job seeker or employer on the KuwaitJobs portal." },
      { property: "og:title", content: "Sign In or Register — KuwaitJobs" },
      { property: "og:description", content: "Access your job seeker or employer account on KuwaitJobs." },
      ...NOINDEX_META,
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [accountType, setAccountType] = useState<"job_seeker" | "employer">(search.role ?? "job_seeker");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    void navigate({
      to: role === "admin" ? "/admin" : role === "employer" ? "/employer" : "/dashboard",
      replace: true,
    });
  }, [user, role, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: form.fullName, role: accountType },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md gap-5 p-7 shadow-elevated">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="size-5" />
          </span>
          <span className="text-lg font-bold">
            Kuwait<span className="text-primary">Jobs</span>
          </span>
        </Link>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Register</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="grid gap-4" onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>I am a</Label>
                <RadioGroup
                  className="grid grid-cols-2 gap-2"
                  value={accountType}
                  onValueChange={(v) => setAccountType(v as "job_seeker" | "employer")}
                >
                  <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-3 text-sm">
                    <RadioGroupItem value="job_seeker" /> Job seeker
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-3 text-sm">
                    <RadioGroupItem value="employer" /> Employer
                  </Label>
                </RadioGroup>
              </div>
            </>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Login"}
          </Button>
        </form>

        <Button variant="outline" onClick={google}>
          Continue with Google
        </Button>

        <Link to="/" className="text-center text-sm text-muted-foreground hover:text-primary">
          Back to homepage
        </Link>
      </Card>
    </div>
  );
}
