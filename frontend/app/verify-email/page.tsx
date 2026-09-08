"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";

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
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

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
        <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl text-center relative z-10">
          {loading && (
            <div className="py-8 space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying your email address...</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Please wait a moment while we validate your token.</p>
            </div>
          )}

          {!loading && success && (
            <div className="py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mx-auto animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Email Address Verified! 🎉</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Your email has been confirmed. Redirecting you to the sign-in page...
              </p>
              <div className="pt-2">
                <Link
                  href="/login?verified=1"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25"
                >
                  Sign In Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mx-auto">
                <XCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Verification Failed</h1>
              <p className="text-rose-600 dark:text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                {error}
              </p>
              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-sm transition-colors"
                >
                  ← Back to registration to resend code
                </Link>
              </div>
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

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
