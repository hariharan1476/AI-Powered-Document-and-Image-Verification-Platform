import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, CheckCircle2, XCircle, AlertCircle, Info, Hash, FileJson, SearchCode, LayoutTemplate } from "lucide-react";
import { DocumentItem } from "../types";
import { formatFileSize, prettyLabel, resolveStatus, safeScore, scoreClass, scoreText, statusClass, statusEmoji, statusLabel, valueToString } from "../lib/utils";
import { VisualViewer } from "./VisualViewer";
import { ProcessingCard } from "./ui/ProcessingCard";
import { ErrorResultCard } from "./ui/ErrorResultCard";
import { OverallBar } from "./ui/OverallBar";
import { ScoreCard } from "./ui/ScoreCard";
import { DetailsToggle } from "./ui/DetailsToggle";

export function DocumentResult({
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

  // Derive top-level status for styling the card border
  const statusRaw = data ? resolveStatus(data) : "pending";
  const sClass = statusClass(statusRaw);
  
  const borderColors = {
    verified: "border-green-200 hover:border-green-300",
    review: "border-yellow-200 hover:border-yellow-300",
    rejected: "border-red-200 hover:border-red-300",
    unknown: "border-slate-200 hover:border-slate-300",
  };
  
  const cardBorder = borderColors[sClass as keyof typeof borderColors] || borderColors.unknown;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
      className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border ${cardBorder} dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-md mb-6`} 
    >
      {/* HEAD */}
      <div className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800/80 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Subtle background gradient based on status */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none ${
          sClass === 'verified' ? 'bg-green-400' : sClass === 'rejected' ? 'bg-red-400' : sClass === 'review' ? 'bg-yellow-400' : 'bg-slate-300'
        }`} />

        <div className="flex-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              {index + 1}
            </span>
            {data?.result?.document_type && (
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                {data.result.document_type}
              </span>
            )}
            {item.verified && data && (() => {
              const raw = resolveStatus(data);
              const cls = statusClass(raw);
              const badgeColors = {
                good: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30",
                warning: "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
                danger: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
                unknown: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
              };
              const badgeC = badgeColors[cls as keyof typeof badgeColors] || badgeColors.unknown;
              return (
                <span className={`px-2.5 py-1 rounded-md border font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${badgeC}`}>
                  {statusEmoji(cls)} {statusLabel(cls, raw)}
                </span>
              );
            })()}
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 truncate" title={item.file.name}>
            {item.file.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-sm text-slate-700 dark:text-slate-300">
              {formatFileSize(item.file.size)}
            </span>
            {data?.document?.file_type && (
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-sm text-slate-700 dark:text-slate-300">
                {data.document.file_type.toUpperCase()}
              </span>
            )}
            {data?.result?.classification_confidence != null && (
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <SearchCode size={12} />
                {safeScore(data.result.classification_confidence).toFixed(0)}% confidence
              </span>
            )}
            {data?.document?.id != null && (
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Hash size={12} />
                ID {data.document.id}
              </span>
            )}
          </div>
        </div>

        {item.verified && data && (
          <div className="relative z-10 shrink-0 text-center md:text-right">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Overall</div>
            <div className={`text-4xl md:text-5xl font-black tracking-tighter ${
              sClass === 'verified' ? 'text-green-600 dark:text-green-400' : sClass === 'rejected' ? 'text-red-600 dark:text-red-400' : sClass === 'review' ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400'
            }`}>
              {safeScore(data.result?.verification?.overall_score ?? data.verification?.overall_score).toFixed(0)}
              <span className="text-xl md:text-2xl font-bold text-slate-400 ml-0.5">%</span>
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="p-6 md:p-8">
        {/* Processing */}
        {item.processing && <ProcessingCard name={item.file.name} logs={item.logs} progress={item.progress} />}

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

          // Banner styles
          const bannerColors = {
            verified: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-900 dark:text-green-300",
            review: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-300",
            rejected: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-300",
            unknown: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200",
          };
          const bannerIconColors = {
            verified: "text-green-600 dark:text-green-400",
            review: "text-yellow-600 dark:text-yellow-400",
            rejected: "text-red-600 dark:text-red-400",
            unknown: "text-slate-600 dark:text-slate-400",
          };
          
          const bColor = bannerColors[cls as keyof typeof bannerColors] || bannerColors.unknown;
          const bIconColor = bannerIconColors[cls as keyof typeof bannerIconColors] || bannerIconColors.unknown;

          return (
            <>
              {/* Status banner */}
              <div className={`flex items-start md:items-center gap-4 p-4 md:p-5 rounded-2xl border ${bColor} mb-8 shadow-sm`}>
                <div className={`shrink-0 ${bIconColor}`}>
                  {cls === 'verified' ? <CheckCircle2 size={28} /> : cls === 'rejected' ? <XCircle size={28} /> : <AlertCircle size={28} />}
                </div>
                <div>
                  <h4 className="text-base font-bold mb-0.5">{statusLabel(cls, raw)}</h4>
                  <p className="text-sm font-medium opacity-80">{verification?.message || data.message || "Verification pipeline completed."}</p>
                </div>
              </div>

              {/* Overall bar */}
              <OverallBar
                value={verification?.overall_score ?? data.verification?.overall_score}
              />

              {/* Score grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <div className="space-y-6 mt-6 animate-fade-in border-t border-slate-100 dark:border-slate-800 pt-8">

                  {/* Visual Viewer */}
                  {(data.document?.cloudinary_url || verification?.ela_image_path) && (
                     <div className="mb-10">
                        <VisualViewer 
                          imageUrl={data.document?.cloudinary_url}
                          boundingBoxes={data.result?.layoutlm?.bounding_boxes}
                          elaImageUrl={verification?.ela_image_path}
                        />
                     </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Extracted fields */}
                    {Object.keys(extractedFields).length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileJson size={18} /></div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Extracted Information</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">Information identified from the document</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(extractedFields).map(([k, v]) => (
                            <div key={k} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{prettyLabel(k)}</div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={valueToString(v)}>{valueToString(v)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tamper */}
                    {tamperAnalysis && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg"><AlertCircle size={18} /></div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Tamper Analysis</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">Manipulation and forgery indicators</p>
                        
                        <div className="flex gap-4 mb-5">
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{scoreText(tamperAnalysis.score)}</div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Risk Score</div>
                          </div>
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-sm font-bold text-slate-900 dark:text-white py-1.5">{tamperAnalysis.status || "N/A"}</div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</div>
                          </div>
                        </div>
                        
                        <div className="flex-grow flex flex-col justify-center">
                          {(tamperAnalysis.suspicious_indicators || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {tamperAnalysis.suspicious_indicators!.map((ind, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/30 rounded-lg text-xs font-bold">
                                  ⚠ {ind}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/30 rounded-xl text-sm font-bold">
                              <CheckCircle2 size={16} /> No tamper indicators detected
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Completeness */}
                  {completenessAnalysis && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg"><Info size={18} /></div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Completeness Analysis</h4>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">Field presence across the document</p>
                      
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex-1 min-w-[100px] bg-green-50/50 dark:bg-green-500/10 p-3 rounded-xl border border-green-100 dark:border-green-500/30">
                          <div className="text-2xl font-black text-green-600 dark:text-green-400">{completenessAnalysis.present_count ?? 0}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Present</div>
                        </div>
                        <div className="flex-1 min-w-[100px] bg-red-50/50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/30">
                          <div className="text-2xl font-black text-red-600 dark:text-red-400">{completenessAnalysis.missing_fields?.length ?? 0}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Missing</div>
                        </div>
                        <div className="flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="text-2xl font-black text-slate-900 dark:text-white">{completenessAnalysis.total_fields ?? 0}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</div>
                        </div>
                        <div className="flex-1 min-w-[100px] bg-blue-50/50 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-100 dark:border-blue-500/30">
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{scoreText(completenessAnalysis.score)}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Score</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(completenessAnalysis.present_fields || []).length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Present Fields</div>
                            <div className="flex flex-wrap gap-2">
                              {completenessAnalysis.present_fields!.map((f, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/30 rounded-md text-xs font-semibold">
                                  <CheckCircle2 size={12} /> {prettyLabel(f)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(completenessAnalysis.missing_fields || []).length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Missing Fields</div>
                            <div className="flex flex-wrap gap-2">
                              {completenessAnalysis.missing_fields!.map((f, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/30 rounded-md text-xs font-semibold">
                                  <XCircle size={12} /> {prettyLabel(f)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sections & LayoutLM */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sections detected */}
                    {Object.keys(sections).length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-lg"><LayoutTemplate size={18} /></div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Sections Detected</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">Document structure breakdown</p>
                        <div className="flex flex-col gap-2">
                          {Object.entries(sections).map(([s, detected]) => (
                            <div key={s} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{prettyLabel(s)}</span>
                              {detected ? (
                                <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Found</span>
                              ) : (
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Missing</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LayoutLM */}
                    {data.result?.layoutlm && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-teal-50 dark:bg-teal-600/20 text-teal-600 dark:text-teal-400 rounded-lg"><SearchCode size={18} /></div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Document AI</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">LayoutLMv3 processing metrics</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={data.result.layoutlm.model}>{data.result.layoutlm.model || "N/A"}</div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Model</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-xl font-black text-slate-900 dark:text-white">{data.result.layoutlm.page_count ?? 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pages</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-xl font-black text-slate-900 dark:text-white">{data.result.layoutlm.token_count ?? 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tokens</div>
                          </div>
                          <div className="bg-teal-50 dark:bg-teal-500/10 p-3 rounded-xl border border-teal-100 dark:border-teal-500/30">
                            <div className="text-sm font-bold text-teal-700 dark:text-teal-400 py-1">{data.result.layoutlm.status || "N/A"}</div>
                            <div className="text-[10px] font-bold text-teal-600/70 dark:text-teal-400/70 uppercase tracking-widest">Status</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verification evidence */}
                  {details.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 rounded-lg"><CheckCircle2 size={18} /></div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Verification Evidence</h4>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 ml-11">Raw signals from the verification engine</p>
                      <div className="space-y-3">
                        {details.map((d, i) => {
                          const pos =
                            d.toLowerCase().includes("consistent") ||
                            d.toLowerCase().includes("detected") ||
                            d.toLowerCase().includes("contains") ||
                            d.toLowerCase().includes("no basic tamper");
                          return (
                            <div key={i} className={`flex items-start gap-3 p-3 md:p-4 rounded-xl border ${pos ? 'bg-green-50/50 dark:bg-green-500/10 border-green-100 dark:border-green-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                              <div className={`mt-0.5 shrink-0 ${pos ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                {pos ? <CheckCircle2 size={18} /> : <Info size={18} />}
                              </div>
                              <span className={`text-sm font-medium ${pos ? 'text-green-900 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>{d}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report button */}
              <div className="flex justify-end pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onReport(item)}
                  disabled={!data.document?.id}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  <Download size={18} /> Download PDF Report
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
