import React from "react";
import { safeScore, scoreClass, scoreText } from "../../lib/utils";

export function ScoreCard({
  title,
  value,
  delay,
}: {
  title: string;
  value: unknown;
  delay: number;
}) {
  const cls = scoreClass(value);
  const pct = safeScore(value);
  
  // Tailwind color mappings based on scoreClass output (good, warning, danger, unknown)
  const colorMap = {
    good: { bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-500/30", text: "text-green-700 dark:text-green-400", fill: "bg-green-500" },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-500/10", border: "border-yellow-200 dark:border-yellow-500/30", text: "text-yellow-700 dark:text-yellow-400", fill: "bg-yellow-500" },
    danger: { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-400", fill: "bg-red-500" },
    unknown: { bg: "bg-slate-50 dark:bg-slate-950", border: "border-slate-200 dark:border-slate-800", text: "text-slate-500 dark:text-slate-400", fill: "bg-slate-400" }
  };
  
  const colors = colorMap[cls as keyof typeof colorMap] || colorMap.unknown;

  return (
    <div className={`p-4 rounded-2xl border ${colors.border} ${colors.bg} animate-fade-in-up`} style={{ animationDelay: `${delay * 0.1}s` }}>
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{title}</div>
      <div className={`text-3xl font-black ${colors.text} mb-3 tracking-tight`}>{scoreText(value)}</div>
      <div className="h-2 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden border border-white/50 dark:border-slate-700 shadow-inner">
        <div
          className={`h-full ${colors.fill} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
