"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { ShieldCheck, Mail, ArrowRight, CheckCircle, Home } from "lucide-react";
import { PasswordInput } from "@/src/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/src/components/auth/GoogleAuthButton";
import { AuthDivider } from "@/src/components/auth/AuthDivider";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL || "https://ai-powered-document-and-image.onrender.com";

function LoginForm() {
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";
  const passwordReset = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const formatErrorMessage = (detail: any): string => {
    if (!detail) return "An unexpected error occurred.";
    if (typeof detail === "string") {
      if (detail.includes("psycopg2") || detail.includes("SQL") || detail.includes("NotNullViolation")) {
        return "Authentication failed. Please try logging in again.";
      }
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((err) => (typeof err === "object" ? err.msg || JSON.stringify(err) : String(err))).join(", ");
    }
    if (typeof detail === "object") {
      return detail.msg || JSON.stringify(detail);
    }
    return String(detail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          device_name: "Web Browser",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Your email is not verified. Please check your inbox for the verification link/code.");
        }
        throw new Error(formatErrorMessage(data.detail) || "Failed to log in.");
      }

      login(data.access_token, data.refresh_token, data.user);
    } catch (err: any) {
      setError(formatErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Top Header Bar with Home & Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-20 pb-4">
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold group">
          <div className="w-9 h-9 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight">VerifyAI</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Form Container */}
      <div className="w-full max-w-md mx-auto my-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30 mb-4 transition-transform hover:scale-105">
            <ShieldCheck className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Sign in to your account to continue</p>
        </div>

        <GoogleAuthButton label="Sign in with Google" />

        <AuthDivider />

        {/* Success banners */}
        {justVerified && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">Email verified successfully! You can now sign in.</p>
          </div>
        )}
        {passwordReset && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">Password reset successfully. Sign in with your new password.</p>
          </div>
        )}

        {/* Error notification */}
        {(error || searchParams.get("error")) && (
          <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm">
            <span className="text-base mt-0.5">⚠️</span>
            <div>
              <p className="font-medium">{error || searchParams.get("error")}</p>
              {(error.includes("not verified") || (searchParams.get("error") || "").includes("not verified")) && (
                <Link href="/register" className="text-indigo-600 dark:text-indigo-400 underline text-xs mt-1.5 inline-block">
                  Go to registration page to verify →
                </Link>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              label="Password"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="text-center mt-7 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Don&apos;t have an account? </span>
          <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors">
            Create account
          </Link>
        </div>
      </div>

      <footer className="text-center py-2 text-xs text-slate-400 dark:text-slate-500 z-20">
        © 2026 VerifyAI Document Platform
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
