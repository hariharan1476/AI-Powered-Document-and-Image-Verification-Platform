"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================
   TYPES
   ============================================================ */

type DocumentInfo = {
  id?: number;
  filename?: string;
  file_type?: string;
  file_size?: number;
  file_hash?: string;
  status?: string;
};

type AnalysisResult = {
  score?: number;
  status?: string;

  suspicious_indicators?: string[];

  total_fields?: number;
  present_count?: number;
  missing_count?: number;

  present_fields?: string[];
  missing_fields?: string[];

  checked_fields?: string[];
  inconsistent_fields?: string[];

  checks?: string[];

  passed_checks?: number;
  total_checks?: number;
};

type DetailedVerification = {
  completeness?: number;
  consistency?: number;
  authenticity?: number;
  tamper_score?: number;
  overall_score?: number;

  status?: string;
  details?: string[];

  completeness_analysis?: AnalysisResult;
  consistency_analysis?: AnalysisResult;
  authenticity_analysis?: AnalysisResult;
  tamper_analysis?: AnalysisResult;
};

type LayoutLMResult = {
  model?: string;
  model_type?: string;

  page_count?: number;
  sequence_length?: number;
  token_count?: number;
  layout_boxes?: number;
  hidden_size?: number;

  embedding_shape?: number[];

  status?: string;

  layout_analysis?: {
    ocr_enabled?: boolean;
    document_image_processed?: boolean;
    bounding_boxes_processed?: boolean;
    tokens_processed?: number;
  };
};

type ExtractedFields = Record<string, unknown>;

type VerificationResult = {
  document_type?: string;
  classification_confidence?: number;

  fields?: ExtractedFields;

  layoutlm?: LayoutLMResult;

  sections_detected?: Record<string, boolean>;

  verification?: DetailedVerification;
};

type ApiResponse = {
  message?: string;

  document?: DocumentInfo;

  verification?: {
    authenticity_score?: number;
    completeness_score?: number;
    consistency_score?: number;
    overall_score?: number;
  };

  result?: VerificationResult;

  error?: string;
  detail?: string;
};

/* ============================================================
   CONSTANTS
   ============================================================ */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

const ACCEPTED_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

/* ============================================================
   HELPERS
   ============================================================ */

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 KB";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function safeScore(value?: number): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function scoreText(value?: number): string {
  return `${safeScore(value).toFixed(2)}%`;
}

function prettyLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function valueToString(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not detected";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function scoreBarClass(value?: number): string {
  const score = safeScore(value);

  if (score >= 90) {
    return "bg-emerald-500";
  }

  if (score >= 70) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

function statusClass(status?: string): string {
  const normalized =
    String(status || "").toUpperCase();

  if (
    normalized.includes("VERIFIED") ||
    normalized.includes("AUTHENTIC")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized.includes("REJECTED") ||
    normalized.includes("SUSPICIOUS")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

/* ============================================================
   SCORE CARD
   ============================================================ */

function ScoreCard({
  title,
  score,
  description,
}: {
  title: string;
  score?: number;
  description: string;
}) {
  const value = safeScore(score);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-700">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <span className="text-2xl font-black text-slate-900">
          {value.toFixed(2)}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${scoreBarClass(
            value
          )}`}
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-black text-slate-900">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}


/* ============================================================
   DOCUMENT RESULT
   ============================================================ */

type DocumentItem = {
  file: File;
  data?: ApiResponse;
  processing: boolean;
  verified: boolean;
  error?: string;
};

function DocumentResult({
  item,
  index,
  onReport,
}: {
  item: DocumentItem;
  index: number;
  onReport: (item: DocumentItem) => void;
}) {
  const data = item.data;
  const detailedVerification = data?.result?.verification;
  const topLevelVerification = data?.verification;
  const verification = detailedVerification || {};

  const overallScore =
    verification.overall_score ??
    topLevelVerification?.overall_score ??
    0;
  const authenticityScore =
    verification.authenticity ??
    topLevelVerification?.authenticity_score ??
    0;
  const completenessScore =
    verification.completeness ??
    topLevelVerification?.completeness_score ??
    0;
  const consistencyScore =
    verification.consistency ??
    topLevelVerification?.consistency_score ??
    0;
  const tamperScore = verification.tamper_score ?? 0;
  const status =
    verification.status ||
    data?.document?.status ||
    "REVIEW REQUIRED";

  const tamperAnalysis = verification.tamper_analysis;
  const completenessAnalysis = verification.completeness_analysis;
  const consistencyAnalysis = verification.consistency_analysis;
  const authenticityAnalysis = verification.authenticity_analysis;
  const extractedFields = data?.result?.fields || {};
  const sections = data?.result?.sections_detected || {};
  const details = verification.details || [];
  const suspiciousIndicators =
    tamperAnalysis?.suspicious_indicators || [];

  const statusMessage = String(status).toUpperCase().includes("VERIFIED")
    ? "The document has completed the AI verification pipeline."
    : String(status).toUpperCase().includes("REJECTED")
    ? "The document requires rejection or further investigation."
    : "The document requires additional review.";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                DOCUMENT {index + 1}
              </span>
              {data && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              )}
            </div>
            <h3 className="break-words text-2xl font-black text-slate-950">
              {data?.document?.filename || item.file.name}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {formatFileSize(item.file.size)}
              </span>
              {data?.document?.id !== undefined && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  ID #{data.document.id}
                </span>
              )}
              {data?.result?.document_type && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {prettyLabel(data.result.document_type)}
                </span>
              )}
              {data?.result?.classification_confidence !== undefined && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  Classification{" "}
                  {scoreText(data.result.classification_confidence)}
                </span>
              )}
            </div>
          </div>

          {data && (
            <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Overall Score
              </p>
              <p className="mt-1 text-4xl font-black text-slate-950">
                {scoreText(overallScore)}
              </p>
            </div>
          )}
        </div>
      </div>

      {item.processing && (
        <div className="m-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-8 w-8 shrink-0">
              <div className="absolute h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-blue-600" />
            </div>
            <div>
              <p className="font-black text-blue-900">
                AI is processing this document...
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Extracting information and running verification checks.
              </p>
            </div>
          </div>
        </div>
      )}

      {item.error && (
        <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <strong className="font-black">Processing failed:</strong>{" "}
          {item.error}
        </div>
      )}

      {data && !item.processing && (
        <div className="space-y-6 p-6">
          <div
            className={`rounded-2xl border p-5 ${
              String(status).toUpperCase().includes("VERIFIED")
                ? "border-emerald-200 bg-emerald-50"
                : String(status).toUpperCase().includes("REJECTED")
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="font-black text-slate-900">{status}</p>
            <p className="mt-1 text-sm text-slate-600">{statusMessage}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ScoreCard title="Authenticity" score={authenticityScore} description="Basic authenticity checks" />
            <ScoreCard title="Completeness" score={completenessScore} description="Required information present" />
            <ScoreCard title="Consistency" score={consistencyScore} description="Extracted data consistency" />
            <ScoreCard title="Tamper Risk" score={tamperScore} description="Basic tampering indicators" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-600">
                  Overall Verification Score
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Combined result from the verification engine
                </p>
              </div>
              <p className="text-3xl font-black text-slate-950">
                {scoreText(overallScore)}
              </p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${scoreBarClass(overallScore)}`}
                style={{ width: `${safeScore(overallScore)}%` }}
              />
            </div>
          </div>

          <details className="group">
            <summary className="cursor-pointer list-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-900">
              <span className="mr-2 text-blue-600">▾</span>
              Detailed Verification Analysis
              <span className="ml-2 text-xs font-medium text-slate-400">Click to expand</span>
            </summary>

            <div className="mt-5 space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Tamper Analysis"
                  subtitle="Basic tampering indicators returned by the backend"
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Tamper Risk Score
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {scoreText(tamperScore)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 lg:col-span-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Analysis Status
                    </p>
                    <p className="mt-2 font-bold text-slate-800">
                      {tamperAnalysis?.status ||
                        "Tamper analysis information not available."}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <p className="mb-3 text-sm font-black text-slate-800">
                    Suspicious Indicators
                  </p>
                  {suspiciousIndicators.length > 0 ? (
                    <div className="space-y-2">
                      {suspiciousIndicators.map((indicator, i) => (
                        <div
                          key={`${indicator}-${i}`}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                          {indicator}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      No basic tamper indicators detected.
                    </div>
                  )}
                </div>

                {tamperAnalysis?.checks && tamperAnalysis.checks.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-3 text-sm font-black text-slate-800">Checks Performed</p>
                    <div className="space-y-2">
                      {tamperAnalysis.checks.map((check, i) => (
                        <div key={`${check}-${i}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          {check}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Completeness Analysis"
                  subtitle="Fields detected and missing from the document"
                />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">Total Fields</p>
                    <p className="mt-1 text-2xl font-black">
                      {completenessAnalysis?.total_fields ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-600">Present</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      {completenessAnalysis?.present_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-xs text-red-600">Missing</p>
                    <p className="mt-1 text-2xl font-black text-red-700">
                      {completenessAnalysis?.missing_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs text-blue-600">Score</p>
                    <p className="mt-1 text-2xl font-black text-blue-700">
                      {scoreText(
                        completenessAnalysis?.score ?? completenessScore
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm font-black text-slate-800">
                      Present Fields
                    </p>
                    <div className="space-y-2">
                      {(completenessAnalysis?.present_fields || []).length > 0 ? (
                        completenessAnalysis?.present_fields?.map((field, i) => (
                          <div
                            key={`${field}-${i}`}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                          >
                            ✓ {prettyLabel(field)}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">
                          No field information available.
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-black text-slate-800">
                      Missing Fields
                    </p>
                    <div className="space-y-2">
                      {(completenessAnalysis?.missing_fields || []).length > 0 ? (
                        completenessAnalysis?.missing_fields?.map((field, i) => (
                          <div
                            key={`${field}-${i}`}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                          >
                            ✕ {prettyLabel(field)}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          No missing fields detected.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Consistency Analysis"
                  subtitle="Comparison between extracted information and document text"
                />
                <div className="mb-5 rounded-2xl bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Consistency Score
                      </p>
                      <p className="mt-1 text-3xl font-black">
                        {scoreText(
                          consistencyAnalysis?.score ?? consistencyScore
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Checked Fields</p>
                      <p className="mt-1 text-xl font-black">
                        {(consistencyAnalysis?.checked_fields || []).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {(consistencyAnalysis?.checks || []).length > 0 ? (
                    consistencyAnalysis?.checks?.map((check, i) => (
                      <div
                        key={`${check}-${i}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        {check}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No consistency checks returned.
                    </p>
                  )}
                </div>
                {(consistencyAnalysis?.inconsistent_fields || []).length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-sm font-black text-red-700">
                      Inconsistent Fields
                    </p>
                    <div className="space-y-2">
                      {consistencyAnalysis?.inconsistent_fields?.map((field, i) => (
                        <div
                          key={`${field}-${i}`}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                          {prettyLabel(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Authenticity Analysis"
                  subtitle="Basic content and identity/contact checks"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs text-slate-400">Score</p>
                    <p className="mt-1 text-3xl font-black">
                      {scoreText(
                        authenticityAnalysis?.score ?? authenticityScore
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs text-slate-400">Passed Checks</p>
                    <p className="mt-1 text-3xl font-black">
                      {authenticityAnalysis?.passed_checks ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs text-slate-400">Total Checks</p>
                    <p className="mt-1 text-3xl font-black">
                      {authenticityAnalysis?.total_checks ?? 0}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {(authenticityAnalysis?.checks || []).length > 0 ? (
                    authenticityAnalysis?.checks?.map((check, i) => (
                      <div
                        key={`${check}-${i}`}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                      >
                        ✓ {check}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No authenticity checks returned.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </details>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Extracted Information"
              subtitle="Information identified from the uploaded document"
            />
            {Object.keys(extractedFields).length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(extractedFields).map(([field, value]) => (
                  <div
                    key={field}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      {prettyLabel(field)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">
                      {valueToString(value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No extracted fields available.
              </p>
            )}
          </section>

          {String(data?.result?.document_type || "").toUpperCase() === "RESUME" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Sections Detected"
                subtitle="Document sections identified by the verification pipeline"
              />
            {Object.keys(sections).length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(sections).map(([section, detected]) => (
                  <div
                    key={section}
                    className={`rounded-xl border px-4 py-3 ${
                      detected
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-700">
                        {prettyLabel(section)}
                      </span>
                      <span
                        className={`text-xs font-black ${
                          detected ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {detected ? "Detected" : "Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No section information available.
              </p>
              )}
            </section>
          )}

          {data.result?.layoutlm && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Document AI Analysis"
                subtitle="LayoutLM processing information"
              />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Model</p>
                  <p className="mt-1 break-words text-sm font-black">
                    {data.result.layoutlm.model || "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Pages</p>
                  <p className="mt-1 text-2xl font-black">
                    {data.result.layoutlm.page_count ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Tokens</p>
                  <p className="mt-1 text-2xl font-black">
                    {data.result.layoutlm.token_count ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-black text-emerald-700">
                    {data.result.layoutlm.status || "N/A"}
                  </p>
                </div>
              </div>

              {data.result.layoutlm.layout_analysis && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">OCR</p>
                    <p className="mt-1 font-black">
                      {data.result.layoutlm.layout_analysis.ocr_enabled
                        ? "Enabled"
                        : "Not Enabled"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">Image Processing</p>
                    <p className="mt-1 font-black">
                      {data.result.layoutlm.layout_analysis.document_image_processed
                        ? "Processed"
                        : "Not Processed"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">Bounding Boxes</p>
                    <p className="mt-1 font-black">
                      {data.result.layoutlm.layout_analysis.bounding_boxes_processed
                        ? "Processed"
                        : "Not Processed"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">Processed Tokens</p>
                    <p className="mt-1 font-black">
                      {data.result.layoutlm.layout_analysis.tokens_processed ?? 0}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Verification Evidence"
              subtitle="Detailed messages returned by the verification engine"
            />
            {details.length > 0 ? (
              <div className="space-y-2">
                {details.map((detail, i) => {
                  const lower = detail.toLowerCase();
                  const positive =
                    lower.includes("consistent") ||
                    lower.includes("detected") ||
                    lower.includes("contains") ||
                    lower.includes("no basic tamper");
                  return (
                    <div
                      key={`${detail}-${i}`}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        positive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {positive ? "✓" : "•"} {detail}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No additional verification details returned.
              </p>
            )}
          </section>

          <div className="flex justify-end border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => onReport(item)}
              disabled={!data.document?.id}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Download Verification Report
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ============================================================
   MAIN
   ============================================================ */

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  function validateFile(file: File): string | null {
    if (!file) return "Please select a file.";
    if (file.size === 0) return "The selected file is empty.";
    if (file.size > MAX_FILE_SIZE) return "File size must be 25 MB or less.";

    const extension =
      "." + (file.name.split(".").pop()?.toLowerCase() || "");

    const validExtension = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".bmp",
      ".tif",
      ".tiff",
    ].includes(extension);

    const validMime =
      !file.type || ACCEPTED_TYPES.includes(file.type);

    if (!validExtension || !validMime) {
      return "Unsupported file type. Please upload PDF, JPG, JPEG, PNG, WEBP, BMP, or TIFF.";
    }

    return null;
  }

  function addFiles(fileList: FileList | File[]) {
    setError("");

    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const next: DocumentItem[] = [];
    for (const file of incoming) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        continue;
      }

      const duplicate = documents.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified
      );

      const duplicateInBatch = next.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified
      );

      if (!duplicate && !duplicateInBatch) {
        next.push({
          file,
          processing: false,
          verified: false,
        });
      }
    }

    if (next.length) {
      setDocuments((current) => [...current, ...next]);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeDocument(index: number) {
    if (processing) return;
    setDocuments((current) => current.filter((_, i) => i !== index));
    setError("");
  }

  function clearAll() {
    if (processing) return;
    setDocuments([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function processOne(
    item: DocumentItem,
    index: number
  ): Promise<ApiResponse> {
    setDocuments((current) =>
      current.map((doc, i) =>
        i === index
          ? { ...doc, processing: true, error: undefined }
          : doc
      )
    );

    const formData = new FormData();
    formData.append("file", item.file);

    const response = await fetch(`${API_BASE_URL}/api/upload/`, {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();

    let responseData: ApiResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      throw new Error(
        responseText || `Verification failed with status ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          responseData.detail ||
          "Document verification failed."
      );
    }

    setDocuments((current) =>
      current.map((doc, i) =>
        i === index
          ? {
              ...doc,
              data: responseData,
              processing: false,
              verified: true,
              error: undefined,
            }
          : doc
      )
    );

    return responseData;
  }

  async function verifyDocuments() {
    if (!documents.length) {
      setError("Please select at least one document first.");
      return;
    }

    setProcessing(true);
    setError("");

    // Process sequentially so 2–3 documents do not overload the backend.
    for (let i = 0; i < documents.length; i += 1) {
      try {
        await processOne(documents[i], i);
      } catch (verificationError) {
        const message =
          verificationError instanceof Error
            ? verificationError.message
            : "Unable to verify document.";

        setDocuments((current) =>
          current.map((doc, docIndex) =>
            docIndex === i
              ? { ...doc, processing: false, verified: false, error: message }
              : doc
          )
        );
      }
    }

    setProcessing(false);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  }

  async function downloadReport(item: DocumentItem) {
    const data = item.data;
    const documentInfo = data?.document;
    const verification = data?.result?.verification;

    if (!data || !documentInfo) {
      setError("No processed document is available for this report.");
      return;
    }

    try {
      setError("");

      const filename =
        documentInfo.filename
          ?.replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "_") ||
        "verification";

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 18;

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("AI Document Verification Report", 14, y);
      y += 9;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("AI-Powered Document & Image Verification Platform", 14, y);
      y += 10;
      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Document Information", 14, y);
      y += 6;

      autoTable(pdf, {
        startY: y,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fontStyle: "bold" },
        head: [["Field", "Value"]],
        body: [
          ["Filename", documentInfo.filename || "N/A"],
          ["Document ID", String(documentInfo.id ?? "N/A")],
          ["File Type", documentInfo.file_type || "N/A"],
          ["File Size", formatFileSize(documentInfo.file_size)],
          ["Status", documentInfo.status || verification?.status || "N/A"],
          ["Document Type", data.result?.document_type || "N/A"],
          [
            "Classification Confidence",
            scoreText(data.result?.classification_confidence),
          ],
        ],
      });

      y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 45;
      y += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Verification Scores", 14, y);
      y += 6;

      autoTable(pdf, {
        startY: y,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fontStyle: "bold" },
        head: [["Check", "Score"]],
        body: [
          ["Authenticity", scoreText(verification?.authenticity ?? data.verification?.authenticity_score)],
          ["Completeness", scoreText(verification?.completeness ?? data.verification?.completeness_score)],
          ["Consistency", scoreText(verification?.consistency ?? data.verification?.consistency_score)],
          ["Tamper Risk", scoreText(verification?.tamper_score)],
          ["Overall Score", scoreText(verification?.overall_score ?? data.verification?.overall_score)],
        ],
      });

      y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
      y += 10;

      const addSection = (title: string) => {
        if (y > 260) {
          pdf.addPage();
          y = 18;
        }
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, 14, y);
        y += 6;
      };

      const addTextRows = (rows: Array<[string, string]>) => {
        autoTable(pdf, {
          startY: y,
          theme: "grid",
          styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
          headStyles: { fontStyle: "bold" },
          head: [["Field", "Value"]],
          body: rows,
          columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: pageWidth - 80 } },
        });
        y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
        y += 8;
      };

      addSection("Extracted Information");
      const fieldRows = Object.entries(data.result?.fields || {}).map(
        ([field, value]) => [prettyLabel(field), valueToString(value)] as [string, string]
      );
      addTextRows(
        fieldRows.length > 0 ? fieldRows : [["Information", "No extracted fields available."]]
      );

      addSection("Sections Detected");
      const sectionRows = Object.entries(data.result?.sections_detected || {}).map(
        ([section, detected]) => [prettyLabel(section), detected ? "Detected" : "Missing"] as [string, string]
      );
      addTextRows(
        sectionRows.length > 0 ? sectionRows : [["Sections", "No section information available."]]
      );

      addSection("Verification Evidence");
      const details = verification?.details || [];
      addTextRows(
        details.length > 0
          ? details.map((detail, index) => [`Evidence ${index + 1}`, detail])
          : [["Evidence", "No additional verification details returned."]]
      );

      addSection("Tamper Analysis");
      addTextRows([
        ["Tamper Risk Score", scoreText(verification?.tamper_score)],
        ["Analysis Status", verification?.tamper_analysis?.status || "N/A"],
        [
          "Suspicious Indicators",
          verification?.tamper_analysis?.suspicious_indicators?.length
            ? verification.tamper_analysis.suspicious_indicators.join("; ")
            : "No basic tamper indicators detected.",
        ],
      ]);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(110, 110, 110);
      pdf.text(
        `Generated by AI Document Verification Platform | Document #${documentInfo.id ?? "N/A"}`,
        14,
        pdf.internal.pageSize.getHeight() - 10
      );

      pdf.save(`${filename}_verification_report.pdf`);
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Unable to generate verification report."
      );
    }
  }

  const verifiedCount = documents.filter((item) => item.verified).length;
  const averageScore =
    verifiedCount > 0
      ? documents
          .filter((item) => item.verified)
          .reduce((sum, item) => {
            const value =
              item.data?.result?.verification?.overall_score ??
              item.data?.verification?.overall_score ??
              0;
            return sum + safeScore(value);
          }, 0) / verifiedCount
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              AI Document Verification
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              AI-powered document & image verification platform
            </p>
          </div>
          <div className="hidden rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 sm:block">
            AI-ASSISTED VERIFICATION
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
            Document Intelligence
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Verify your documents
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Select one or more documents, then run the AI extraction and
            verification pipeline on each. Every document gets its own
            extraction details and verification result. Documents are processed
            sequentially — no artificial limit on file count.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <strong className="font-bold">Error:</strong> {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Select Documents"
            subtitle="Drag and drop files or click to browse — PDF, JPG, PNG supported"
          />

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            onClick={() => {
              if (!processing) {
                inputRef.current?.click();
              }
            }}
            className={`group flex min-h-[250px] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 text-center transition-all duration-300 ${
              processing
                ? "cursor-not-allowed border-slate-200 bg-slate-50"
                : dragActive
                ? "scale-[1.01] cursor-pointer border-blue-500 bg-blue-50 shadow-lg"
                : "cursor-pointer border-blue-300 bg-blue-50/40 hover:border-blue-500 hover:bg-blue-50"
            }`}
          >
            <div
              className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-blue-600 ${
                dragActive ? "scale-110" : "group-hover:scale-105"
              }`}
            >
              ↑
            </div>

            <>
                <p className="text-lg font-black text-slate-900">
                  Select or drop your documents
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Choose any number of PDF or image files
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  PDF, JPG, JPEG, PNG, WEBP, BMP, TIFF • Maximum 25 MB each
                </p>
              </>
          </div>

          {documents.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {documents.map((item, index) => (
                <div
                  key={`${item.file.name}-${item.file.lastModified}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-black text-blue-700">
                      {index + 1}
                    </span>
                    {!processing && (
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-xs font-black text-slate-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-3 break-words text-sm font-black text-slate-900">
                    {item.file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(item.file.size)}
                  </p>
                  <div className="mt-3">
                    {item.processing ? (
                      <span className="text-xs font-black text-blue-600">
                        Processing...
                      </span>
                    ) : item.verified ? (
                      <span className="text-xs font-black text-emerald-600">
                        Verified ✓
                      </span>
                    ) : item.error ? (
                      <span className="text-xs font-black text-red-600">
                        Failed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={verifyDocuments}
              disabled={!documents.length || processing}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {processing
                ? `Verifying ${documents.length} document${
                    documents.length > 1 ? "s" : ""
                  }...`
                : verifiedCount === documents.length && documents.length > 0
                ? "Verification Complete ✓"
                : `Verify ${
                    documents.length || ""
                  } Document${documents.length === 1 ? "" : "s"}`}
            </button>

            <button
              type="button"
              onClick={clearAll}
              disabled={processing || !documents.length}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Clear All
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="font-bold text-slate-500">
              {documents.length} document{documents.length === 1 ? "" : "s"} selected
            </span>
            {verifiedCount > 0 && (
              <span className="font-black text-emerald-600">
                {verifiedCount}/{documents.length} verified
                {verifiedCount > 1 && ` • Average ${averageScore.toFixed(2)}%`}
              </span>
            )}
          </div>
        </section>

        {documents.some((item) => item.data || item.error) && (
          <section ref={resultRef} className="mt-10 scroll-mt-28">
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">
                  Verification Results
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  All selected documents
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Each document below uses the same extraction and verification
                  response structure.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs font-bold text-slate-400">Documents</p>
                  <p className="mt-1 text-xl font-black">{documents.length}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
                  <p className="text-xs font-bold text-emerald-600">Verified</p>
                  <p className="mt-1 text-xl font-black text-emerald-700">
                    {verifiedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {documents.map((item, index) => (
                <DocumentResult
                  key={`${item.file.name}-${item.file.lastModified}-${index}`}
                  item={item}
                  index={index}
                  onReport={downloadReport}
                />
              ))}
            </div>
          </section>
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-bold text-slate-500">
            AI-Powered Document &amp; Image Verification Platform
          </p>
          <p className="mt-3 text-center text-xs leading-5 text-slate-400">
            Privacy notice: Uploaded documents are temporarily processed for verification.
            Original files are not permanently stored. Verification results and necessary
            metadata may be retained for application purposes. This platform provides
            AI-assisted verification scores — it does not constitute legal or forensic proof.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
