"use client";

import { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileUp, Search, ShieldCheck, FileSearch, Download, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

import { DocumentItem, ApiResponse } from "@/src/types";
import { formatFileSize, safeScore, scoreText, valueToString, prettyLabel } from "@/src/lib/utils";
import { DocumentResult } from "@/src/components/DocumentResult";
import { useAuth } from "@/src/contexts/AuthContext";
import AppLayout from "@/src/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff";

export default function DashboardPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token && typeof window !== "undefined" && !localStorage.getItem("token")) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  function validateFile(file: File): string | null {
    if (!file) return "Please select a file.";
    if (file.size === 0) return "The selected file is empty.";
    if (file.size > MAX_FILE_SIZE) return "File size must be 25 MB or less.";

    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    const validExt = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"].includes(ext);
    const validMime = !file.type || ACCEPTED_TYPES.includes(file.type);

    if (!validExt || !validMime)
      return "Unsupported file type. Please upload PDF, JPG, JPEG, PNG, WEBP, BMP, or TIFF.";
    return null;
  }

  function addFiles(fileList: FileList | File[]) {
    setError("");
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const next: DocumentItem[] = [];
    for (const file of incoming) {
      const err = validateFile(file);
      if (err) { setError(`${file.name}: ${err}`); continue; }

      const dup = documents.some(
        (d) => d.file.name === file.name && d.file.size === file.size && d.file.lastModified === file.lastModified
      );
      const dupBatch = next.some(
        (d) => d.file.name === file.name && d.file.size === file.size && d.file.lastModified === file.lastModified
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

  async function processOne(item: DocumentItem, index: number): Promise<ApiResponse> {
    setDocuments((c) =>
      c.map((d, i) => (i === index ? { ...d, processing: true, error: undefined, logs: [], progress: 0 } : d))
    );

    const form = new FormData();
    form.append("file", item.file);

    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    const res = await fetch(`${API_BASE_URL}/api/upload/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${activeToken}` },
      body: form,
    });

    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); }
    catch { throw new Error(text || `Verification failed with status ${res.status}`); }

    if (!res.ok)
      throw new Error(json.error || json.detail || "Document verification failed.");
      
    const jobId = json.job_id;
    if (!jobId) {
       setDocuments((c) =>
          c.map((d, i) =>
            i === index ? { ...d, data: json, processing: false, verified: true, error: undefined } : d
          )
        );
        return json;
    }

    return new Promise((resolve, reject) => {
      const source = new EventSource(`${API_BASE_URL}/api/upload/stream/${jobId}`);
      
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'completed' && data.result) {
            source.close();
            setDocuments((c) =>
              c.map((d, i) => i === index ? { ...d, data: data.result, processing: false, verified: true, error: undefined, progress: 100 } : d)
            );
            resolve(data.result);
          } else if (data.status === 'failed') {
            source.close();
            reject(new Error(data.error || "Verification failed."));
          } else if (data.status === 'processing' || data.status === 'pending' || data.status === 'uploading' || data.status === 'verifying') {
             setDocuments((c) =>
               c.map((d, i) => {
                 if (i === index) {
                   const newLogs = data.log ? [...(d.logs || []), data.log] : d.logs;
                   return { ...d, logs: newLogs, progress: data.progress || d.progress };
                 }
                 return d;
               })
             );
          }
        } catch (e) {
          console.error("SSE Parse error", e);
        }
      };
      source.onerror = (err) => {
        source.close();
        reject(new Error("Connection to verification stream lost."));
      };
    });
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
          c.map((d, di) => di === i ? { ...d, processing: false, verified: false, error: msg } : d)
        );
      }
    }
    setProcessing(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  async function downloadReport(item: DocumentItem) {
    const data = item.data;
    const doc = data?.document;
    const ver: any = data?.verification || data?.result?.verification;
    const scores = ver ? {
      authenticity: ver.authenticity ?? ver.authenticity_score ?? 0,
      completeness: ver.completeness ?? ver.completeness_score ?? 0,
      consistency: ver.consistency ?? ver.consistency_score ?? 0,
      overall: ver.overall_score ?? ver.overall ?? 0
    } : undefined;

    const pdf = new jsPDF();
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 297, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("DOCUMENT VERIFICATION REPORT", 14, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`File: ${doc?.filename || item.file.name}`, 14, 28);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    if (scores) {
      autoTable(pdf, {
        startY: 42,
        head: [["Metric", "Score", "Evaluation"]],
        body: [
          ["Authenticity Score", `${scores.authenticity}%`, scoreText(scores.authenticity)],
          ["Completeness Score", `${scores.completeness}%`, scoreText(scores.completeness)],
          ["Consistency Score", `${scores.consistency}%`, scoreText(scores.consistency)],
          ["Overall Integrity Score", `${scores.overall}%`, scoreText(scores.overall)],
        ],
        theme: "grid",
        styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    pdf.save(`${(doc?.filename || item.file.name).replace(/\.[^/.]+$/, "")}_Verification_Report.pdf`);
  }

  const overallAvg = safeScore(
    documents
      .filter((d) => d.data?.verification?.overall_score || d.data?.result?.verification?.overall_score)
      .map((d) => d.data?.verification?.overall_score ?? d.data?.result?.verification?.overall_score ?? 0)
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Workspace Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Document Verification Workspace
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Upload identity credentials, invoices, or legal contracts for instant AI tamper detection and extraction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearAll}
              disabled={processing || !documents.length}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all shadow-sm"
            >
              Clear All
            </button>
            <button
              onClick={verifyDocuments}
              disabled={processing || !documents.length}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Start AI Verification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 md:p-14 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
              : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900/80 shadow-sm"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 mb-4 shadow-lg shadow-indigo-600/10">
            <FileUp className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Drop your documents here, or <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/50">browse</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto">
            Supports PDF, PNG, JPG, JPEG, WEBP, BMP, and TIFF files up to 25 MB.
          </p>
        </div>

        {/* Queue / Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Selected Documents ({documents.length})</span>
              {overallAvg > 0 && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  Batch Average Score: {overallAvg}%
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 shrink-0">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                        {doc.file.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(doc.file.size)} • {doc.file.type || "Document"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {doc.processing && (
                      <div className="flex items-center gap-2 text-xs text-indigo-400">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Analyzing ({doc.progress || 0}%)</span>
                      </div>
                    )}

                    {doc.verified && (
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}

                    {!processing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeDocument(idx); }}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Results Display */}
        <section ref={resultRef} className="space-y-6 pt-4">
          {documents.map(
            (item, index) =>
              item.data && (
                <DocumentResult
                  key={index}
                  index={index}
                  item={item}
                  onReport={downloadReport}
                />
              )
          )}
        </section>

      </div>
    </AppLayout>
  );
}
