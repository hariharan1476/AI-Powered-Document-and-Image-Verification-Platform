"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, User, ArrowRight, RefreshCw, CheckCircle, Lock } from "lucide-react";
import { PasswordInput } from "@/src/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/src/components/auth/PasswordStrengthMeter";
import { GoogleAuthButton } from "@/src/components/auth/GoogleAuthButton";
import { AuthDivider } from "@/src/components/auth/AuthDivider";
import { useAuth } from "@/src/contexts/AuthContext";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL || "https://ai-powered-document-and-image.onrender.com";

type Step = "register" | "otp" | "success";

export default function RegisterPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState<Step>("register");

  // Register form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Handle Register ──────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms of service to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");
      setStep("otp");
      startResendCooldown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle OTP input ─────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      document.getElementById("otp-5")?.focus();
    }
  };

  // ── Handle Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const otpStr = otp.join("");
    if (otpStr.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpStr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed.");

      setStep("success");
      setTimeout(() => {
        authLogin(data.access_token, data.refresh_token, data.user);
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to resend code.");
      startResendCooldown();
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Top Header Bar */}
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

      {/* Background ambient glowing gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg mx-auto my-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">

        {/* ─── STEP 1: Register Form ─────────────────────────────────── */}
        {step === "register" && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30 mb-4 transition-transform hover:scale-105">
                <ShieldCheck className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Create Account</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Sign up to access AI document & image verification</p>
            </div>

            <GoogleAuthButton label="Sign up with Google" />

            <AuthDivider />

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm">
                <span className="text-base mt-0.5">⚠️</span>
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Hariharan K"
                  />
                </div>
              </div>

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
                  id="reg-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  label="Password"
                  autoComplete="new-password"
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div>
                <PasswordInput
                  id="reg-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  label="Confirm Password"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400">
                  I agree to the <span className="text-indigo-600 dark:text-indigo-400 underline font-medium">Terms of Service</span> and <span className="text-indigo-600 dark:text-indigo-400 underline font-medium">Privacy Policy</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Already have an account? </span>
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors">
                Sign in
              </Link>
            </div>
          </>
        )}

        {/* ─── STEP 2: OTP Verification ──────────────────────────────── */}
        {step === "otp" && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check Your Email</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                We sent a 6-digit verification code & magic link to:<br />
                <strong className="text-indigo-600 dark:text-indigo-300 font-semibold">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm">
                <span className="text-base">⚠️</span>
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-extrabold rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white transition-all shadow-inner"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length !== 6}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Verify Code & Login <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="text-center mt-6 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Didn't get the code? Check spam or resend:</p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs transition-colors disabled:text-slate-400"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Verification Code"}
              </button>
            </div>

            <div className="text-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setStep("register");
                  setError("");
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                ← Back to registration
              </button>
            </div>
          </>
        )}

        {/* ─── STEP 3: Success ───────────────────────────────────────── */}
        {step === "success" && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6 animate-bounce border border-emerald-500/30">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Email Verified! 🎉</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Logging you in securely...
            </p>
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

      </div>

      <footer className="text-center py-2 text-xs text-slate-400 dark:text-slate-500 z-20">
        © 2026 VerifyAI Document Platform
      </footer>
    </div>
  );
}
