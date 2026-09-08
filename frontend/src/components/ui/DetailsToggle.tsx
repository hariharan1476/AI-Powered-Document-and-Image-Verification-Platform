import React from "react";
import { ChevronDown, Beaker } from "lucide-react";

export function DetailsToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex justify-center mt-8 mb-4">
      <button
        type="button"
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-sm transition-all border border-indigo-100 dark:border-indigo-500/30 shadow-sm active:scale-95 group"
        onClick={onToggle}
      >
        <Beaker size={16} />
        <span>{open ? "Hide" : "View"} Detailed Analysis</span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} 
        />
      </button>
    </div>
  );
}
