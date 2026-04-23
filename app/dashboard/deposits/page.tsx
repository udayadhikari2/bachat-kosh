"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  PiggyBank, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  CheckSquare,
  Square,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PageHeader from "@/components/dashboard/PageHeader";
import SubmitDepositForm from "@/components/dashboard/SubmitDepositForm";
import NepaliDatePicker from "@/components/dashboard/NepaliDatePicker";
import { 
  getDeposits, 
  processDeposits, 
  updateDeposit, 
  getAdminDepositStats 
} from "@/lib/actions/deposit";

export default function DepositsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";

  // State
  const [showModal, setShowModal] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals for editing/rejecting
  const [editingDeposit, setEditingDeposit] = useState<any>(null);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    if (!currentUser?.organizationId) return;
    setLoading(true);
    const [depRes, statsRes] = await Promise.all([
      getDeposits({
        organizationId: currentUser.organizationId,
        page,
        limit: 10,
        search,
        fromDate,
        toDate,
        status: statusFilter
      }),
      isAdmin ? getAdminDepositStats(currentUser.organizationId) : Promise.resolve({ success: false })
    ]);

    if (depRes.success) {
      setDeposits(depRes.data as any);
      setTotalPages(depRes.pagination?.pages || 1);
      setTotalRecords(depRes.pagination?.total || 0);
    }
    if (statsRes && statsRes.success) {
      setStats((statsRes as any).data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.organizationId, page, statusFilter, fromDate, toDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === deposits.length && deposits.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deposits.map((d: any) => d._id)));
    }
  };

  const handleBulkProcess = async (action: "APPROVED" | "REJECTED") => {
    if (selectedIds.size === 0) return;
    
    if (action === "REJECTED") {
      setRejectingIds(Array.from(selectedIds));
      return;
    }

    setProcessing(true);
    await processDeposits(Array.from(selectedIds), "APPROVED", currentUser.id);
    setSelectedIds(new Set());
    await fetchData();
    setProcessing(false);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason) return;
    setProcessing(true);
    await processDeposits(rejectingIds, "REJECTED", currentUser.id, rejectReason);
    setRejectingIds([]);
    setRejectReason("");
    setSelectedIds(new Set());
    await fetchData();
    setProcessing(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      amount: Number(formData.get("amount")),
      month: formData.get("month"),
      advancedPayment: Number(formData.get("advancedPayment")) || 0,
      creditUsed: Number(formData.get("creditUsed")) || 0,
    };
    await updateDeposit(editingDeposit._id, data);
    setEditingDeposit(null);
    await fetchData();
    setProcessing(false);
  };

  const exportData = (format: 'csv' | 'xlsx' | 'pdf') => {
    const dataToExport = deposits.map(d => ({
      Member: d.userId?.name,
      Amount: d.amount,
      Month: d.month,
      Status: d.status,
      Submitted: new Date(d.createdAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0]).join(",");
      const rows = dataToExport.map(row => Object.values(row).map(v => typeof v === 'string' ? `"${v}"` : v).join(",")).join("\n");
      const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deposits_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Deposits");
      XLSX.writeFile(wb, `deposits_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF() as any;
      doc.text("Treasury Deposit Ledger", 14, 15);
      doc.autoTable({
        startY: 20,
        head: [['Member', 'Amount', 'Month', 'Status', 'Submitted']],
        body: dataToExport.map(row => Object.values(row)),
        theme: 'grid',
        headStyles: { fillStyle: [16, 185, 129] } // Emerald green
      });
      doc.save(`deposits_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Treasury Management" 
        description={isAdmin ? "Monitor, verify, and regulate organization savings transmissions." : "Review your savings growth and deposit history."}
        icon={PiggyBank}
        actions={
          isAdmin ? (
            deposits.length > 0 && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                  <Download className="w-4 h-4" /> Export Report
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 ring-1 ring-white/5">
                   <button onClick={() => exportData('csv')} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors flex items-center gap-3">
                     <FileText className="w-4 h-4" /> CSV Format
                   </button>
                   <button onClick={() => exportData('xlsx')} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors flex items-center gap-3">
                     <FileSpreadsheet className="w-4 h-4" /> XLSX Ledger
                   </button>
                   <button onClick={() => exportData('pdf')} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors flex items-center gap-3">
                     <FileText className="w-4 h-4" /> PDF Report
                   </button>
                </div>
              </div>
            )
          ) : (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Submission
            </button>
          )
        }
      />

      {/* Compact Stats Row */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {[
            { label: "Total Trans.", val: stats.totalTransaction, color: "text-blue-400", bg: "bg-blue-500/5" },
            { label: "Net Assets", val: `Rs. ${stats.grandTotalCollection?.toLocaleString('en-IN') || 0}`, color: "text-emerald-400", bg: "bg-emerald-500/5" },
            { label: "Approved", val: stats.approvedCount, color: "text-emerald-500", bg: "bg-emerald-500/5" },
            { label: "Modified", val: stats.modifiedCount, color: "text-amber-400", bg: "bg-amber-500/5" },
            { label: "Rejected", val: stats.rejectedCount, color: "text-red-400", bg: "bg-red-500/5" },
            { label: "Delayed", val: stats.delayedCount, color: "text-purple-400", bg: "bg-purple-500/5" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-slate-800 rounded-2xl px-4 py-3 shadow-sm`}>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{s.label}</p>
              <p className={`${s.color} text-lg font-black mt-0.5 tracking-tight`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Filter Console */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md flex flex-wrap items-end gap-6 relative z-[60]">
        <div className="flex-1 min-w-[240px] space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Lookup</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search member identity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl ring-1 ring-white/5 pl-12 pr-4 p-3 text-[11px] text-white focus:ring-2 focus:border-emerald-500/50 outline-none transition-all font-black uppercase tracking-tight shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <NepaliDatePicker 
            label="From (Nepali)"
            value={fromDate}
            onChange={(val) => setFromDate(val)}
          />
          <div className="pt-6">
            <span className="text-slate-600 opacity-50 font-black">—</span>
          </div>
          <NepaliDatePicker 
            label="To (Nepali)"
            value={toDate}
            onChange={(val) => setToDate(val)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">State Filter</label>
          <div className="flex items-center gap-3 bg-slate-950 px-4 p-3 rounded-2xl ring-1 ring-white/5 border border-slate-800 shadow-inner">
             <Filter className="w-4 h-4 text-emerald-400" />
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer"
             >
             <option value="all">Global Cache</option>
             <option value="PENDING">Pending</option>
             <option value="APPROVED">Approvals</option>
             <option value="REJECTED">Rejections</option>
           </select>
          </div>
        </div>


      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl shadow-emerald-500/10 flex items-center gap-6 animate-in slide-in-from-bottom-5">
           <div className="flex items-center gap-3 px-2">
             <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
               {selectedIds.size}
             </div>
             <p className="text-[10px] font-black text-white uppercase tracking-widest">Entries Selected</p>
           </div>
           <div className="w-px h-8 bg-slate-800" />
           <div className="flex gap-2">
             <button 
               onClick={() => handleBulkProcess("APPROVED")}
               disabled={processing}
               className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-offset-2 ring-offset-slate-950 active:scale-95"
             >
               Approve Batch
             </button>
             <button 
               onClick={() => handleBulkProcess("REJECTED")}
               disabled={processing}
               className="px-6 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
             >
               Reject Batch
             </button>
           </div>
        </div>
      )}

      {/* Main Data Layer */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-32 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Synchronizing Registry...</p>
          </div>
        ) : deposits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                  {isAdmin && (
                    <th className="px-8 py-5 w-12 text-left">
                      <button 
                        onClick={handleSelectAll}
                        type="button"
                        className={`transition-all ${selectedIds.size > 0 && selectedIds.size === deposits.length ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"}`}
                      >
                        {selectedIds.size > 0 && selectedIds.size === deposits.length ? <CheckSquare className="w-5 h-5 shadow-lg shadow-emerald-500/20" /> : <Square className="w-5 h-5" />}
                      </button>
                    </th>
                  )}
                  <th className="px-8 py-5">Source Member</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Month</th>
                  <th className="px-8 py-5">Verification</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {deposits.map((dep: any) => (
                  <tr key={dep._id} className="group hover:bg-slate-800/10 transition-all duration-300">
                    {isAdmin && (
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => toggleSelection(dep._id)}
                          className={`transition-all ${selectedIds.has(dep._id) ? "text-emerald-400" : "text-slate-700 hover:text-slate-500"}`}
                        >
                          {selectedIds.has(dep._id) ? <CheckSquare className="w-5 h-5 shadow-lg shadow-emerald-500/20" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-slate-800 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                          {dep.userId?.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight text-sm">
                            {dep.userId?.name}
                          </div>
                          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mt-1">{new Date(dep.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 flex flex-col gap-1.5 justify-center mt-2">
                      {dep.depositType === "SERVICE_CHARGE" && <span className="inline-block text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest w-fit">Service Charge</span>}
                      {dep.depositType === "LOAN_INTEREST" && <span className="inline-block text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest w-fit">Loan Target</span>}
                      {(!dep.depositType || dep.depositType === "MONTHLY") && <span className="inline-block text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest w-fit">Monthly Saving</span>}
                      {dep.fineApplied > 0 && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">+Rs. {dep.fineApplied} Overdue Fine</p>}
                      {dep.advancedPayment > 0 && <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">+Rs. {dep.advancedPayment} Adv. Payment</p>}
                      {dep.creditUsed > 0 && <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest shadow-emerald-500/10">-Rs. {dep.creditUsed} Global Credit</p>}
                    </td>

                    <td className="px-8 py-6">
                      <div className="inline-flex items-center px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {dep.month}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        dep.status === "PENDING" ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20" :
                        dep.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5" :
                        "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
                      }`}>
                        {dep.status === "PENDING" && <Clock className="w-3 h-3 mr-2 animate-pulse" />}
                        {dep.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {isAdmin && dep.status === "PENDING" && (
                            <>
                              <button 
                                onClick={() => setEditingDeposit(dep)}
                                className="p-2.5 rounded-xl bg-slate-950 text-slate-500 hover:text-white hover:bg-slate-800 transition-all border border-slate-800"
                                title="Edit Transmission"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedIds(new Set([dep._id]));
                                  handleBulkProcess("APPROVED");
                                }}
                                className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/20"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setRejectingIds([dep._id])}
                                className="p-2.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition-all border border-red-500/20"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <a href={dep.proof} target="_blank" rel="noopener noreferrer" className="p-2.5 text-slate-500 hover:text-white bg-slate-950 rounded-xl transition-all border border-slate-800">
                            <FileText className="w-4 h-4" />
                          </a>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Layer */}
            <div className="px-8 py-5 border-t border-slate-800 bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Ledger Entries: {totalRecords} Records
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-white uppercase tracking-widest">
                  Page {page} of {totalPages || 1}
                </div>
                <button 
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-32 text-center">
            <div className="inline-flex p-10 bg-slate-950/50 rounded-[50px] mb-8 ring-1 ring-white/5 border border-slate-800/50">
              <PiggyBank className="w-16 h-16 text-slate-800 opacity-50" />
            </div>
            <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Registry Empty</p>
          </div>
        )}
      </div>

      {/* Forms & Modals */}
      {showModal && (
        <SubmitDepositForm 
          onClose={() => { setShowModal(false); fetchData(); }}
          currentMonth="Chaitra 2080"
          defaultAmount={1000}
        />
      )}

      {/* Edit Modal */}
      {editingDeposit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <form onSubmit={handleUpdate} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-3xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Pencil className="w-5 h-5 text-amber-500" /> Correct Entry
              </h3>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Corrected Amount</label>
                    <input 
                      name="amount" 
                      type="number" 
                      defaultValue={editingDeposit.amount}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-black text-lg"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Month</label>
                    <input 
                      name="month" 
                      defaultValue={editingDeposit.month}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none font-bold"
                    />
                 </div>
                 {/* Advanced Payment — admin sets this when member overpays */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest">
                      Advanced Payment (NPR)
                      <span className="ml-2 text-slate-600 normal-case font-bold">— overpayment above monthly goal</span>
                    </label>
                    <input
                      name="advancedPayment"
                      type="number"
                      min="0"
                      defaultValue={editingDeposit.advancedPayment || 0}
                      className="w-full bg-slate-950 border border-blue-900/60 rounded-xl px-4 py-3 text-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all font-bold"
                    />
                 </div>
                 {/* Credit Used Correction */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">
                      Credit Used (Global Balance)
                      <span className="ml-2 text-slate-600 normal-case font-bold">— amount to deduct from member credits</span>
                    </label>
                    <input
                      name="creditUsed"
                      type="number"
                      min="0"
                      defaultValue={editingDeposit.creditUsed || 0}
                      className="w-full bg-slate-950 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all font-bold shadow-inner"
                    />
                 </div>
              </div>
              <div className="mt-8 flex gap-3">
                 <button type="button" onClick={() => setEditingDeposit(null)} className="flex-1 py-3 text-slate-500 font-bold hover:text-white transition-colors">Abort</button>
                 <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest transition-all">Apply Correction</button>
              </div>
           </form>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingIds.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-3xl">
              <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" /> Dispute Transmission
              </h4>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Please provide an administrative reason for the rejection. This message will be transmitted to the member(s) involved.</p>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction hash mismatch, proof unclear..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white placeholder-slate-700 min-h-[120px] focus:ring-2 focus:ring-red-500/50 outline-none transition-all font-medium text-sm"
              />
              <div className="mt-8 flex gap-3">
                 <button onClick={() => { setRejectingIds([]); setRejectReason(""); }} className="flex-1 py-3 text-slate-500 font-bold hover:text-white transition-colors">Cancel</button>
                 <button onClick={handleRejectConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest transition-all">Confirm Rejection</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
