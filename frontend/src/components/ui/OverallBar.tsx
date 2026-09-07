import React from "react";
import { safeScore, scoreClass, scoreText } from "../../lib/utils";

export function OverallBar({ value }: { value: unknown }) {
  const cls = scoreClass(value);
  const pct = safeScore(value);
  
  const colorMap = {
    good: { bg: "bg-green-500", text: "text-green-600", lightBg: "bg-green-100" },
    warning: { bg: "bg-yellow-500", text: "text-yellow-600", lightBg: "bg-yellow-100" },
    danger: { bg: "bg-red-500", text: "text-red-600", lightBg: "bg-red-100" },
    unknown: { bg: "bg-slate-300", text: "text-slate-500", lightBg: "bg-slate-100" }
  };
  
  const colors = colorMap[cls as keyof typeof colorMap] || colorMap.unknown;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 leading-none">Overall Score</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Weighted across all checks</p>
        </div>
        <div className={`text-4xl font-black ${colors.text} tracking-tighter leading-none drop-shadow-sm`}>
          {scoreText(value)}
        </div>
      </div>
      <div className={`h-4 w-full ${colors.lightBg} rounded-full overflow-hidden shadow-inner`}>
        <div
          className={`h-full ${colors.bg} rounded-full transition-all duration-1000 ease-out shadow-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
