"use client";

import { useState, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X, Download, ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use CDN worker so no localhost or bundling needed
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PdfViewerModalProps {
  url: string;
  downloadUrl?: string | null;
  filename: string;
  token?: string | null;
  onClose: () => void;
}

export default function PdfViewerModal({ url, downloadUrl, filename, token, onClose }: PdfViewerModalProps) {
  // If url is a relative path like /api/admin/..., prepend the backend base URL
  const fullUrl = url.startsWith("/") ? `${API_BASE}${url}` : url;
  const fullDownloadUrl = downloadUrl
    ? (downloadUrl.startsWith("/") ? `${API_BASE}${downloadUrl}` : downloadUrl)
    : fullUrl;

  const fileOptions = useMemo(() => ({
    url: fullUrl,
    httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  }), [fullUrl, token]);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loadError, setLoadError] = useState(false);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={18} className="text-indigo-400 shrink-0" />
          <span className="text-white font-medium text-sm truncate">{filename}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-slate-400 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>

          {/* Page nav */}
          {numPages > 1 && (
            <>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-slate-400 text-xs">{pageNumber} / {numPages}</span>
              <button
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Download */}
          <a
            href={downloadUrl || url}
            download={filename}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Download size={14} />
            Download
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PDF canvas area */}
      <div className="flex-1 overflow-auto bg-slate-800 flex justify-center py-6">
        {loadError ? (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-4 mt-20">
            <FileText size={48} className="text-slate-600" />
            <p className="text-sm">Could not load PDF preview.</p>
            <a
              href={fullDownloadUrl}
              download={filename}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              Download instead
            </a>
          </div>
        ) : (
          <Document
            file={fileOptions as any}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setLoadError(true)}
            loading={
              <div className="flex items-center justify-center mt-20 text-slate-400 text-sm gap-3">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading PDF…
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-2xl"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
