"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import AppLayout from "@/src/components/AppLayout";
import { History, FileText, AlertTriangle, ShieldCheck, Clock, ExternalLink, RefreshCw, LogIn } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface HistoryItem {
  document_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  cloudinary_url?: string;
  uploaded_at: string;
  status: string;
  verification?: {
    id: number;
    authenticity_score: number;
    completeness_score: number;
    consistency_score: number;
    overall_score: number;
    result: any;
    verified_at: string;
  };
}

export default function HistoryPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHistory = useCallback(async () => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (!activeToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/verification/history`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load history.");
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (mounted && !authLoading) {
      const storedToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      if (!storedToken) {
        setLoading(false);
      } else {
        fetchHistory();
      }
    }
  }, [mounted, authLoading, token, fetchHistory]);

  const storedToken = mounted ? (token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)) : null;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <History className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Verification History</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {user ? `Showing document history for ${user.name} (${user.email})` : "View your past document scans and AI analysis"}
              </p>
            </div>
          </div>

          {storedToken && (
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all self-start md:self-auto shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
        </div>

        {/* Unauthenticated State */}
        {!authLoading && !storedToken && (
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <LogIn className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to View Your History</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
              Each user's verification history is private and isolated. Please log into your account to view your past document verifications.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30"
              >
                Sign In to Account →
              </Link>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content */}
        {storedToken && (loading || authLoading) ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your verification history...</p>
          </div>
        ) : storedToken && history.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Verifications Yet</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
              You haven't uploaded or verified any documents under your account yet. Upload a document on the workspace page to see your AI verification report here!
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 mt-2"
            >
              Verify Your First Document →
            </Link>
          </div>
        ) : storedToken && history.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {history.map((item) => {
              const v = item.verification;
              const overallScore = v?.overall_score ?? 0;
              const isAuthentic = overallScore >= 75;

              return (
                <div
                  key={item.document_id}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 md:p-6 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* File Info */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                          {item.filename}
                          {item.cloudinary_url && (
                            <a
                              href={item.cloudinary_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="View uploaded document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="uppercase">{item.file_type}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    {v && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                            isAuthentic
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <ShieldCheck className="w-5 h-5" />
                          <div>
                            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                              {isAuthentic ? "VERIFIED AUTHENTIC" : "HIGH RISK / FORGED"}
                            </div>
                            <div className="text-base font-extrabold">{overallScore}% Score</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score Breakdown Bar */}
                  {v && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Authenticity:</span>{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">{v.authenticity_score}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Completeness:</span>{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">{v.completeness_score}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Consistency:</span>{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">{v.consistency_score}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

      </div>
    </AppLayout>
  );
}
