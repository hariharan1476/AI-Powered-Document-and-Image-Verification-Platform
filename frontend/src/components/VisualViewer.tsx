import React, { useState } from "react";
import { Eye, LayoutTemplate, ScanLine } from "lucide-react";

export function VisualViewer({ 
  imageUrl, 
  boundingBoxes, 
  elaImageUrl 
}: { 
  imageUrl?: string, 
  boundingBoxes?: number[][],
  elaImageUrl?: string
}) {
  const [mode, setMode] = useState<"layout"|"ela">("layout");
  
  if (!imageUrl && !elaImageUrl) return null;
  
  return (
    <div className="mt-6 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-200 bg-white">
        <strong className="flex items-center gap-2 text-slate-800">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Eye size={18} />
          </div>
          Visual Analysis
        </strong>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {imageUrl && boundingBoxes && boundingBoxes.length > 0 && (
            <button 
              onClick={() => setMode("layout")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === "layout" 
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <LayoutTemplate size={14} /> Layout Bounding Boxes
            </button>
          )}
          {elaImageUrl && (
            <button 
              onClick={() => setMode("ela")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === "ela" 
                  ? "bg-red-50 text-red-700 shadow-sm border border-red-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <ScanLine size={14} /> ELA Forgery Map
            </button>
          )}
        </div>
      </div>
      
      <div className="relative w-full bg-slate-200/50 flex justify-center p-4 md:p-8 min-h-[300px]">
        {mode === "layout" && imageUrl && (
          <div className="relative inline-block max-w-full">
            <img 
              src={imageUrl} 
              alt="Document Layout" 
              className="block max-w-full max-h-[600px] object-contain rounded-lg shadow-lg border border-slate-200 bg-white" 
            />
            {boundingBoxes && boundingBoxes.map((box, i) => {
              // box is [x1, y1, x2, y2] in 0-1000 scale
              const [x1, y1, x2, y2] = box;
              const left = (x1 / 10) + "%";
              const top = (y1 / 10) + "%";
              const width = ((x2 - x1) / 10) + "%";
              const height = ((y2 - y1) / 10) + "%";
              return (
                <div 
                  key={i}
                  className="absolute pointer-events-none border-2 border-blue-500/60 bg-blue-500/10 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.3)] transition-all duration-300 hover:bg-blue-500/30"
                  style={{ left, top, width, height }}
                />
              );
            })}
          </div>
        )}
        
        {mode === "ela" && elaImageUrl && (
          <div className="relative inline-block max-w-full">
            <img 
              src={elaImageUrl} 
              alt="ELA Analysis" 
              className="block max-w-full max-h-[600px] object-contain rounded-lg shadow-lg border border-slate-200 bg-[#1a1a1a]" 
            />
            <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-slate-900/80 text-white p-3 md:px-4 md:py-2.5 rounded-xl text-xs font-medium backdrop-blur-md border border-white/10 shadow-xl">
              <span className="text-red-400 font-bold mr-1">⚠</span> Brighter areas indicate higher error levels (potential manipulation)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
