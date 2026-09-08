"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";
import {
  ShieldCheck,
  FileCheck,
  Zap,
  Lock,
  Eye,
  FileSearch,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Cpu,
  Globe,
  Layers,
  HelpCircle,
  ChevronDown,
  LogIn,
  UserPlus,
  History
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, token, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeToken = mounted ? (token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)) : null;

  const faqs = [
    {
      q: "How does the AI verification engine detect document tampering?",
      a: "Our engine performs multi-pass Error Level Analysis (ELA) to calculate JPEG re-save pixel variances, inspects EXIF metadata for image manipulation software traces, and evaluates document layout structural uniformity using computer vision algorithms."
    },
    {
      q: "What file formats are supported for document analysis?",
      a: "VerifyAI supports PDF documents, PNG, JPG, JPEG, WEBP, BMP, and TIFF files up to 25 MB in size."
    },
    {
      q: "Is my document data secure and private?",
      a: "Yes. All uploads are encrypted in transit and stored in secure Cloudinary CDN storage. Database records enforce strict tenant isolation (Document.user_id == current_user.id), ensuring your history is accessible only to you."
    },
    {
      q: "Can I try document verification without an enterprise plan?",
      a: "Absolutely! You can register a free account in seconds and immediately test document extraction, authenticity scoring, and report generation."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Landing Page Top Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shadow-lg shadow-indigo-600/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-lg leading-tight tracking-tight">
                VerifyAI
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Document Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {mounted && !isLoading && activeToken && user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : mounted && !isLoading ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 rounded-xl transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Free</span>
                </Link>
              </div>
            ) : null}
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation AI Document Authenticity & Fraud Detection</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Verify Any Document in Seconds with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI Precision</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
            Automate authenticity verification, Error Level Analysis (ELA) tamper detection, OCR layout parsing, and document scoring with bank-grade security.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {mounted && activeToken ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Open Verification Workspace</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Free Verification</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold rounded-2xl text-base transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5 text-indigo-400" />
                  <span>Sign In to Account</span>
                </Link>
              </>
            )}
          </div>

          {/* Key Metric Highlights */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center">
              <div className="text-2xl font-extrabold text-white">99.8%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Tamper Accuracy</div>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center">
              <div className="text-2xl font-extrabold text-indigo-400">&lt; 3.0s</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Analysis Latency</div>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center">
              <div className="text-2xl font-extrabold text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Tenant Data Scoping</div>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center">
              <div className="text-2xl font-extrabold text-amber-400">Argon2id</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Crypto Standard</div>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-white">
              Enterprise Document Verification Capabilities
            </h2>
            <p className="text-slate-400 text-sm">
              Our multi-layered AI architecture combines visual tamper detection with structural layout analysis and cryptographic security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Error Level Analysis (ELA)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Calculates localized JPEG compression delta variances to detect digital forgery, edited text, copy-paste alterations, and tampered visual elements.
              </p>
            </div>

            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Real-Time SSE Progress</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Streams live document parsing progress and worker log output directly to client browsers using HTTP Server-Sent Events without polling.
              </p>
            </div>

            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Multi-Device Security</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tracks active device logins, IP addresses, and user-agent details. Revoke any session instantly with one-click 'Logout All Devices'.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* How It Works Workflow Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white">
            How It Works in 3 Simple Steps
          </h2>
          <p className="text-slate-400 text-sm">
            Simple, automated document validation designed for seamless integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 relative">
            <div className="w-8 h-8 bg-indigo-600 text-white font-extrabold rounded-xl flex items-center justify-center text-sm">
              1
            </div>
            <h4 className="text-lg font-bold text-white">Upload Document</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Drag & drop any PDF, PNG, JPG, or JPEG file up to 25 MB into the verification workspace.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 relative">
            <div className="w-8 h-8 bg-indigo-600 text-white font-extrabold rounded-xl flex items-center justify-center text-sm">
              2
            </div>
            <h4 className="text-lg font-bold text-white">AI Analyzes & Scores</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Background AI workers process ELA noise deltas, metadata tampering, and layout completeness.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 relative">
            <div className="w-8 h-8 bg-indigo-600 text-white font-extrabold rounded-xl flex items-center justify-center text-sm">
              3
            </div>
            <h4 className="text-lg font-bold text-white">Get Verified Report</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Receive a detailed breakdown score for Authenticity, Completeness, and Overall Integrity with downloadable PDF reports.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-16 bg-slate-900/30 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-sm">Everything you need to know about the platform.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-white flex items-center justify-between gap-4 text-sm sm:text-base hover:text-indigo-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180 text-indigo-400" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-slate-400 text-xs sm:text-sm leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-400">VerifyAI Platform</span>
            <span>• © 2026 All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Workspace</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
