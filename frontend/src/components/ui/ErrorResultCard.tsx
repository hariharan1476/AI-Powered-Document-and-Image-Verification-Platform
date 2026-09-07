import React from "react";
import { XCircle } from "lucide-react";

export function ErrorResultCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-4 p-6 bg-red-50 rounded-2xl border border-red-200 shadow-sm animate-fade-in-up">
      <div className="shrink-0 p-2 bg-red-100 text-red-600 rounded-full">
        <XCircle size={24} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-red-900 mb-1">Verification Failed</h3>
        <p className="text-red-700 font-medium text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
