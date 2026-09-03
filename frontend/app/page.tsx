"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================
   CONSTANTS
   ============================================================ */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

const ACCEPTED_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff";

/* ============================================================
   TYPES
   ============================================================ */

interface ApiResponse {
  message?: string;
  error?: string;
  detail?: string;
  document?: {
    id?: number;
    filename?: string;
    file_type?: string;
    file_size?: number;
    file_hash?: string;
    status?: string;
    cloudinary_url?: string;
  };
  verification?: {
    authenticity_score?: number;
    completeness_score?: number;
    consistency_score?: number;
    overall_score?: number;
    status?: string;
  };
  result?: {
    document_type?: string;
    classification_confidence?: number;
    fields?: Record<string, unknown>;
    sections_detected?: Record<string, boolean>;
    layoutlm?: {
      model?: string;
      page_count?: number;
      token_count?: number;
      status?: string;
      layout_analysis?: {
        ocr_enabled?: boolean;
        document_image_processed?: boolean;
        bounding_boxes_processed?: boolean;
        tokens_processed?: number;
      };
    };
    verification?: {
      completeness?: number;
      consistency?: number;
      authenticity?: number;
      tamper_score?: number;
      overall_score?: number;
      status?: string;
      message?: string;
      details?: string[];
      completeness_analysis?: {
        score?: number;
        present_fields?: string[];
        missing_fields?: string[];
        total_fields?: number;
        present_count?: number;
      };
      consistency_analysis?: {
        score?: number;
        checked_fields?: string[];
        inconsistent_fields?: string[];
        checks?: string[];
      };
      authenticity_analysis?: {
        score?: number;
        passed_checks?: number;
        total_checks?: number;
        checks?: string[];
      };
      tamper_analysis?: {
        score?: number;
        status?: string;
        suspicious_indicators?: string[];
      };
    };
  };
}

interface DocumentItem {
  file: File;
  processing: boolean;
  verified: boolean;
  data?: ApiResponse;
  error?: string;
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function safeScore(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
}

function scoreText(v: unknown): string {
  const n = safeScore(v);
  return n > 0 ? `${n.toFixed(2)}%` : "N/A";
}

function scoreClass(v: unknown): "good" | "medium" | "poor" {
  const n = safeScore(v);
  if (n >= 70) return "good";
  if (n >= 40) return "medium";
  return "poor";
}

function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function valueToString(val: unknown): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function resolveStatus(data: ApiResponse): string {
  return (
    data?.result?.verification?.status ||
    data?.document?.status ||
    data?.verification?.status ||
    ""
  ).toUpperCase();
}

function statusClass(status: string): "verified" | "review" | "rejected" {
  if (status.includes("VERIFIED")) return "verified";
  if (status.includes("REVIEW") || status.includes("DETECTED")) return "review";
  return "rejected";
}

function statusEmoji(cls: "verified" | "review" | "rejected"): string {
  if (cls === "verified") return "✓";
  if (cls === "review") return "⚠";
  return "✕";
}

function statusLabel(cls: "verified" | "review" | "rejected", raw: string): string {
  if (raw) return raw;
  if (cls === "verified") return "VERIFIED";
  if (cls === "review") return "REVIEW REQUIRED";
  return "REJECTED";
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function ProcessingCard({ name }: { name: string }) {
  return (
    <div className="processing-card">
      <div className="spinner" />
      <div className="processing-text">
        <strong>Analysing Document</strong>
        <p>{name} — AI pipeline running…</p>
      </div>
    </div>
  );
}

function ErrorResultCard({ message }: { message: string }) {
  return (
    <div className="error-card">
      <span className="error-icon">✕</span>
      <div>
        <strong>Verification Failed</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function ScoreCard({
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
  return (
    <div className={`score-card delay-${delay}`}>
      <div className="score-card-title">{title}</div>
      <div className={`score-card-val ${cls}`}>{scoreText(value)}</div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${cls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OverallBar({ value }: { value: unknown }) {
  const cls = scoreClass(value);
  const pct = safeScore(value);
  return (
    <div className="overall-bar-card">
      <div className="overall-bar-top">
        <div className="label">
          Overall Score
          <small>Weighted across all checks</small>
        </div>
        <div className={`value ${cls}`}>{scoreText(value)}</div>
      </div>
      <div className="overall-bar-track">
        <div
          className={`overall-bar-fill progress-fill ${cls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DetailsToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`details-toggle ${open ? "open" : ""}`}
      onClick={onToggle}
    >
      <span>🔬 Detailed Analysis</span>
      <span className="arrow">▾</span>
    </button>
  );
}

/* ============================================================
   DOCUMENT RESULT
   ============================================================ */

function DocumentResult({
  item,
  index,
  onReport,
}: {
  item: DocumentItem;
  index: number;
  onReport: (item: DocumentItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const data = item.data;

  return (
    <div className="result-card" style={{ animationDelay: `${index * 0.08}s` }}>
      {/* HEAD */}
      <div className="result-card-head">
        <div className="result-meta">
          <div className="result-badges">
            <span className="badge badge-index">#{index + 1}</span>
            {data?.result?.document_type && (
              <span className="badge badge-type">
                {data.result.document_type}
              </span>
            )}
            {item.verified && data && (() => {
              const raw = resolveStatus(data);
              const cls = statusClass(raw);
              return (
                <span className={`badge badge-${cls}`}>
                  {statusEmoji(cls)} {statusLabel(cls, raw)}
                </span>
              );
            })()}
          </div>
          <div className="result-filename">{item.file.name}</div>
          <div className="result-chips">
            <span className="chip">{formatFileSize(item.file.size)}</span>
            {data?.document?.file_type && (
              <span className="chip">{data.document.file_type.toUpperCase()}</span>
            )}
            {data?.result?.classification_confidence != null && (
              <span className="chip">
                {safeScore(data.result.classification_confidence).toFixed(0)}% confidence
              </span>
            )}
            {data?.document?.id != null && (
              <span className="chip">ID #{data.document.id}</span>
            )}
          </div>
        </div>

        {item.verified && data && (
          <div className="score-ring">
            <div className="label">Overall</div>
            <div
              className={`value ${scoreClass(
                data.result?.verification?.overall_score ??
                  data.verification?.overall_score
              )}`}
            >
              {safeScore(
                data.result?.verification?.overall_score ??
                  data.verification?.overall_score
              ).toFixed(0)}
              <span style={{ fontSize: "16px", fontWeight: 600 }}>%</span>
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="result-body">
        {/* Processing */}
        {item.processing && <ProcessingCard name={item.file.name} />}

        {/* Error */}
        {item.error && !item.processing && (
          <ErrorResultCard message={item.error} />
        )}

        {/* Results */}
        {item.verified && data && (() => {
          const verification = data.result?.verification;
          const raw = resolveStatus(data);
          const cls = statusClass(raw);
          const completenessAnalysis = verification?.completeness_analysis;
          const consistencyAnalysis = verification?.consistency_analysis;
          const authenticityAnalysis = verification?.authenticity_analysis;
          const tamperAnalysis = verification?.tamper_analysis;
          const details = verification?.details || [];
          const extractedFields = data.result?.fields || {};
          const sections = data.result?.sections_detected || {};

          return (
            <>
              {/* Status banner */}
              <div className={`status-banner ${cls}`}>
                <div className="status-icon">
                  {statusEmoji(cls)}
                </div>
                <div className="status-text">
                  <strong>{statusLabel(cls, raw)}</strong>
                  <p>{verification?.message || data.message || "Verification pipeline completed."}</p>
                </div>
              </div>

              {/* Overall bar */}
              <OverallBar
                value={
                  verification?.overall_score ?? data.verification?.overall_score
                }
              />

              {/* Score grid */}
              <div className="score-grid">
                <ScoreCard
                  title="Authenticity"
                  value={verification?.authenticity ?? data.verification?.authenticity_score}
                  delay={1}
                />
                <ScoreCard
                  title="Completeness"
                  value={verification?.completeness ?? data.verification?.completeness_score}
                  delay={2}
                />
                <ScoreCard
                  title="Consistency"
                  value={verification?.consistency ?? data.verification?.consistency_score}
                  delay={3}
                />
                <ScoreCard
                  title="Tamper Risk"
                  value={verification?.tamper_score}
                  delay={4}
                />
              </div>

              {/* Expandable details */}
              <DetailsToggle open={open} onToggle={() => setOpen((o) => !o)} />

              {open && (
                <div className="details-panel">

                  {/* Extracted fields */}
                  {Object.keys(extractedFields).length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">📋 Extracted Information</div>
                      <div className="detail-section-sub">Information identified from the document</div>
                      <div className="fields-grid">
                        {Object.entries(extractedFields).map(([k, v]) => (
                          <div className="field-item" key={k}>
                            <div className="field-key">{prettyLabel(k)}</div>
                            <div className="field-val">{valueToString(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completeness */}
                  {completenessAnalysis && (
                    <div className="detail-section">
                      <div className="detail-section-title">🧩 Completeness Analysis</div>
                      <div className="detail-section-sub">Field presence across the document</div>
                      <div className="mini-stats">
                        <div className="mini-stat" style={{ background: "var(--success-soft)" }}>
                          <div className="num" style={{ color: "var(--success)" }}>
                            {completenessAnalysis.present_count ?? 0}
                          </div>
                          <div className="lbl">Present</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--danger-soft)" }}>
                          <div className="num" style={{ color: "var(--danger)" }}>
                            {completenessAnalysis.missing_fields?.length ?? 0}
                          </div>
                          <div className="lbl">Missing</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{completenessAnalysis.total_fields ?? 0}</div>
                          <div className="lbl">Total</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--primary-soft)" }}>
                          <div className="num" style={{ color: "var(--primary)" }}>
                            {scoreText(completenessAnalysis.score)}
                          </div>
                          <div className="lbl">Score</div>
                        </div>
                      </div>
                      {(completenessAnalysis.present_fields || []).length > 0 && (
                        <>
                          <div className="field-key" style={{ marginBottom: 8 }}>Present Fields</div>
                          <div className="tag-list">
                            {completenessAnalysis.present_fields!.map((f, i) => (
                              <span key={i} className="tag tag-present">✓ {prettyLabel(f)}</span>
                            ))}
                          </div>
                        </>
                      )}
                      {(completenessAnalysis.missing_fields || []).length > 0 && (
                        <>
                          <div className="field-key" style={{ marginBottom: 8, marginTop: 14 }}>Missing Fields</div>
                          <div className="tag-list">
                            {completenessAnalysis.missing_fields!.map((f, i) => (
                              <span key={i} className="tag tag-missing">✕ {prettyLabel(f)}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Consistency */}
                  {consistencyAnalysis && (
                    <div className="detail-section">
                      <div className="detail-section-title">🔄 Consistency Analysis</div>
                      <div className="detail-section-sub">Cross-field verification checks</div>
                      <div className="mini-stats">
                        <div className="mini-stat" style={{ background: "var(--primary-soft)" }}>
                          <div className="num" style={{ color: "var(--primary)" }}>
                            {scoreText(consistencyAnalysis.score)}
                          </div>
                          <div className="lbl">Score</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{(consistencyAnalysis.checked_fields || []).length}</div>
                          <div className="lbl">Checked</div>
                        </div>
                        {(consistencyAnalysis.inconsistent_fields || []).length > 0 && (
                          <div className="mini-stat" style={{ background: "var(--danger-soft)" }}>
                            <div className="num" style={{ color: "var(--danger)" }}>
                              {consistencyAnalysis.inconsistent_fields!.length}
                            </div>
                            <div className="lbl">Issues</div>
                          </div>
                        )}
                      </div>
                      {(consistencyAnalysis.checks || []).length > 0 && (
                        <div className="evidence-list">
                          {consistencyAnalysis.checks!.map((c, i) => (
                            <div key={i} className="evidence-item neutral">
                              <span className="evidence-icon">·</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(consistencyAnalysis.inconsistent_fields || []).length > 0 && (
                        <div className="tag-list" style={{ marginTop: 10 }}>
                          {consistencyAnalysis.inconsistent_fields!.map((f, i) => (
                            <span key={i} className="tag tag-missing">✕ {prettyLabel(f)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Authenticity */}
                  {authenticityAnalysis && (
                    <div className="detail-section">
                      <div className="detail-section-title">🛡️ Authenticity Analysis</div>
                      <div className="detail-section-sub">Identity, content, and structural checks</div>
                      <div className="mini-stats">
                        <div className="mini-stat" style={{ background: "var(--primary-soft)" }}>
                          <div className="num" style={{ color: "var(--primary)" }}>
                            {scoreText(authenticityAnalysis.score)}
                          </div>
                          <div className="lbl">Score</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--success-soft)" }}>
                          <div className="num" style={{ color: "var(--success)" }}>
                            {authenticityAnalysis.passed_checks ?? 0}
                          </div>
                          <div className="lbl">Passed</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{authenticityAnalysis.total_checks ?? 0}</div>
                          <div className="lbl">Total</div>
                        </div>
                      </div>
                      {(authenticityAnalysis.checks || []).length > 0 && (
                        <div className="evidence-list">
                          {authenticityAnalysis.checks!.map((c, i) => (
                            <div key={i} className="evidence-item positive">
                              <span className="evidence-icon">✓</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tamper */}
                  {tamperAnalysis && (
                    <div className="detail-section">
                      <div className="detail-section-title">🔍 Tamper Analysis</div>
                      <div className="detail-section-sub">Manipulation and forgery indicators</div>
                      <div className="mini-stats">
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{scoreText(tamperAnalysis.score)}</div>
                          <div className="lbl">Risk Score</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num" style={{ fontSize: 14, paddingTop: 4 }}>{tamperAnalysis.status || "N/A"}</div>
                          <div className="lbl">Status</div>
                        </div>
                      </div>
                      {(tamperAnalysis.suspicious_indicators || []).length > 0 ? (
                        <div className="tag-list">
                          {tamperAnalysis.suspicious_indicators!.map((ind, i) => (
                            <span key={i} className="tag tag-missing">⚠ {ind}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="tag-list">
                          <span className="tag tag-present">✓ No tamper indicators detected</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sections detected */}
                  {Object.keys(sections).length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">📑 Sections Detected</div>
                      <div className="detail-section-sub">Document structure breakdown</div>
                      <div className="tag-list">
                        {Object.entries(sections).map(([s, detected]) => (
                          <span
                            key={s}
                            className={`tag ${detected ? "tag-section-on" : "tag-section-off"}`}
                          >
                            {detected ? "✓" : "·"} {prettyLabel(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification evidence */}
                  {details.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">📌 Verification Evidence</div>
                      <div className="detail-section-sub">Raw signals from the verification engine</div>
                      <div className="evidence-list">
                        {details.map((d, i) => {
                          const pos =
                            d.toLowerCase().includes("consistent") ||
                            d.toLowerCase().includes("detected") ||
                            d.toLowerCase().includes("contains") ||
                            d.toLowerCase().includes("no basic tamper");
                          return (
                            <div key={i} className={`evidence-item ${pos ? "positive" : "neutral"}`}>
                              <span className="evidence-icon">{pos ? "✓" : "·"}</span>
                              <span>{d}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LayoutLM */}
                  {data.result?.layoutlm && (
                    <div className="detail-section">
                      <div className="detail-section-title">🤖 Document AI (LayoutLM)</div>
                      <div className="detail-section-sub">LayoutLMv3 processing metrics</div>
                      <div className="mini-stats">
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num" style={{ fontSize: 14 }}>{data.result.layoutlm.model || "N/A"}</div>
                          <div className="lbl">Model</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{data.result.layoutlm.page_count ?? 0}</div>
                          <div className="lbl">Pages</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--surface-2)" }}>
                          <div className="num">{data.result.layoutlm.token_count ?? 0}</div>
                          <div className="lbl">Tokens</div>
                        </div>
                        <div className="mini-stat" style={{ background: "var(--success-soft)" }}>
                          <div className="num" style={{ fontSize: 13, color: "var(--success)", paddingTop: 4 }}>
                            {data.result.layoutlm.status || "N/A"}
                          </div>
                          <div className="lbl">Status</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report button */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => onReport(item)}
                  disabled={!data.document?.id}
                  className="btn-report"
                >
                  ↓ Download Report
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  /* ---------- Validation ---------- */
  function validateFile(file: File): string | null {
    if (!file) return "Please select a file.";
    if (file.size === 0) return "The selected file is empty.";
    if (file.size > MAX_FILE_SIZE) return "File size must be 25 MB or less.";

    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    const validExt = [
      ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff",
    ].includes(ext);
    const validMime = !file.type || ACCEPTED_TYPES.includes(file.type);

    if (!validExt || !validMime)
      return "Unsupported file type. Please upload PDF, JPG, JPEG, PNG, WEBP, BMP, or TIFF.";
    return null;
  }

  /* ---------- File management ---------- */
  function addFiles(fileList: FileList | File[]) {
    setError("");
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const next: DocumentItem[] = [];
    for (const file of incoming) {
      const err = validateFile(file);
      if (err) { setError(`${file.name}: ${err}`); continue; }

      const dup = documents.some(
        (d) =>
          d.file.name === file.name &&
          d.file.size === file.size &&
          d.file.lastModified === file.lastModified
      );
      const dupBatch = next.some(
        (d) =>
          d.file.name === file.name &&
          d.file.size === file.size &&
          d.file.lastModified === file.lastModified
      );
      if (!dup && !dupBatch)
        next.push({ file, processing: false, verified: false });
    }
    if (next.length) setDocuments((c) => [...c, ...next]);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function removeDocument(index: number) {
    if (processing) return;
    setDocuments((c) => c.filter((_, i) => i !== index));
    setError("");
  }

  function clearAll() {
    if (processing) return;
    setDocuments([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  /* ---------- API ---------- */
  async function processOne(item: DocumentItem, index: number): Promise<ApiResponse> {
    setDocuments((c) =>
      c.map((d, i) => (i === index ? { ...d, processing: true, error: undefined } : d))
    );

    const form = new FormData();
    form.append("file", item.file);

    const res = await fetch(`${API_BASE_URL}/api/upload/`, {
      method: "POST",
      body: form,
    });

    const text = await res.text();
    let json: ApiResponse;
    try { json = JSON.parse(text); }
    catch { throw new Error(text || `Verification failed with status ${res.status}`); }

    if (!res.ok)
      throw new Error(json.error || json.detail || "Document verification failed.");

    setDocuments((c) =>
      c.map((d, i) =>
        i === index ? { ...d, data: json, processing: false, verified: true, error: undefined } : d
      )
    );
    return json;
  }

  async function verifyDocuments() {
    if (!documents.length) { setError("Please select at least one document first."); return; }
    setProcessing(true);
    setError("");

    for (let i = 0; i < documents.length; i++) {
      try {
        await processOne(documents[i], i);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unable to verify document.";
        setDocuments((c) =>
          c.map((d, di) =>
            di === i ? { ...d, processing: false, verified: false, error: msg } : d
          )
        );
      }
    }

    setProcessing(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  /* ---------- PDF Report ---------- */
  async function downloadReport(item: DocumentItem) {
    const data = item.data;
    const doc = data?.document;
    const ver = data?.result?.verification;

    if (!data || !doc) { setError("No processed document available for this report."); return; }

    try {
      setError("");
      const filename =
        doc.filename?.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_") || "verification";

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
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
          ["Filename", doc.filename || "N/A"],
          ["Document ID", String(doc.id ?? "N/A")],
          ["File Type", doc.file_type || "N/A"],
          ["File Size", formatFileSize(doc.file_size)],
          ["Status", doc.status || ver?.status || "N/A"],
          ["Document Type", data.result?.document_type || "N/A"],
          ["Classification Confidence", scoreText(data.result?.classification_confidence)],
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
          ["Authenticity", scoreText(ver?.authenticity ?? data.verification?.authenticity_score)],
          ["Completeness", scoreText(ver?.completeness ?? data.verification?.completeness_score)],
          ["Consistency", scoreText(ver?.consistency ?? data.verification?.consistency_score)],
          ["Tamper Risk", scoreText(ver?.tamper_score)],
          ["Overall Score", scoreText(ver?.overall_score ?? data.verification?.overall_score)],
        ],
      });

      y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
      y += 10;

      const addSection = (title: string) => {
        if (y > 260) { pdf.addPage(); y = 18; }
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, 14, y);
        y += 6;
      };

      const addRows = (rows: Array<[string, string]>) => {
        autoTable(pdf, {
          startY: y,
          theme: "grid",
          styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
          headStyles: { fontStyle: "bold" },
          head: [["Field", "Value"]],
          body: rows,
          columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: pw - 80 } },
        });
        y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
        y += 8;
      };

      addSection("Extracted Information");
      const fieldRows = Object.entries(data.result?.fields || {}).map(
        ([k, v]) => [prettyLabel(k), valueToString(v)] as [string, string]
      );
      addRows(fieldRows.length > 0 ? fieldRows : [["Information", "No extracted fields available."]]);

      addSection("Sections Detected");
      const secRows = Object.entries(data.result?.sections_detected || {}).map(
        ([s, d]) => [prettyLabel(s), d ? "Detected" : "Missing"] as [string, string]
      );
      addRows(secRows.length > 0 ? secRows : [["Sections", "No section information available."]]);

      addSection("Verification Evidence");
      const details = ver?.details || [];
      addRows(
        details.length > 0
          ? details.map((d, i) => [`Evidence ${i + 1}`, d] as [string, string])
          : [["Evidence", "No additional verification details returned."]]
      );

      addSection("Tamper Analysis");
      addRows([
        ["Tamper Risk Score", scoreText(ver?.tamper_score)],
        ["Analysis Status", ver?.tamper_analysis?.status || "N/A"],
        [
          "Suspicious Indicators",
          ver?.tamper_analysis?.suspicious_indicators?.length
            ? ver.tamper_analysis.suspicious_indicators.join("; ")
            : "No basic tamper indicators detected.",
        ],
      ]);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(110, 110, 110);
      pdf.text(
        `Generated by AI Document Verification Platform | Document #${doc.id ?? "N/A"}`,
        14,
        pdf.internal.pageSize.getHeight() - 10
      );

      pdf.save(`${filename}_verification_report.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate verification report.");
    }
  }

  /* ---------- Derived state ---------- */
  const verifiedCount = documents.filter((d) => d.verified).length;
  const avgScore =
    verifiedCount > 0
      ? documents
          .filter((d) => d.verified)
          .reduce((s, d) => s + safeScore(d.data?.result?.verification?.overall_score ?? d.data?.verification?.overall_score ?? 0), 0) /
        verifiedCount
      : 0;
  const hasResults = documents.some((d) => d.data || d.error);

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <main>
      {/* HEADER */}
      <header className="site-header">
        <div className="wrap header-inner">
          <div className="logo">
            <div className="logo-icon">🔍</div>
            <div className="logo-text">
              <h1>AI Verify</h1>
              <p>Document & Image Verification Platform</p>
            </div>
          </div>
          <div className="header-badge">AI-Assisted</div>
        </div>
      </header>

      {/* PAGE BODY */}
      <div className="wrap">

        {/* HERO */}
        <section className="hero anim-fade-up">
          <div className="hero-label">Document Intelligence</div>
          <h2 className="hero-title">
            Verify documents with<br />
            <span>AI-powered precision</span>
          </h2>
          <p className="hero-desc">
            Upload any PDF or image — resumes, certificates, or other documents —
            and get instant AI analysis covering authenticity, completeness,
            consistency, and tamper detection.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-dot" style={{ background: "var(--success)" }} />
              OCR + LayoutLM
            </div>
            <div className="hero-stat">
              <div className="hero-stat-dot" style={{ background: "var(--primary)" }} />
              4-Dimension Scoring
            </div>
            <div className="hero-stat">
              <div className="hero-stat-dot" style={{ background: "var(--warning)" }} />
              PDF Report Export
            </div>
          </div>
        </section>

        {/* GLOBAL ERROR */}
        {error && (
          <div className="global-error anim-slide-down">
            <span>⚠</span>
            <span><strong>Error: </strong>{error}</span>
          </div>
        )}

        {/* UPLOAD SECTION */}
        <section className="upload-section anim-fade-up delay-2">
          <div className="section-title">Select Documents</div>
          <div className="section-sub">Drag & drop files or click to browse — any number of documents supported</div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* Drop zone */}
          <div
            className={`drop-zone ${dragActive ? "active" : ""} ${processing ? "disabled" : ""}`}
            onDragOver={(e) => { e.preventDefault(); if (!processing) setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={handleDrop}
            onClick={() => { if (!processing) inputRef.current?.click(); }}
          >
            <div className="drop-icon">📄</div>
            <div className="drop-title">
              {dragActive ? "Drop to add documents" : "Select or drop your documents"}
            </div>
            <div className="drop-sub">
              {processing ? "Processing in progress…" : "Click anywhere or drag files here"}
            </div>
            <div className="drop-formats">PDF · JPG · JPEG · PNG · WEBP · BMP · TIFF · Max 25 MB each</div>
          </div>

          {/* File list */}
          {documents.length > 0 && (
            <div className="file-list">
              {documents.map((item, i) => (
                <div
                  key={`${item.file.name}-${item.file.lastModified}-${i}`}
                  className="file-card"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="file-card-top">
                    <div className="file-num">{i + 1}</div>
                    {!processing && (
                      <button
                        type="button"
                        className="file-remove"
                        onClick={() => removeDocument(i)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="file-name">{item.file.name}</div>
                  <div className="file-size">{formatFileSize(item.file.size)}</div>
                  <div
                    className={`file-status ${
                      item.processing
                        ? "verifying"
                        : item.verified
                        ? "verified"
                        : item.error
                        ? "failed"
                        : "ready"
                    }`}
                  >
                    <div className="file-status-dot" />
                    {item.processing
                      ? "Verifying…"
                      : item.verified
                      ? "Verified ✓"
                      : item.error
                      ? "Failed"
                      : "Ready"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="actions-bar">
            <button
              id="btn-verify"
              type="button"
              className="btn-primary"
              onClick={verifyDocuments}
              disabled={!documents.length || processing}
            >
              {processing ? (
                <>
                  <div className="dots">
                    <span /><span /><span />
                  </div>
                  Verifying {documents.length} Document{documents.length > 1 ? "s" : ""}…
                </>
              ) : verifiedCount === documents.length && documents.length > 0 ? (
                "✓ Verification Complete"
              ) : (
                `Verify ${documents.length || ""} Document${documents.length === 1 ? "" : "s"}`
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={clearAll}
              disabled={processing || !documents.length}
            >
              Clear All
            </button>

            <div className="counter-chip">
              {documents.length} selected
              {verifiedCount > 0 && (
                <> · <strong>{verifiedCount} verified</strong>
                {verifiedCount > 1 && ` · avg ${avgScore.toFixed(1)}%`}
                </>
              )}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        {hasResults && (
          <section ref={resultRef} style={{ marginTop: 32, scrollMarginTop: 90 }}>
            {/* Results header */}
            <div className="results-header anim-fade-up">
              <div className="results-title-block">
                <p className="eyebrow">Verification Results</p>
                <h2>All Documents</h2>
              </div>
              <div className="results-counters">
                <div
                  className="counter-stat"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <div className="num">{documents.length}</div>
                  <div className="lbl" style={{ color: "var(--text-3)" }}>Total</div>
                </div>
                <div
                  className="counter-stat"
                  style={{ background: "var(--success-soft)", border: "1px solid rgba(14,164,114,0.15)" }}
                >
                  <div className="num" style={{ color: "var(--success)" }}>{verifiedCount}</div>
                  <div className="lbl" style={{ color: "var(--success)" }}>Verified</div>
                </div>
                {verifiedCount > 0 && (
                  <div
                    className="counter-stat"
                    style={{ background: "var(--primary-soft)", border: "1px solid rgba(59,91,219,0.15)" }}
                  >
                    <div className="num" style={{ color: "var(--primary)" }}>{avgScore.toFixed(0)}%</div>
                    <div className="lbl" style={{ color: "var(--primary)" }}>Avg Score</div>
                  </div>
                )}
              </div>
            </div>

            {/* Document result cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {documents.map((item, i) => (
                <DocumentResult
                  key={`${item.file.name}-${item.file.lastModified}-${i}`}
                  item={item}
                  index={i}
                  onReport={downloadReport}
                />
              ))}
            </div>
          </section>
        )}

      </div>{/* /wrap */}

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">AI-Powered Document &amp; Image Verification Platform</div>
          <p className="footer-privacy">
            Privacy notice: Uploaded documents are temporarily processed for verification.
            Original files are not permanently stored. Verification results and necessary metadata
            may be retained. This platform provides AI-assisted verification scores — it does not
            constitute legal or forensic proof.
          </p>
        </div>
      </footer>
    </main>
  );
}
