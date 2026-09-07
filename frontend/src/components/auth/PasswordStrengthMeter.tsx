"use client";

import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  let strengthLabel = "Weak";
  let barColor = "bg-rose-500";
  let textColor = "text-rose-400";

  if (score === 5) {
    strengthLabel = "Strong";
    barColor = "bg-emerald-500";
    textColor = "text-emerald-400";
  } else if (score >= 3) {
    strengthLabel = "Fair";
    barColor = "bg-amber-500";
    textColor = "text-amber-400";
  } else if (score >= 2) {
    strengthLabel = "Weak";
    barColor = "bg-orange-500";
    textColor = "text-orange-400";
  }

  const percentage = (score / 5) * 100;

  return (
    <div className="mt-2.5 space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Password strength:</span>
        <span className={`font-semibold ${textColor}`}>{strengthLabel}</span>
      </div>

      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <ReqItem met={hasMinLength} text="At least 8 characters" />
        <ReqItem met={hasUppercase} text="Uppercase letter" />
        <ReqItem met={hasLowercase} text="Lowercase letter" />
        <ReqItem met={hasNumber} text="Number (0-9)" />
        <ReqItem met={hasSpecial} text="Special character" />
      </div>
    </div>
  );
}

function ReqItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${met ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
      {met ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      <span>{text}</span>
    </div>
  );
}
