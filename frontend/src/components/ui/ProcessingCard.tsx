import React from "react";
import { Loader2 } from "lucide-react";

export function ProcessingCard({ name, logs = [], progress = 0 }: { name: string; logs?: string[]; progress?: number }) {
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : "Initializing pipeline...";
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-blue-100 shadow-sm min-h-[300px]">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center relative z-10 border border-blue-100 shadow-inner">
          <Loader2 size={32} className="animate-spin" />
        </div>
      </div>
      
      <div className="w-full max-w-md text-center">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Document</h3>
        <p className="text-slate-500 font-medium mb-6 truncate" title={name}>{name}</p>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        
        <div className="text-xs font-semibold text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-lg border border-slate-100 truncate">
          &gt; {latestLog}
        </div>
      </div>
    </div>
  );
}
