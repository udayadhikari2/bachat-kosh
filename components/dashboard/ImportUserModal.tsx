"use client";

import { useState } from "react";
import { 
  X, FileSpreadsheet, Download, Upload, Loader2, 
  CheckCircle2, AlertCircle, FileText, 
  Info, Users, HelpCircle
} from "lucide-react";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";
import { bulkImportUsers } from "@/lib/actions/user";

interface ImportUserModalProps {
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export default function ImportUserModal({ onClose, organizationId, onSuccess }: ImportUserModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, errors: 0 });

  const downloadTemplate = () => {
    const template = [
      {
        "Full Name": "John Doe",
        "Nickname": "John",
        "Email": "john@example.com",
        "Account Number": "MBR001",
        "Phone Number": "9800000000",
        "Role": "USER",
        "Gender": "Male",
        "Date of Birth": "1990-01-01",
        "Street": "Main Street",
        "City": "Kathmandu",
        "State": "Bagmati",
        "Zip": "44600"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Member_Template");
    XLSX.writeFile(wb, "Member_Import_Template.xlsx");
    toast.success("Template downloaded successfully");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map Excel headers to internal keys
        const mappedData = data.map((row: any) => ({
          name: row["Full Name"] || row["name"],
          nickname: row["Nickname"] || row["nickname"],
          email: row["Email"] || row["email"],
          accountNumber: row["Account Number"] || row["accountNumber"],
          phoneNumber: row["Phone Number"] || row["phoneNumber"],
          role: row["Role"] || row["role"] || "USER",
          gender: row["Gender"] || row["gender"],
          dateOfBirth: row["Date of Birth"] || row["dob"],
          street: row["Street"] || row["street"],
          city: row["City"] || row["city"],
          state: row["State"] || row["state"],
          zip: row["Zip"] || row["zip"],
        }));

        setPreviewData(mappedData);
        setStats({
          total: mappedData.length,
          valid: mappedData.filter(u => u.name && u.email && u.accountNumber).length,
          errors: mappedData.filter(u => !u.name || !u.email || !u.accountNumber).length
        });
        setLoading(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read Excel file");
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    if (stats.errors > 0) {
      toast.error("Please fix errors in the file before importing");
      return;
    }

    setImporting(true);
    try {
      const res = await bulkImportUsers(previewData, organizationId);
      if (res.success) {
        toast.success(`Successfully imported ${res.count} members!`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Bulk import failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred during import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Bulk Member Import</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">XLSX Management Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!file ? (
            <div className="space-y-8">
              {/* Step 1: Template */}
              <div className="bg-slate-950/50 border border-white/5 rounded-3xl p-8 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <Download className="w-7 h-7 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Step 1: Download Template</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Download our standardized Excel structure to ensure compatibility.</p>
                    </div>
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="px-6 py-3 bg-white hover:bg-slate-200 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download XLSX
                  </button>
                </div>
              </div>

              {/* Step 2: Upload */}
              <div className="relative">
                <label className="block w-full border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-[32px] p-12 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] group">
                  <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Step 2: Upload Document</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Drag and drop your XLSX file here or click to browse</p>
                    </div>
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Valid Structure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-User Support</span>
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Requirements */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 flex items-start gap-4">
                 <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-blue-400" />
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Data Integrity Protocols</h4>
                    <ul className="text-xs text-slate-400 space-y-1 font-medium list-disc list-inside">
                       <li>Name, Email, and Account Number are mandatory.</li>
                       <li>Account Numbers and Emails must be unique.</li>
                       <li>Date format should be YYYY-MM-DD.</li>
                       <li>Profile photos and documents must be uploaded manually later.</li>
                    </ul>
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Found</p>
                  <p className="text-2xl font-black text-white">{stats.total}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 text-center">
                  <p className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest mb-1">Valid Records</p>
                  <p className="text-2xl font-black text-emerald-400">{stats.valid}</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 text-center">
                  <p className="text-[9px] text-rose-500/70 font-black uppercase tracking-widest mb-1">Incomplete</p>
                  <p className="text-2xl font-black text-rose-400">{stats.errors}</p>
                </div>
              </div>

              {/* Data Preview */}
              <div className="bg-slate-950/50 border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Member Name</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Account #</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {previewData.slice(0, 10).map((row, idx) => {
                        const isValid = row.name && row.email && row.accountNumber;
                        return (
                          <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white uppercase">{row.name || "Missing Name"}</span>
                                <span className="text-[10px] text-slate-500">{row.email || "Missing Email"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">{row.accountNumber || "N/A"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">{row.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              {isValid ? (
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Ready</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-rose-400">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Invalid</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 10 && (
                  <div className="px-6 py-3 bg-white/5 text-center">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">And {previewData.length - 10} more records...</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button 
                  onClick={() => { setFile(null); setPreviewData([]); }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Change File
                </button>
                <button 
                  onClick={handleImport}
                  disabled={importing || stats.errors > 0}
                  className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Finalize {stats.valid} Imports
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
