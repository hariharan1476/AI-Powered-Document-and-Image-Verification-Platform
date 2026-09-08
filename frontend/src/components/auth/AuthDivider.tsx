"use client";

import React from "react";

export function AuthDivider({ text = "OR" }: { text?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium">{text}</span>
      </div>
    </div>
  );
}
