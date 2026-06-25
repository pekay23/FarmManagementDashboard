"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail, Sprout } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      console.error("Login network error:", err);
      setError("Network error: Could not reach authentication server.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Sprout className="h-9 w-9" />
          </div>

          <p className="text-[10px] font-black uppercase text-primary">Operations workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground">FieldOps</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to monitor crops, livestock, inventory, tasks, sales, and expenses.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 ml-1 block text-xs font-bold uppercase text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@farm.com"
                className="w-full rounded-lg border border-input bg-surface-raised p-3 pl-10 text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 ml-1 block text-xs font-bold uppercase text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-input bg-surface-raised p-3 pl-10 text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!mounted || loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {!mounted ? <Loader2 className="h-5 w-5 animate-spin" /> : loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">Farm operations workspace</div>
      </div>
    </div>
  );
}
