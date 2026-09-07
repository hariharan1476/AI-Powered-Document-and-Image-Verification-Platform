"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";

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

  // Password strength
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
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-400"][strength];

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
        <div className="glass-card max-w-md w-full p-10 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Reset Link</h2>
          <p className="text-slate-500 text-sm mb-6">This link is missing a token. Please use the link from your email.</p>
          <Link href="/forgot-password" className="text-primary-600 font-semibold hover:underline">
            Request a new reset link →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-80 h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />

      <div className="glass-card max-w-md w-full p-8 md:p-10 relative z-10">
        {!success ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-400 text-white shadow-lg shadow-red-500/30 mb-5 transition-transform hover:scale-105">
                <Lock size={28} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Reset Password</h1>
              <p className="text-slate-500 font-medium text-sm">Choose a strong new password for your account.</p>
            </div>

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm animate-fade-in">
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required minLength={8}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 transition-all duration-200"
                    placeholder="Min. 8 characters"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-slate-200"}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${["", "text-red-500", "text-yellow-600", "text-blue-600", "text-green-600"][strength]}`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white/50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-300 focus:ring-red-300/50 focus:border-red-400"
                        : "border-slate-200 focus:ring-red-400/50 focus:border-red-400"
                    }`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit" disabled={loading || (!!confirmPassword && confirmPassword !== password)}
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 hover:from-red-600 hover:to-orange-500 text-white font-semibold shadow-lg shadow-red-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Resetting...</>
                ) : (
                  <>Reset Password <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6 animate-bounce">
              <CheckCircle size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Password Reset! 🎉</h2>
            <p className="text-slate-500 font-medium mb-6">Your password has been changed. Redirecting to sign in…</p>
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
