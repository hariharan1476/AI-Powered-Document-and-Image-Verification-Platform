"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowRight, CheckCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password strength score
  const strength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed.");
      setSuccess(true);
      setTimeout(() => router.push("/login?reset=1"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-violet-500/10 dark:bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
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

      {/* Form Content */}
      <main className="relative z-10 my-auto py-8">
        {!token ? (
          <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">🔗</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Reset Link</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              This link is missing a token. Please use the link from your email or request a new one.
            </p>
            <Link href="/forgot-password" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Request a new reset link →
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">
            {!success ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-5 transition-transform hover:scale-105">
                    <Lock size={28} strokeWidth={2.5} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                    Reset Password
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                    Choose a strong new password for your account.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-fade-in">
                    <span className="text-base mt-0.5">⚠️</span>
                    <div>
                      <p className="font-medium">{error}</p>
                      {error.includes("expired") && (
                        <Link href="/forgot-password" className="text-red-500 underline text-xs mt-1 inline-block">
                          Request a new link →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Min. 8 characters"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength ? strengthColor : "bg-slate-200 dark:bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>
                        <p
                          className={`text-xs font-semibold ${
                            ["", "text-rose-500", "text-amber-500", "text-blue-500", "text-emerald-500"][strength]
                          }`}
                        >
                          {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-900/80 border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
                          confirmPassword && confirmPassword !== password
                            ? "border-red-500/50 focus:ring-red-500"
                            : "border-slate-200 dark:border-slate-700/80 focus:ring-indigo-500"
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 font-medium mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (!!confirmPassword && confirmPassword !== password)}
                    className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Resetting...
                      </>
                    ) : (
                      <>
                        Reset Password <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6 animate-bounce">
                  <CheckCircle size={40} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Password Reset! 🎉</h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
                  Your password has been changed. Redirecting to sign in…
                </p>
                <div className="flex justify-center">
                  <svg className="animate-spin h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center py-2 text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} VerifyAI. All rights reserved.
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
