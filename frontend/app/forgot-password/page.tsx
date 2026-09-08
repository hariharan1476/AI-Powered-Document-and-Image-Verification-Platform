"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, SendHorizontal, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong.");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-violet-500/10 dark:bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Logo & Theme Toggle */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-7xl mx-auto py-2">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white block leading-none">
              Verify<span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
              DOCUMENT PLATFORM
            </span>
          </div>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="relative z-10 my-auto py-8">
        <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">
          {!sent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-5 transition-transform hover:scale-105">
                  <Mail size={28} strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                  Forgot Password?
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
                  No worries! Enter your registered email and we&apos;ll send you a secure reset link.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-fade-in">
                  <span className="text-base mt-0.5">⚠️</span>
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending link...
                    </>
                  ) : (
                    <>
                      Send Reset Link <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            /* ── Sent State ── */
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
                <SendHorizontal size={36} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Check Your Inbox</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed mb-2">
                If an account with <strong className="text-slate-900 dark:text-white">{email}</strong> exists, we&apos;ve sent a password reset link.
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-8">
                The link expires in <strong>30 minutes</strong>. Check your spam folder if you don&apos;t see it.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/25 transition-all"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center py-2 text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} VerifyAI. All rights reserved.
      </footer>
    </div>
  );
}
