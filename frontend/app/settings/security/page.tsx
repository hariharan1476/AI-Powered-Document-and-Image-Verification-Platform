"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import AppLayout from "@/src/components/AppLayout";
import { Shield, KeyRound, Smartphone, Laptop, Trash2, LogOut, CheckCircle2, AlertTriangle, LogIn } from "lucide-react";
import { PasswordInput } from "@/src/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/src/components/auth/PasswordStrengthMeter";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SessionItem {
  id: number;
  device_name: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  last_used_at: string;
}

export default function SecuritySettingsPage() {
  const { user, token, logoutAll, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeToken = mounted ? (token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)) : null;

  useEffect(() => {
    if (!activeToken) {
      setSessionsLoading(false);
      return;
    }
    fetchSessions(activeToken);
  }, [activeToken]);

  const fetchSessions = async (authToken: string) => {
    try {
      const res = await fetch(`${API}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!activeToken) {
      setPwError("You must be logged in to change your password.");
      return;
    }

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update password.");

      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`${API}/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      }
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Page Title */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Security & Devices</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {user ? `Managing security settings for ${user.name} (${user.email})` : "Manage your password, active logins, and multi-device sessions"}
            </p>
          </div>
        </div>

        {/* Unauthenticated Prompt */}
        {mounted && !authLoading && !activeToken && (
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <LogIn className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In Required</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
              You must be logged into an account to change your password or manage active device sessions.
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

        {mounted && activeToken && (
          <>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h2>
          </div>

          {pwSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{pwSuccess}</span>
            </div>
          )}

          {pwError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{pwError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <PasswordInput
              id="current-pw"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              label="Current Password"
              placeholder="••••••••"
            />
            <div>
              <PasswordInput
                id="new-pw"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                label="New Password"
                placeholder="Min 8 characters"
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Multi-Device Sessions Card */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Sessions</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Devices currently logged into your account</p>
              </div>
            </div>

            <button
              onClick={logoutAll}
              className="flex items-center gap-2 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-4 h-4" /> Log Out All Devices
            </button>
          </div>

          {sessionsLoading ? (
            <div className="text-center py-6 text-slate-500 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">No active sessions found.</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sessions.map((s) => (
                <div key={s.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                      {s.device_name.toLowerCase().includes("mobile") ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Laptop className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{s.device_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        IP: {s.ip_address || "Unknown"} • Last active: {new Date(s.last_used_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Revoke session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        </>
        )}

      </div>
    </AppLayout>
  );
}
