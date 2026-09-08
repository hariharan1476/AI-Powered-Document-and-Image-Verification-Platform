"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";
import {
  FileCheck,
  History,
  Lock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
  X,
  Menu,
  ShieldCheck,
  Home
} from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, token, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeToken = mounted ? (token || localStorage.getItem("token")) : null;

  const navLinks = [
    {
      name: "Home / Overview",
      href: "/",
      icon: Home,
      exact: true
    },
    {
      name: "Verify Document",
      href: "/dashboard",
      icon: FileCheck,
      exact: false
    },
    {
      name: "Verification History",
      href: "/history",
      icon: History,
      exact: false
    },
    {
      name: "Security & Devices",
      href: "/settings/security",
      icon: Lock,
      exact: false
    },
  ];

  if (mounted && user?.is_admin) {
    navLinks.push({
      name: "Admin Portal",
      href: "/admin",
      icon: ShieldAlert,
      exact: false
    });
  }

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link
            href="/"
            onClick={onMobileClose}
            className="flex items-center gap-3 group focus:outline-none overflow-hidden"
          >
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base leading-tight tracking-tight">
                  VerifyAI
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Workspace
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.href, link.exact);
            const isAdminLink = link.href === "/admin";

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all group ${
                  active
                    ? isAdminLink
                      ? "bg-amber-600/90 text-white shadow-lg shadow-amber-600/20"
                      : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : isAdminLink
                    ? "text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300 border border-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                }`}
                title={collapsed ? link.name : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  active ? "text-white" : isAdminLink ? "text-amber-400" : "text-slate-400 group-hover:text-white"
                }`} />

                {!collapsed && (
                  <span className="truncate">{link.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Account & Footer Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-3">
          {mounted && !isLoading && activeToken && user ? (
            <div className={`p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 ${collapsed ? "flex-col" : ""}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-extrabold text-sm shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                {!collapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-white truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            !collapsed && (
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center">
                <Link
                  href="/login"
                  onClick={onMobileClose}
                  className="block py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/30"
                >
                  Sign In to Account
                </Link>
              </div>
            )
          )}

          {/* Theme Toggle & Collapse Footer */}
          <div className="flex items-center justify-between px-2 pt-1">
            {!collapsed && (
              <span className="text-[11px] font-semibold text-slate-400">Theme</span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
