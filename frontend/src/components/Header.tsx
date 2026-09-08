"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";
import { Menu, ShieldCheck, LogIn, UserPlus, LogOut } from "lucide-react";

interface HeaderProps {
  onMobileMenuOpen?: () => void;
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const { user, token, logout, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeToken = mounted ? (token || localStorage.getItem("token")) : null;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Menu Trigger & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 rounded-xl transition-all"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shadow-lg shadow-indigo-600/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base leading-tight tracking-tight">
                VerifyAI
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium hidden sm:inline">
                Document Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Theme Toggle & User Auth Pill */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

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
    </header>
  );
}
