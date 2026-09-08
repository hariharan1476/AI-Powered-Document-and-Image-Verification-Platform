"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse" />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      aria-label="Toggle Theme"
      className="p-2 rounded-xl border transition-all duration-300 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-500 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
