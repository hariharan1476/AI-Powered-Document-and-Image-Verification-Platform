"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, SendHorizontal } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />

      <div className="glass-card max-w-md w-full p-8 md:p-10 relative z-10">

        {!sent ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-500/30 mb-5 transition-transform hover:scale-105">
                <Mail size={28} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Forgot Password?</h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                No worries! Enter your email and we&apos;ll send you a secure link to reset your password.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm animate-fade-in">
                <span className="text-base mt-0.5">⚠️</span>
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all duration-200"
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Sending...</>
                ) : (
                  <>Send Reset Link <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          /* ── Sent State ── */
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <SendHorizontal size={36} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Check Your Inbox</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-2">
              If an account with <strong className="text-slate-700">{email}</strong> exists, we&apos;ve sent a password reset link.
            </p>
            <p className="text-slate-400 text-xs mb-8">
              The link expires in <strong>30 minutes</strong>. Check your spam folder if you don&apos;t see it.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold shadow-md shadow-primary-500/20 hover:shadow-primary-500/30 transition-all"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
