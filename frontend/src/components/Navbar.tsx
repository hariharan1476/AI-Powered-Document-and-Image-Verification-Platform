"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  ShieldCheck,
  History,
  Lock,
  UserCheck,
  LogOut,
  LogIn,
  UserPlus,
  FileCheck,
  ShieldAlert
} from "lucide-react";

export default function Navbar() {
  const { user, token, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by waiting for mount
  const activeToken = mounted ? (token || localStorage.getItem("token")) : null;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none"
        >
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

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-semibold">
          <Link
            href="/"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              pathname === "/"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Verify Document</span>
          </Link>

          <Link
            href="/history"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              pathname === "/history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>

          <Link
            href="/settings/security"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              pathname.startsWith("/settings/security")
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security Settings</span>
          </Link>

          {mounted && user?.is_admin && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                pathname === "/admin"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          {mounted && !isLoading && activeToken && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-extrabold text-sm shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <button
                onClick={logout}
                title="Sign out of account"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : mounted && !isLoading && !activeToken ? (
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
                <span>Register</span>
              </Link>
            </div>
          ) : (
            <div className="w-24 h-8 bg-slate-900 animate-pulse rounded-xl" />
          )}
        </div>

      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 border-t border-slate-900 py-2 px-2 text-xs font-semibold">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl ${
            pathname === "/" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span className="text-[10px]">Verify</span>
        </Link>
        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl ${
            pathname === "/history" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px]">History</span>
        </Link>
        <Link
          href="/settings/security"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl ${
            pathname.startsWith("/settings/security") ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span className="text-[10px]">Security</span>
        </Link>
        {mounted && user?.is_admin && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl ${
              pathname === "/admin" ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[10px]">Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
