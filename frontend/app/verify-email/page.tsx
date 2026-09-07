"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing verification token.");
      setLoading(false);
      return;
    }

    fetch(`${API}/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Verification failed.");
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?verified=1");
        }, 3000);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl text-center relative z-10">
        {loading && (
          <div className="py-8 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying your email address...</h2>
            <p className="text-slate-400 text-sm">Please wait a moment while we validate your token.</p>
          </div>
        )}

        {!loading && success && (
          <div className="py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Email Address Verified! 🎉</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your email has been confirmed. Redirecting you to the sign-in page...
            </p>
            <div className="pt-2">
              <Link
                href="/login?verified=1"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30"
              >
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto">
              <XCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Verification Failed</h1>
            <p className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              {error}
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold text-sm transition-colors"
              >
                ← Back to registration to resend code
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
