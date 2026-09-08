"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../src/components/AppLayout";
import { Trash2, ShieldAlert, ArrowLeft, Users, FileText, Eye, ShieldCheck, User } from "lucide-react";
import dynamic from "next/dynamic";
const PdfViewerModal = dynamic(() => import("../../src/components/PdfViewerModal"), { ssr: false });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

interface AdminDoc {
  id: number;
  filename: string;
  status: string;
  score: number;
  feedback: string;
  created_at: string;
  user_email: string;
  file_url: string | null;
  download_url: string | null;
}

export default function AdminPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);
  const [pdfViewName, setPdfViewName] = useState<string>("");
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (!user.is_admin) {
      router.push("/");
      return;
    }

    fetchData();
  }, [user, isLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [uRes, dRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/documents`, { headers })
      ]);

      if (!uRes.ok || !dRes.ok) {
        throw new Error("Failed to fetch admin data");
      }

      const uData = await uRes.json();
      const dData = await dRes.json();

      setUsers(uData);
      setDocs(dData);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: number, currentAdmin: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_admin: !currentAdmin })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update role");
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? All their documents will be permanently removed.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete user");
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete document");
      }
      setDocs(docs.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <svg className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-medium animate-pulse">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-indigo-400 tracking-tight mb-1">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Manage platform users and uploaded documents across the entire system.</p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
            Back to App
          </Link>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400 shadow-sm">
            <ShieldAlert className="shrink-0 mt-0.5" size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* USERS COLUMN */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Users size={22} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Users</h2>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-xs">
                  {users.length}
                </span>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {users.map(u => (
                  <div key={u.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{u.email}</div>
                      </div>
                      {u.is_admin ? (
                        <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-md">Admin</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-md">User</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
                      <div className="text-xs font-medium text-slate-400 dark:text-slate-500">ID: #{u.id}</div>
                      {!u.is_admin && (
                        <button 
                          onClick={() => deleteUser(u.id)} 
                          className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-10 text-slate-400 font-medium text-sm">
                    No users found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DOCUMENTS COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <FileText size={22} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Documents</h2>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-xs">
                  {docs.length}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="pb-4 pt-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">Document</th>
                      <th className="pb-4 pt-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">Uploader</th>
                      <th className="pb-4 pt-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="pb-4 pt-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {docs.map(d => (
                      <tr key={d.id} className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-colors duration-200 group">
                        <td className="py-4 pr-4">
                          <div className="font-bold text-slate-900 dark:text-white max-w-[200px] truncate" title={d.filename}>{d.filename}</div>
                          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">ID: #{d.id}</div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.user_email}</div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            d.status === "verified" 
                              ? "bg-green-100 text-green-700" 
                              : d.status === "failed" || d.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {d.file_url && (
                              <button
                                onClick={() => { setPdfViewUrl(d.file_url!); setPdfViewName(d.filename); setPdfDownloadUrl(d.download_url || d.file_url); }}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg inline-flex items-center justify-center transition-colors"
                                title="View PDF"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteDoc(d.id)} 
                              className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg inline-flex items-center justify-center transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {docs.length === 0 && (
                  <div className="text-center py-16 text-slate-400 font-medium text-sm border-t border-slate-100">
                    No documents have been uploaded to the platform yet.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewUrl && (
        <PdfViewerModal
          url={pdfViewUrl}
          downloadUrl={pdfDownloadUrl || pdfViewUrl}
          filename={pdfViewName}
          token={token}
          onClose={() => setPdfViewUrl(null)}
        />
      )}
    </AppLayout>
  );
}
