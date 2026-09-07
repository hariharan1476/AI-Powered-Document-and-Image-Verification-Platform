"use client";

import { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileUp, Search, ShieldCheck, FileSearch, Download, Trash2 } from "lucide-react";

import { DocumentItem, ApiResponse } from "../src/types";
import { formatFileSize, safeScore, scoreText, valueToString, prettyLabel } from "../src/lib/utils";
import { DocumentResult } from "../src/components/DocumentResult";
import { useAuth } from "../src/contexts/AuthContext";
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

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

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

    const res = await fetch(`${API_BASE_URL}/api/upload/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
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
          } else if (data.status === 'processing' || data.status === 'pending') {
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
    const ver = data?.result?.verification;

    if (!data || !doc) { setError("No processed document available for this report."); return; }

    try {
      setError("");
      const filename = doc.filename?.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_") || "verification";
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

  const verifiedCount = documents.filter((d) => d.verified).length;
  const avgScore = verifiedCount > 0
      ? documents
          .filter((d) => d.verified)
          .reduce((s, d) => s + safeScore(d.data?.result?.verification?.overall_score ?? d.data?.verification?.overall_score ?? 0), 0) /
        verifiedCount
      : 0;
  const hasResults = documents.some((d) => d.data || d.error);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <svg className="animate-spin h-10 w-10 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">AI Verify</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">Verification Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-700">{user.name}</span>
            </div>
            
            {user.is_admin && (
              <Link href="/admin" className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100">
                Admin
              </Link>
            )}
            <button onClick={logout} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="flex-grow">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white/40 backdrop-blur-3xl border-b border-slate-200/50 py-16 md:py-24">
          {/* Animated Background Orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
          
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center animate-fade-in-up">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest mb-6 shadow-sm">
              Document Intelligence
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              Verify documents with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm">AI-powered precision</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Upload any PDF or image — resumes, certificates, or other documents —
              and get instant AI analysis covering authenticity, completeness,
              consistency, and tamper detection.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                <FileSearch size={18} className="text-blue-500" /> OCR + LayoutLM
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                <ShieldCheck size={18} className="text-indigo-500" /> 4-Dimension Scoring
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                <Download size={18} className="text-purple-500" /> PDF Report Export
              </div>
            </div>
          </div>
        </section>

        {/* MAIN WORKSPACE */}
        <div className="max-w-5xl mx-auto px-4 py-12">
          
          {error && (
            <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 animate-fade-in shadow-sm">
              <span className="text-lg">⚠</span>
              <p className="font-medium pt-0.5">{error}</p>
            </div>
          )}

          {/* UPLOAD WIDGET */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12 relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Select Documents</h3>
              <p className="text-slate-500 text-sm">Drag & drop files or click to browse — any number of documents supported</p>
            </div>
            
            <div className="p-6 md:p-8">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className={`relative border-2 border-dashed rounded-3xl p-10 md:p-16 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
                  dragActive 
                    ? "border-indigo-500 bg-indigo-50/80 scale-[1.02] shadow-inner" 
                    : processing 
                      ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed" 
                      : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-lg hover:shadow-indigo-500/10"
                }`}
                onDragOver={(e) => { e.preventDefault(); if (!processing) setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={handleDrop}
                onClick={() => { if (!processing) inputRef.current?.click(); }}
              >
                {/* Subtle pulse ring on hover */}
                <div className="absolute inset-0 bg-indigo-400/5 opacity-0 hover:opacity-100 transition-opacity duration-700 rounded-3xl animate-pulse pointer-events-none"></div>
                
                <div className="flex flex-col items-center justify-center relative z-10">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 shadow-sm ${dragActive ? "bg-indigo-600 text-white shadow-indigo-500/40 scale-110" : "bg-white border border-slate-200 text-indigo-500 group-hover:scale-110 group-hover:shadow-md"}`}>
                    <FileUp size={36} strokeWidth={2.5} />
                  </div>
                  <h4 className={`text-xl font-extrabold mb-2 transition-colors ${dragActive ? "text-indigo-800" : "text-slate-800"}`}>
                    {dragActive ? "Drop files to analyze" : "Upload documents for verification"}
                  </h4>
                  <p className="text-slate-500 text-sm mb-6 font-medium">
                    {processing ? "Processing in progress…" : "Click to browse or drag and drop files here"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {['PDF', 'JPG', 'PNG', 'TIFF'].map((ext, idx) => (
                      <span key={ext} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold tracking-wider shadow-sm animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                        {ext}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs mt-6 font-semibold uppercase tracking-widest">Max 25 MB per file</p>
                </div>
              </div>

              {documents.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-8 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 px-1">Selected Files ({documents.length})</h4>
                  <AnimatePresence>
                  {documents.map((item, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      transition={{ delay: i * 0.05 }}
                      key={`${item.file.name}-${item.file.lastModified}-${i}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate" title={item.file.name}>{item.file.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-medium text-slate-500">{formatFileSize(item.file.size)}</span>
                            
                            {/* Status indicator */}
                            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                              item.processing ? "text-blue-600" :
                              item.verified ? "text-green-600" :
                              item.error ? "text-red-600" : "text-slate-400"
                            }`}>
                              {item.processing ? (
                                <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span> Verifying...</>
                              ) : item.verified ? (
                                <>✓ Verified</>
                              ) : item.error ? (
                                <>⚠ Failed</>
                              ) : (
                                <>Ready</>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {!processing && (
                        <button
                          type="button"
                          onClick={() => removeDocument(i)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Remove file"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
            
            {/* Action Bar */}
            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={verifyDocuments}
                  disabled={!documents.length || processing}
                  className="flex-1 sm:flex-none relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {processing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying {documents.length}...
                      </>
                    ) : verifiedCount === documents.length && documents.length > 0 ? (
                      "✓ Verification Complete"
                    ) : (
                      `Verify ${documents.length || ""} Document${documents.length === 1 ? "" : "s"}`
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </button>
                
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={processing || !documents.length}
                  className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  Clear All
                </button>
              </div>
              
              <div className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                <span className="text-slate-800">{documents.length} selected</span>
                {verifiedCount > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-green-600">{verifiedCount} verified</span>
                    {verifiedCount > 1 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="text-indigo-600">Avg {avgScore.toFixed(1)}%</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* RESULTS SECTION */}
          <AnimatePresence>
          {hasResults && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              ref={resultRef} 
              className="pt-8 scroll-mt-24"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">Analysis Complete</p>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verification Results</h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-3 min-w-[120px]">
                    <div className="text-2xl font-black text-slate-800 leading-none mb-1">{documents.length}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</div>
                  </motion.div>
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-green-50 border border-green-200 shadow-sm rounded-xl px-5 py-3 min-w-[120px]">
                    <div className="text-2xl font-black text-green-700 leading-none mb-1">{verifiedCount}</div>
                    <div className="text-xs font-bold text-green-600 uppercase tracking-wider">Verified</div>
                  </motion.div>
                  {verifiedCount > 0 && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-indigo-50 border border-indigo-200 shadow-sm rounded-xl px-5 py-3 min-w-[120px]">
                      <div className="text-2xl font-black text-indigo-700 leading-none mb-1">{avgScore.toFixed(0)}%</div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Avg Score</div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {documents.map((item, i) => (
                  <DocumentResult
                    key={`${item.file.name}-${item.file.lastModified}-${i}`}
                    item={item}
                    index={i}
                    onReport={downloadReport}
                  />
                ))}
              </div>
            </motion.section>
          )}
          </AnimatePresence>

        </div>
      </div>
      
      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="font-bold text-slate-300 text-lg mb-4 flex items-center justify-center gap-2">
            <ShieldCheck size={20} className="text-indigo-400" /> AI-Powered Verification
          </div>
          <p className="max-w-2xl mx-auto text-sm leading-relaxed mb-6">
            Privacy notice: Uploaded documents are temporarily processed for verification.
            Original files are not permanently stored. Verification results and necessary metadata
            may be retained. This platform provides AI-assisted verification scores — it does not
            constitute legal or forensic proof.
          </p>
          <div className="text-xs font-semibold text-slate-600">
            &copy; {new Date().getFullYear()} AI Verify Platform
          </div>
        </div>
      </footer>
    </main>
  );
}
