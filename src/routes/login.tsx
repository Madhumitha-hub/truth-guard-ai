import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · DeepGuard AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) navigate({ to: "/dashboard" });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex relative items-center justify-center hero-bg">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-md p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary glow">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Welcome back to <span className="gradient-text">DeepGuard</span></h2>
          <p className="mt-3 text-muted-foreground">Continue verifying media with real AI inference.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
            <h1 className="mt-3 text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use your DeepGuard credentials.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
