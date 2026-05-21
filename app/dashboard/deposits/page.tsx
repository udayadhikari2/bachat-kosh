"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  AlertCircle,
  Trash2,
  ArrowRight,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  User as UserIcon,
  ChevronDown,
  Image as ImageIcon,
  Wallet
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import Image from "next/image";
import PageHeader from "@/components/dashboard/PageHeader";
import NepaliDatePicker from "@/components/dashboard/NepaliDatePicker";

const SubmitDepositForm = dynamic(() => import("@/components/dashboard/SubmitDepositForm"), {
  ssr: false
});

const AdminDepositForm = dynamic(() => import("@/components/dashboard/AdminDepositForm"), {
  ssr: false
});

const BatchDepositModal = dynamic(() => import("@/components/dashboard/BatchDepositModal"), {
  ssr: false
});
import {
  getDeposits,
  processDeposits,
  updateDeposit,
  getAdminDepositStats,
  deleteDeposits
} from "@/lib/actions/deposit";
import { bsToAd, adToBs, getDaysInMonth, getCurrentNepaliDate, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import { verifyAdminPassword } from "@/lib/actions/user";
const MemberHistoryModal = dynamic(() => import("@/components/dashboard/MemberHistoryModal"), {
  ssr: false
});

export default function DepositsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null); // Monthly
  const [cumulativeStats, setCumulativeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Date Filters (Unapplied until search clicked)
  const [fromDate, setFromDate] = useState(() => {
    const current = getCurrentNepaliDate();
    return bsToAd(current.year, current.month, 1).toISOString();
  });
  const [toDate, setToDate] = useState(() => {
    const current = getCurrentNepaliDate();
    const lastDay = getDaysInMonth(current.year, current.month);
    return bsToAd(current.year, current.month, lastDay).toISOString();
  });

  // Applied Filters
  const [appliedFromDate, setAppliedFromDate] = useState<string | null>(null);
  const [appliedToDate, setAppliedToDate] = useState<string | null>(null);
  const [isDateRangeActive, setIsDateRangeActive] = useState(false);

  // Custom Month Filter State
  const [filterMonth, setFilterMonth] = useState(getCurrentNepaliDate().month);
  const [filterYear, setFilterYear] = useState(getCurrentNepaliDate().year);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editingDeposit, setEditingDeposit] = useState<any>(null);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  // Admin Auth for Security
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [previewDeposit, setPreviewDeposit] = useState<any | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  const fetchData = async () => {
    if (!currentUser?.organizationId) return;
    setLoading(true);
    const targetMonth = `${NEPALI_MONTHS[filterMonth - 1]} ${filterYear}`;
    
    const [depRes, monthlyStatsRes, cumulativeStatsRes] = await Promise.all([
      getDeposits({
        organizationId: currentUser.organizationId,
        page,
        limit,
        search,
        fromDate: isDateRangeActive ? appliedFromDate || undefined : undefined,
        toDate: isDateRangeActive ? appliedToDate || undefined : undefined,
        status: statusFilter,
        month: isDateRangeActive ? "all" : targetMonth
      }),
      isAdmin ? getAdminDepositStats(currentUser.organizationId, targetMonth) : Promise.resolve({ success: false }),
      isAdmin ? getAdminDepositStats(currentUser.organizationId, "all") : Promise.resolve({ success: false })
    ]);

    if (depRes.success) {
      setDeposits(depRes.data as any);
      setTotalPages(depRes.pagination?.pages || 1);
      setTotalRecords(depRes.pagination?.total || 0);
    }
    if (monthlyStatsRes && monthlyStatsRes.success) {
      setStats((monthlyStatsRes as any).data);
    }
    if (cumulativeStatsRes && cumulativeStatsRes.success) {
      setCumulativeStats((cumulativeStatsRes as any).data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.organizationId, page, statusFilter, isDateRangeActive, appliedFromDate, appliedToDate, filterMonth, filterYear, limit]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePrevMonth = () => {
    let newMonth = filterMonth - 1;
    let newYear = filterYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setFilterMonth(newMonth);
    setFilterYear(newYear);
    setIsDateRangeActive(false);
  };

  const handleNextMonth = () => {
    let newMonth = filterMonth + 1;
    let newYear = filterYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setFilterMonth(newMonth);
    setFilterYear(newYear);
    setIsDateRangeActive(false);
  };

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

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setShowAuthModal(true);
  };

  const handleAuthConfirm = async () => {
    if (!authPassword) {
      setAuthError("Password required");
      return;
    }

    setProcessing(true);
    setAuthError("");

    const verify = await verifyAdminPassword(currentUser.id, authPassword);
    if (!verify.success) {
      setAuthError("Security check failed: Invalid Password");
      setProcessing(false);
      return;
    }

    const res = await deleteDeposits(Array.from(selectedIds));
    if (res.success) {
      toast.success("Transactions purged successfully");
      setSelectedIds(new Set());
      setShowAuthModal(false);
      setAuthPassword("");
      fetchData();
    } else {
      toast.error(res.error || "Failed to delete transactions");
    }
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
      autoTable(doc, {
        startY: 20,
        head: [['Member', 'Amount', 'Month', 'Status', 'Submitted']],
        body: dataToExport.map(row => Object.values(row)),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] } // Emerald green
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
          <div className="flex items-center gap-4">
            {isAdmin && deposits.length > 0 && (
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
            )}

            {isAdmin && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-[24px] transition-all flex items-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(0,0,0,0.2)] active:scale-95 group border border-white/5 hover:border-emerald-500/30"
              >
                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                </div>
                Batch Entry
              </button>
            )}

            <button
              onClick={() => setShowAdminModal(true)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] transition-all flex items-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95 group"
            >
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-4 h-4" />
              </div>
              Register Entry
            </button>
          </div>
        }
      />

      {/* High-Impact Small Stats Grid */}
      {isAdmin && stats && cumulativeStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {[
            { 
              label: `Monthly Savings (${NEPALI_MONTHS[filterMonth - 1]})`, 
              val: `Rs. ${stats.totalApprovedAmount?.toLocaleString('en-IN') || 0}`, 
              sub: `${stats.approvedCount || 0} Transactions Verified`,
              icon: PiggyBank,
              color: "text-emerald-400", 
              bg: "bg-emerald-500/5",
              border: "border-emerald-500/20"
            },
            { 
              label: "Total Net Assets", 
              val: `Rs. ${cumulativeStats.grandTotalCollection?.toLocaleString('en-IN') || 0}`, 
              sub: "Cumulative Institutional Value",
              icon: Wallet,
              color: "text-blue-400", 
              bg: "bg-blue-500/5",
              border: "border-blue-500/20"
            },
            { 
              label: "Pending Approvals", 
              val: cumulativeStats.pendingCount || 0, 
              sub: "Awaiting Administrative Review",
              icon: Clock,
              color: "text-amber-400", 
              bg: "bg-amber-500/5",
              border: "border-amber-500/20"
            },
            { 
              label: `Late Fines (${NEPALI_MONTHS[filterMonth - 1]})`, 
              val: `Rs. ${stats.totalDelayedFinePaid?.toLocaleString('en-IN') || 0}`, 
              sub: "Revenue from Penalties",
              icon: AlertCircle,
              color: "text-rose-400", 
              bg: "bg-rose-500/5",
              border: "border-rose-500/20"
            },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-all duration-300`}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] truncate">{s.label}</p>
                  <p className={`${s.color} text-xl font-black tracking-tighter truncate`}>{s.val}</p>
                  <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest opacity-80 truncate">{s.sub}</p>
                </div>
                <div className={`shrink-0 p-3 rounded-xl ${s.bg} border ${s.border} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Command Bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl backdrop-blur-md flex items-center gap-4 relative z-10">
        <div className="flex-1 min-w-[200px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search Member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800/50 rounded-xl pl-10 pr-4 py-2 text-[10px] text-white focus:ring-1 focus:border-emerald-500/50 outline-none transition-all font-black uppercase tracking-tight"
          />
        </div>

        <div className="h-6 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="scale-90 origin-right">
            <NepaliDatePicker
              value={fromDate}
              onChange={(val) => setFromDate(val)}
            />
          </div>
          <span className="text-slate-700 font-black text-[10px]">—</span>
          <div className="scale-90 origin-left">
            <NepaliDatePicker
              value={toDate}
              onChange={(val) => setToDate(val)}
            />
          </div>
          <button
            onClick={() => {
              setAppliedFromDate(fromDate);
              setAppliedToDate(toDate);
              setIsDateRangeActive(true);
              toast.success("Range Applied (Ignoring Month/Year)");
            }}
            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-90 ml-1"
            title="Search Date Range"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        <div className="relative z-30">
          <button
            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowMonthDropdown(false); setShowYearDropdown(false); }}
            className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/50 hover:border-emerald-500/30 transition-all group"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
              {statusFilter === "all" ? "All Cache" : statusFilter}
            </span>
            <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showStatusDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                <div className="p-1">
                  {[
                    { id: "all", label: "All Cache" },
                    { id: "PENDING", label: "Pending" },
                    { id: "APPROVED", label: "Approved" },
                    { id: "REJECTED", label: "Rejected" }
                  ].map(status => {
                    const isSelected = statusFilter === status.id;
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          setStatusFilter(status.id);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-[10px] font-black rounded-lg transition-all text-left uppercase tracking-widest ${isSelected
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Contextual Action Bar (Top of Table) */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl shadow-xl flex items-center justify-between mb-4 ring-1 ring-emerald-500/10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shadow-inner">
                    {selectedIds.size}
                  </div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Selected Entries</p>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div className="flex gap-3">
                  {selectedIds.size > 1 && (
                    <>
                      <button
                        onClick={() => handleBulkProcess("APPROVED")}
                        disabled={processing}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Batch
                      </button>
                      <button
                        onClick={() => handleBulkProcess("REJECTED")}
                        disabled={processing}
                        className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95 flex items-center gap-2"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject Batch
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleDelete}
                    disabled={processing}
                    className="px-5 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedIds.size > 1 ? "Batch" : "Record"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors mr-2"
              >
                Clear Selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Data Layer - High Fidelity Box Refinement */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[48px] overflow-hidden backdrop-blur-3xl min-h-[200px] flex flex-col ring-1 ring-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)] transition-all duration-500 hover:ring-white/20 group/table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                {isAdmin && (
                  <th className="px-8 py-5 w-20 text-left">
                    <button
                      onClick={handleSelectAll}
                      type="button"
                      disabled={loading || deposits.length === 0}
                      className={`transition-all ${selectedIds.size > 0 && selectedIds.size === deposits.length ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"}`}
                    >
                      {selectedIds.size > 0 && selectedIds.size === deposits.length ? <CheckSquare className="w-5 h-5 shadow-lg shadow-emerald-500/20" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                )}
                <th className="px-8 py-5 w-[25%]">Members</th>
                <th className="px-8 py-5 w-[25%]">Amount Details</th>
                <th className="px-8 py-5 w-[25%]">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Month and Year</span>
                    <div className="flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/5 relative">

                      <button
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-slate-500 hover:text-white"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>

                      <div className="relative z-20">
                        <button
                          type="button"
                          onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
                          className="text-[9px] font-black text-white uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          {NEPALI_MONTHS[filterMonth - 1]}
                          <ChevronDown className={`w-2 h-2 text-slate-500 ${showMonthDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showMonthDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-2 w-32 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                            >
                              <div className="max-h-[100px] overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-1">
                                {NEPALI_MONTHS.map((m: string, idx: number) => {
                                  const isSelected = filterMonth === idx + 1;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setFilterMonth(idx + 1);
                                        setIsDateRangeActive(false);
                                        setShowMonthDropdown(false);
                                      }}
                                      className={`w-full px-2 py-1.5 text-[8px] font-black rounded-md transition-all text-left uppercase tracking-widest ${isSelected
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                      {m}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="w-px h-2.5 bg-white/10 mx-0.5" />

                      <div className="relative z-20">
                        <button
                          type="button"
                          onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
                          className="text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-1"
                        >
                          {filterYear}
                          <ChevronDown className={`w-2 h-2 text-emerald-500/50 ${showYearDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showYearDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full right-0 mt-2 w-20 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                            >
                              <div className="max-h-[100px] overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent p-1">
                                {Array.from({ length: 101 }, (_, i) => {
                                  const currentYear = getCurrentNepaliDate().year;
                                  const year = currentYear - 50 + i;
                                  const isSelected = filterYear === year;
                                  return (
                                    <button
                                      key={year}
                                      type="button"
                                      onClick={() => {
                                        setFilterYear(year);
                                        setIsDateRangeActive(false);
                                        setShowYearDropdown(false);
                                      }}
                                      className={`w-full px-1 py-1.5 text-[8px] font-black rounded-md transition-all text-center ${isSelected
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                      {year}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="w-px h-2.5 bg-white/10 mx-0.5" />

                      <button
                        onClick={() => {
                          const cur = getCurrentNepaliDate();
                          setFilterMonth(cur.month);
                          setFilterYear(cur.year);
                          setIsDateRangeActive(false);
                          toast.success("Jumped to Current Period");
                        }}
                        className="p-1 bg-white/5 text-slate-500 rounded hover:bg-emerald-500 hover:text-white transition-all active:scale-90 ml-0.5"
                        title="Current Month"
                      >
                        <RotateCw className="w-2 h-2" />
                      </button>

                      <button onClick={handleNextMonth}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-slate-500 hover:text-white"
                        title="Next Month"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-8 py-5 text-right w-[20%] font-black text-slate-500 uppercase tracking-widest">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-32">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Synchronizing Registry...</p>
                    </div>
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-32">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
                        <FileSpreadsheet className="w-8 h-8 text-slate-800" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-500 uppercase tracking-tight">No Transactions Found</p>
                        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest mt-1">Try adjusting your filters or record a new entry</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                deposits.map((dep: any) => (
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
                        <button
                          onClick={() => setSelectedMember(dep.userId)}
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-slate-800 flex items-center justify-center text-xs font-black text-slate-500 uppercase overflow-hidden relative shadow-inner ring-1 ring-white/5 hover:ring-emerald-500/50 hover:border-emerald-500/30 transition-all group/avatar"
                        >
                          {dep.userId?.profileImage ? (
                            <Image
                              src={dep.userId.profileImage}
                              alt={dep.userId.name}
                              fill
                              sizes="48px"
                              className="object-cover group-hover/avatar:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            dep.userId?.name?.charAt(0) || "U"
                          )}
                          <div className="absolute inset-0 bg-emerald-500/0 group-hover/avatar:bg-emerald-500/10 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                          </div>
                        </button>
                        <div className="flex flex-col gap-1.5 text-left">
                          <button
                            onClick={() => setSelectedMember(dep.userId)}
                            className="font-bold text-white hover:text-emerald-400 transition-colors uppercase tracking-tight text-sm text-left block w-fit"
                          >
                            {dep.userId?.name}
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{new Date(dep.depositDate).toLocaleDateString()}</span>
                            <div className="w-px h-2 bg-slate-800" />
                            <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{adToBs(new Date(dep.depositDate)).year}-{adToBs(new Date(dep.depositDate)).month}-{adToBs(new Date(dep.depositDate)).day}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-sm font-black text-white tracking-tight">Rs. {dep.amount}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {dep.depositType === "SERVICE_CHARGE" && <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Service Charge</span>}
                          {dep.depositType === "LOAN_INTEREST" && <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Loan Target</span>}
                          {dep.depositType === "ADVANCE" && <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Advance Credit</span>}
                          {dep.depositType === "RENEWAL" && <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Loan Renewal</span>}
                          {(!dep.depositType || dep.depositType === "MONTHLY") && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Monthly Saving</span>}
                        </div>
                        {dep.remarks && (
                          <p className="text-[10px] text-slate-500 font-medium italic leading-tight truncate max-w-[150px]" title={dep.remarks}>
                            {dep.remarks}
                          </p>
                        )}
                        {dep.fineApplied > 0 && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">+Rs. {dep.fineApplied} Fine</p>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest w-fit">
                          {dep.month}
                        </div>

                        {dep.status === "PENDING" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Pending</span>
                          </div>
                        ) : dep.status === "APPROVED" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full w-fit">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Rejected</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-all w-fit ml-auto">
                        {isAdmin && (dep.status === "PENDING" || dep.status === "APPROVED") ? (
                          <>
                            {dep.status === "PENDING" && (
                              <button
                                onClick={() => {
                                  setSelectedIds(new Set([dep._id]));
                                  handleBulkProcess("APPROVED");
                                }}
                                className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/20 active:scale-95"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setRejectingIds([dep._id])}
                              className="p-2.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition-all border border-red-500/20 active:scale-95"
                              title={dep.status === "APPROVED" ? "Reverse / Reject" : "Reject"}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="col-span-2 h-0" />
                        )}

                        <button
                          onClick={() => setPreviewDeposit(dep)}
                          className="p-2.5 text-slate-500 hover:text-white bg-slate-950 rounded-xl transition-all border border-slate-800 hover:border-slate-600 active:scale-95 shadow-inner"
                          title="View Proof"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingDeposit(dep);
                              setShowAdminModal(true);
                            }}
                            className="p-2.5 rounded-xl bg-slate-950 text-slate-500 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-600 active:scale-95 shadow-inner"
                            title="Edit Entry"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-8 py-6 bg-slate-950/50 border-t border-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Page Size</label>
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                >
                  {[5, 10, 20, 50, 100].map(v => <option key={v} value={v}>{v} ENTRIES</option>)}
                </select>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <PiggyBank className="w-3.5 h-3.5 opacity-30" />
                 INDEX {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1}-{Math.min(page * limit, totalRecords)} / {totalRecords} DATA_NODES
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:border-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-2.5 flex items-center gap-3 font-mono shadow-inner">
                 <span className="text-sm font-black text-emerald-400">{page}</span>
                 <span className="text-xs font-bold text-slate-700">OF</span>
                 <span className="text-xs font-black text-slate-500">{totalPages || 1}</span>
              </div>
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => p + 1)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:border-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forms & Modals */}
      {showModal && (
        <SubmitDepositForm
          onClose={() => { setShowModal(false); fetchData(); }}
        />
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

      {/* Admin Security Authorization Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Security Check</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Administrative Authorization</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAuthModal(false); setAuthPassword(""); setAuthError(""); }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">
                    CRITICAL: You are about to purge {selectedIds.size} record(s). This will permanently remove data and reverse financial credits.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter your security credentials..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuthConfirm()}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-mono"
                  />
                  {authError && (
                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest ml-1 animate-pulse">{authError}</p>
                  )}
                </div>

                <button
                  onClick={handleAuthConfirm}
                  disabled={processing}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-rose-500/10 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Authorize Purge</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminModal && (
          <AdminDepositForm
            onClose={() => {
              setShowAdminModal(false);
              setEditingDeposit(null);
            }}
            onSuccess={() => {
              setShowAdminModal(false);
              setEditingDeposit(null);
              fetchData();
            }}
            orgConfig={{ ...stats?.config, financials: stats?.financials }}
            isAdmin={isAdmin}
            initialData={editingDeposit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBatchModal && (
          <BatchDepositModal
            onClose={() => setShowBatchModal(false)}
            onSuccess={() => {
              setShowBatchModal(false);
              fetchData();
            }}
            orgConfig={{ ...stats?.config, financials: stats?.financials }}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>

      {/* Screenshot Preview Modal - Advanced Inspection Suite with Context */}
      {previewDeposit && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-6xl w-full h-[90vh] bg-slate-900 border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,0.7)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* Main Inspection Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 shrink-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <Maximize2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">Inspection Suite</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Forensic Proof Verification</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button
                    onClick={() => setScale(s => Math.max(1, s - 0.5))}
                    className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setScale(s => Math.min(4, s + 0.5))}
                    className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button
                    onClick={() => { setScale(1); setRotation(0); }}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <button
                  onClick={() => { setPreviewDeposit(null); setScale(1); setRotation(0); }}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-90 md:hidden"
                >
                  <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                </button>
              </div>

              <div className="flex-1 relative overflow-hidden bg-slate-950/50 flex items-center justify-center cursor-grab active:cursor-grabbing">
                <motion.div
                  drag={scale > 1}
                  dragConstraints={{ left: -500 * scale, right: 500 * scale, top: -500 * scale, bottom: 500 * scale }}
                  animate={{
                    rotate: rotation,
                    scale: scale,
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                  className="relative"
                >
                  <img
                    src={previewDeposit.proof}
                    alt="Transaction Proof"
                    className="max-w-[60vw] max-h-[65vh] rounded-2xl object-contain shadow-2xl pointer-events-none select-none"
                    draggable={false}
                  />
                </motion.div>
              </div>

              <div className="p-4 bg-slate-950/80 border-t border-white/5 flex justify-center shrink-0">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
                  {scale > 1 ? "DRAG TO MOVE • ZOOM: " + (scale * 100).toFixed(0) + "%" : "INSPECTION VIEW"}
                </p>
              </div>
            </div>

            {/* Transaction Intel Sidebar */}
            <div className="w-full md:w-96 border-l border-white/5 bg-slate-900 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-8 flex justify-between items-start">
                <div>
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Transaction Intel</h4>
                  <button
                    onClick={() => { setPreviewDeposit(null); setScale(1); setRotation(0); }}
                    className="hidden md:flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Close Preview</span>
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8 space-y-8">
                <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-[32px]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <UserIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Depositor</p>
                      <p className="text-sm font-bold text-white leading-none">{previewDeposit.userId?.name}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-lg font-black text-white">Rs. {previewDeposit.amount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Month</p>
                      <p className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20">{previewDeposit.month}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Payment Date</p>
                      <p className="text-xs font-bold text-white">{new Date(previewDeposit.depositDate).toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Transaction Remarks</p>
                      <div className="text-xs font-medium text-slate-300 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5 italic min-h-[60px]">
                        {previewDeposit.remarks || "No remarks provided for this transaction."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => {
                      setEditingDeposit(previewDeposit);
                      setPreviewDeposit(null);
                      setShowAdminModal(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Pencil className="w-4 h-4" />
                    Modify This Entry
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Member History Modal */}
      <AnimatePresence>
        {selectedMember && (
          <MemberHistoryModal
            userId={selectedMember._id}
            onClose={() => setSelectedMember(null)}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
