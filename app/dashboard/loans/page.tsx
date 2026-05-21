"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandCoins, Plus, CheckCircle2, AlertCircle, TrendingUp,
  ShieldCheck, Clock, UserCheck, ShieldAlert,
  Calculator, Calendar, Wallet, CheckSquare, Trash2,
  CreditCard, RefreshCw, History as HistoryIcon, X, Loader2, Eye, Lock as LockIcon, RotateCcw,
  Banknote, Gauge, FileClock, Handshake, Search, ArrowDownCircle, Info
} from "lucide-react";


import dynamic from "next/dynamic";
import PageHeader from "@/components/dashboard/PageHeader";
import NepaliDatePicker from "@/components/dashboard/NepaliDatePicker";

const LoanRequestForm = dynamic(() => import("@/components/dashboard/LoanRequestForm"), {
  loading: () => <div className="p-8 bg-slate-900 animate-pulse rounded-[40px] h-96" />,
  ssr: false
});

const LoanSettleModal = dynamic(() => import("@/components/dashboard/LoanSettleModal"), {
  ssr: false
});

const LoanDetailsModal = dynamic(() => import("@/components/dashboard/LoanDetailsModal"), {
  ssr: false
});
import {
  getLoans, getLoanHistory, approveLoan, verifyLoan,
  getFinancialHealth, deleteLoans, clearLoanHistory, undoLastSettlement,
  getFinancialAuditLogs
} from "@/lib/actions/loan";
import { verifyAdminPassword } from "@/lib/actions/user";
import { toast } from "react-hot-toast";
import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import Image from "next/image";

type ActiveModal = "settle" | "delete" | "details" | "clearHistory" | "undo" | "revenueAudit" | "advanceAudit" | "pendingApprovals" | "activate" | null;

export default function LoansPage() {
  const { data: session } = useSession();
  const [loans, setLoans] = useState<any[]>([]);
  const [historyLoans, setHistoryLoans] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [calculatingAmount, setCalculatingAmount] = useState<number>(10000);
  const [calculatingDays, setCalculatingDays] = useState<number>(30);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState<any>({ total: 0, pages: 1, currentPage: 1 });

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // View State
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);




  // Modal State
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditUserBalances, setAuditUserBalances] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTitle, setAuditTitle] = useState("");
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
  const [auditTab, setAuditTab] = useState<string>("");
  const [advanceSubTab, setAdvanceSubTab] = useState<"available" | "cleared">("available");

  // Refs
  const portfolioTableRef = useRef<HTMLDivElement>(null);

  // Delete Confirm State
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [verifyTargetId, setVerifyTargetId] = useState<string | null>(null);
  const [recordOutflow, setRecordOutflow] = useState(true);

  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";
  const organizationId = user?.organizationId;

  // Single selected loan (for settle/renew/details)
  const singleSelectedLoan = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = Array.from(selectedIds)[0];
    return (showHistory ? historyLoans : loans).find(l => l._id === id) || null;
  }, [selectedIds, loans, historyLoans, showHistory]);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [loansRes, healthRes] = await Promise.all([
        getLoans({ organizationId, page: currentPage, limit: itemsPerPage, search: debouncedSearch }),

        getFinancialHealth(organizationId)
      ]);


      if (loansRes.success) {
        setLoans(loansRes.data || []);
        if (loansRes.pagination) setPagination(loansRes.pagination);
      }
      if (healthRes.success) setHealth(healthRes.data || null);
    } catch {
      toast.error("Failed to fetch loan data");
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentPage, itemsPerPage, debouncedSearch]);


  const fetchHistory = useCallback(async () => {
    if (!organizationId) return;
    const res = await getLoanHistory({ organizationId, limit: 100, search: debouncedSearch });


    if (res.success) setHistoryLoans(res.data || []);
  }, [organizationId]);


  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory, fetchHistory, debouncedSearch]);


  // ── Selection Handlers ──────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentList = showHistory ? historyLoans : loans;
    if (selectedIds.size === currentList.length && currentList.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentList.map(l => l._id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setActiveModal(null);
  };

  // ── Loan Actions ────────────────────────────────────────────────
  const handleApprove = async (loanId: string) => {
    const res = await approveLoan(loanId, user.id);
    if (res.success) { toast.success("Approval recorded"); fetchData(); }
    else toast.error(res.error || "Approval failed");
  };

  const handleVerify = (loanId: string) => {
    setVerifyTargetId(loanId);
    setRecordOutflow(true); // Default to true as per request
    setActiveModal("activate");
  };

  const handleVerifyConfirm = async () => {
    if (!verifyTargetId) return;
    setDeleteLoading(true);
    const res = await verifyLoan(verifyTargetId, user.id, recordOutflow);
    if (res.success) { 
      toast.success(recordOutflow ? "Loan activated and recorded as outflow" : "Loan activated (Historic/Migration mode)"); 
      fetchData(); 
      setActiveModal(null);
      setVerifyTargetId(null);
    }
    else toast.error(res.error || "Verification failed");
    setDeleteLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePassword.trim()) { setDeleteError("Password is required"); return; }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // Verify admin password first
      const pwRes = await verifyAdminPassword(user.id, deletePassword);
      if (!pwRes.success) {
        setDeleteError("Incorrect password. Deletion aborted.");
        setDeleteLoading(false);
        return;
      }

      // Proceed with deletion
      const res = await deleteLoans({ loanIds: Array.from(selectedIds), adminId: user.id });
      if (res.success) {
        toast.success(`${res.count} loan(s) deleted and service charges reversed`);
        clearSelection();
        setDeletePassword("");
        fetchData();
        fetchHistory();
      } else {

        setDeleteError(res.error || "Deletion failed");
      }
    } catch {
      setDeleteError("An error occurred. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClearHistoryConfirm = async () => {
    if (!deletePassword.trim()) { setDeleteError("Password is required"); return; }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // Verify admin password first
      const pwRes = await verifyAdminPassword(user.id, deletePassword);
      if (!pwRes.success) {
        setDeleteError("Incorrect password. Action aborted.");
        setDeleteLoading(false);
        return;
      }

      // Proceed with clear all
      const res = await clearLoanHistory(organizationId, user.id);
      if (res.success) {
        toast.success(`Successfully cleared ${res.count} historical records.`);
        clearSelection();
        setDeletePassword("");
        fetchHistory();
        setActiveModal(null);
      } else {
        setDeleteError(res.error || "Failed to clear history");
      }
    } catch {
      setDeleteError("An error occurred. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);
  const handleUndo = async (loanId: string) => {
    setUndoTargetId(loanId);
    setActiveModal("undo");
    setDeletePassword("");
    setDeleteError("");
  };

  const handleOpenAudit = async (types: string[], title: string) => {
    setAuditTitle(title);
    setRecordTypes(types);
    setAuditTab(types[0]);
    setActiveModal("revenueAudit");

    if (!organizationId) return;
    setAuditLoading(true);
    const res = await getFinancialAuditLogs(organizationId);
    if (res.success) {
      // Filter by type
      setAuditData(res.data.filter((d: any) => types.includes(d.type)));
      setAuditUserBalances(res.userBalances || []);
    }
    setAuditLoading(false);
  };

  const handleOpenAdvanceAudit = () => {
    setAdvanceSubTab("available");
    handleOpenAudit(["ADVANCE"], "Advanced Payment Audit Trail");
  };
  const handleOpenPendingApprovals = () => setActiveModal("pendingApprovals");

  const scrollToTable = () => {
    portfolioTableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUndoConfirm = async () => {
    if (!undoTargetId) return;
    if (!deletePassword.trim()) { setDeleteError("Password is required"); return; }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      // Verify admin password first
      const pwRes = await verifyAdminPassword(user.id, deletePassword);
      if (!pwRes.success) {
        setDeleteError("Incorrect password. Action aborted.");
        setDeleteLoading(false);
        return;
      }

      const res = await undoLastSettlement({ loanId: undoTargetId, adminId: user.id });
      if (res.success) {
        toast.success("Settlement undone! Loan is back in Active Portfolio.");
        fetchData();
        fetchHistory();
        setActiveModal(null);
        setUndoTargetId(null);
        setDeletePassword("");
      } else {
        setDeleteError(res.error || "Failed to undo settlement");
      }
    } catch {
      setDeleteError("Internal server error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const onModalSuccess = () => {
    clearSelection();
    fetchData();
    if (showHistory) fetchHistory();
  };

  // ── Interest Calculator ─────────────────────────────────────────
  const calcInterest = (amount: number, days: number) => {
    const baseDays = Math.min(180, days);
    const exceedDays = Math.max(0, days - 180);
    const baseInterest = (amount * 12 * baseDays) / (365 * 100);
    const exceedInterest = (amount * 20 * exceedDays) / (365 * 100);
    return {
      base: Math.ceil(baseInterest),
      exceed: Math.ceil(exceedInterest),
      total: Math.ceil(baseInterest + exceedInterest)
    };

  };
  const calculated = calcInterest(calculatingAmount, calculatingDays);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Management"
        description={isAdmin ? "Oversee loan applications, monitor active credit, and verify multi-approvals." : "Apply for financial assistance and track your active loan repayment progress."}
        icon={HandCoins}
        actions={(
          <div className="flex flex-col md:flex-row items-end md:items-center gap-4">

            <button
              onClick={() => setShowApplyModal(true)}
              className="h-[46px] flex items-center px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-bold shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              Apply for Loan
            </button>
          </div>
        )}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-white">
        {/* Core Financials */}
        <div
          onClick={scrollToTable}
          className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5 cursor-pointer hover:border-emerald-500/50 transition-all group active:scale-95"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Portfolio</span>
            </div>
            <ArrowDownCircle className="w-3 h-3 text-slate-700 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xl font-black">Rs. {health?.totalActiveLoans?.toLocaleString() || 0}</div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Funds</span>
          </div>
          <div className="text-xl font-black">Rs. {health?.availableBalance?.toLocaleString() || 0}</div>
        </div>

        {/* Interactive Revenue Cards */}
        <div
          onClick={() => handleOpenAudit(["INTEREST", "PENALTY"], "Collected Interest Audit Trail")}
          className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5 cursor-pointer hover:border-emerald-500/50 transition-all group active:scale-95"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collected Interest</span>
            </div>
            <Info className="w-3 h-3 text-slate-700 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xl font-black text-emerald-400">Rs. {health?.totalCollectedInterestSettled?.toLocaleString() || 0}</div>
        </div>

        <div
          onClick={() => handleOpenAudit(["SERVICE_CHARGE", "RENEWAL"], "Collected Fees (SC/RC) Audit Trail")}
          className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5 cursor-pointer hover:border-blue-500/50 transition-all group active:scale-95"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                <Gauge className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collected SC/RC</span>
            </div>
            <Info className="w-3 h-3 text-slate-700 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-xl font-black text-blue-400">Rs. {health?.totalFeesPaidGlobal?.toLocaleString() || 0}</div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
              <Gauge className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Accrued Interest</span>
          </div>
          <div className="text-xl font-black text-blue-400">Rs. {health?.totalAccruedInterestActive?.toLocaleString() || 0}</div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/10">
              <FileClock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outstanding Fees (SC/RE)</span>
          </div>
          <div className="text-xl font-black text-amber-400">Rs. {health?.totalOutstandingFeesActive?.toLocaleString() || 0}</div>
        </div>

        {health?.totalAdvancePaidActive > 0 && (
          <div
            onClick={handleOpenAdvanceAudit}
            className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-900/50 to-slate-950 border border-emerald-500/20 rounded-3xl backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/5 relative overflow-hidden group cursor-pointer hover:border-emerald-500/50 transition-all active:scale-95"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all duration-700" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                  <Banknote className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Member Credits</span>
                  <span className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">Aggregate Pool</span>
                </div>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                <Info className="w-3 h-3 text-slate-600 group-hover:text-emerald-400" />
              </div>
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold text-slate-500 mr-1.5 uppercase font-mono">Rs.</span>
              <span className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-sm">
                {health?.totalAdvancePaidActive?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        )}

        <div
          onClick={handleOpenPendingApprovals}
          className={`p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl ring-1 ring-white/5 cursor-pointer transition-all group active:scale-95 ${loans.filter(l => l.status === "PENDING").length > 0 ? "hover:border-amber-500/50" : "hover:border-slate-700"}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${loans.filter(l => l.status === "PENDING").length > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-500/10 border-slate-500/10"}`}>
                <Clock className={`w-4 h-4 ${loans.filter(l => l.status === "PENDING").length > 0 ? "text-amber-400 animate-blink" : "text-slate-500"}`} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Appr.</span>
            </div>
            {loans.filter(l => l.status === "PENDING").length > 0 && (
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-blink" />
            )}
          </div>
          <div className={`text-xl font-black ${loans.filter(l => l.status === "PENDING").length > 0 ? "text-amber-400" : "text-slate-500"}`}>
            {loans.filter(l => l.status === "PENDING").length}
          </div>
        </div>

      </div>


      {/* Main Content */}
      <div className="space-y-10">
        {/* Financial Health */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[24px] relative overflow-hidden group shadow-xl ring-1 ring-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1.5 max-w-sm">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Financial Health Monitor</h3>
              </div>
              <p className="text-[10px] text-slate-500 font-medium italic">
                Real-time liquidity status. Assets vs active credit.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {health?.config?.showLiquidityWarning ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-tight">
                      Recommended: Maintain {health.config.liquidityReservePercentage}% reserve.
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tight">
                      Liquidity managed by developers.
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-[280px]">
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase mb-2 px-1">
                  <span>Available Liquidity</span>
                  <span className="text-emerald-400 font-black">Rs. {health?.availableBalance?.toLocaleString() || 0}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
                    style={{ width: `${health ? Math.min(100, (health.availableBalance / health.initialFunds) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase mb-2 px-1">
                  <span>Credit Utilization</span>
                  <span className="text-amber-500 font-black">Rs. {health?.totalActiveLoans?.toLocaleString() || 0}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                    style={{ width: `${health ? Math.min(100, (health.totalActiveLoans / health.initialFunds) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Active Portfolio / History Table */}
        <div ref={portfolioTableRef} className="bg-slate-900/50 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-sm ring-1 ring-white/5 shadow-2xl">
          {/* Table Header */}
          <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-slate-950/40 via-transparent to-transparent">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-[18px] border flex items-center justify-center transition-all duration-500 shadow-inner ${showHistory
                  ? "bg-slate-500/10 border-slate-500/20 text-slate-400 rotate-12"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 -rotate-6 group-hover:rotate-0"
                  }`}>
                  {showHistory ? <HistoryIcon className="w-6 h-6" /> : <HandCoins className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    {showHistory ? "Historical Archive" : "Active Portfolio"}
                    {!showHistory && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] rounded-md border border-emerald-500/20 uppercase tracking-tighter">Live</span>}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
                    {showHistory ? "Audited & Completed Transactions" : "Real-time Credit Monitoring"}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-sm mx-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, account, or amount..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">

                {/* History Toggles */}
                {isAdmin && selectedIds.size === 0 && (
                  <div className="flex items-center gap-2">
                    {showHistory && historyLoans.length > 0 && (
                      <button
                        onClick={() => setActiveModal("clearHistory")}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => { setShowHistory(v => !v); clearSelection(); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${showHistory
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                    >
                      {showHistory ? <HandCoins className="w-3.5 h-3.5" /> : <HistoryIcon className="w-3.5 h-3.5" />}
                      {showHistory ? "Active Loans" : "History"}
                    </button>
                  </div>
                )}

                {!isAdmin && (
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950/50 px-3 py-1.5 rounded-xl border border-white/5">
                    Detailed Transaction History
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Active Portfolio Table ─────────────────────────────── */}
          {!showHistory && (
            loading ? (
              <div className="p-20 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : loans.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-950/10">
                      {isAdmin && (
                        <th className="px-4 py-3 border-b border-slate-800/50 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === loans.length && loans.length > 0}
                            ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < loans.length; }}
                            onChange={toggleSelectAll}
                            className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50">Member</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50">Timeline</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Bal (Orig)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-800/50">Interest Calc & Days</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Paid / Extras</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-500 uppercase tracking-widest text-right border-b border-slate-800/50">Net Outstanding</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {loans.map((loan: any) => {
                      const isSelected = selectedIds.has(loan._id);
                      const totalPaid = loan.totalPaid || 0;
                      const outstanding = Math.max(0, Math.ceil(loan.stats?.totalAmountToPay || 0) - totalPaid);
                      
                      const isDanger = loan.stats.daysSinceLastEvent > 180;
                      const isWarning = loan.stats.daysSinceLastEvent >= 173 && loan.stats.daysSinceLastEvent <= 180;

                      return (
                        <tr
                          key={loan._id}
                          className={`group transition-all duration-300 relative ${
                            isSelected 
                              ? "bg-emerald-500/5 border-l-2 border-emerald-500/40" 
                              : isDanger
                                ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border-l-2 border-rose-500/30"
                                : isWarning
                                  ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border-l-2 border-amber-500/30"
                                  : "hover:bg-slate-800/20"
                          }`}
                        >
                          {isAdmin && (
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(loan._id)}
                                  className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                                />
                                {isDanger && <div title="Exceeded Base Period (Penalty Active)"><AlertCircle className="w-3 h-3 text-rose-500 animate-pulse shrink-0" /></div>}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] ring-1 ring-white/10 transition-all overflow-hidden relative ${isSelected ? "bg-emerald-500/20 text-emerald-400 scale-110" : "bg-slate-800 text-emerald-400 group-hover:scale-110"}`}>
                                {loan.userId?.profileImage ? (
                                  <Image 
                                    src={loan.userId.profileImage} 
                                    alt={loan.userId.name} 
                                    fill 
                                    sizes="32px"
                                    className="object-cover" 
                                  />
                                ) : (
                                  loan.userId?.name?.[0] || 'U'
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{loan.userId?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1.5">
                              <div>
                                <p className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                  {/* Removed */}
                                  {(() => {
                                    const date = (loan.renewalHistory && loan.renewalHistory.length > 0)
                                      ? new Date(loan.renewalHistory[loan.renewalHistory.length - 1].date)
                                      : (loan.activatedAt ? new Date(loan.activatedAt) : null);
                                    return date ? date.toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Requested';
                                  })()}
                                </p>
                                {loan.status === "ACTIVE" && (() => {
                                  const date = (loan.renewalHistory && loan.renewalHistory.length > 0)
                                    ? new Date(loan.renewalHistory[loan.renewalHistory.length - 1].date)
                                    : (loan.activatedAt ? new Date(loan.activatedAt) : null);
                                  if (!date) return null;
                                  const bs = adToBs(date);
                                  return (
                                    <p className="text-[9px] text-emerald-500/70 font-bold tracking-tight whitespace-nowrap">
                                      {/* Removed */}
                                      {bs.year} {NEPALI_MONTHS[bs.month - 1]} {bs.day}
                                    </p>
                                  );
                                })()}
                              </div>
                              {(() => {
                                const latestPmt = (loan.payments || [])
                                  .filter((p: any) => p.type === 'PRINCIPAL')
                                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                                const latestRenewal = (loan.renewalHistory || [])
                                  .sort((a: any, b: any) => new Date(b.newDueDate).getTime() - new Date(a.newDueDate).getTime())[0];

                                const activityDate = [
                                  latestPmt ? new Date(latestPmt.date) : null,
                                  latestRenewal ? new Date(latestRenewal.date || latestRenewal.newDueDate) : null
                                ].filter(Boolean).sort((a: any, b: any) => b.getTime() - a.getTime())[0];

                                if (!activityDate) return null;

                                const activityBs = adToBs(activityDate);
                                return (
                                  <div className="pt-1.5 mt-0.5 border-t border-white/5 border-dashed">
                                    <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-black mb-0.5">Last Activity</p>
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-amber-500/80 font-bold whitespace-nowrap">{activityDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      <span className="text-[8px] text-amber-500/80 font-bold whitespace-nowrap">{activityBs.year} {NEPALI_MONTHS[activityBs.month - 1]} {activityBs.day}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right flex flex-col justify-end">
                            <span className="font-black text-white text-[13px]">
                              Rs. {(loan.balanceAmount !== undefined ? loan.balanceAmount : loan.principalAmount).toLocaleString()}
                            </span>
                            {(loan.balanceAmount !== undefined && loan.balanceAmount < loan.principalAmount) && (
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight line-through">
                                Orig: {loan.principalAmount.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-2 items-center">
                              <div className="flex flex-col items-center">
                                <p className={`text-[11px] font-black whitespace-nowrap ${loan.stats.unpaidBaseInterest > 0 ? "text-blue-400" : "text-slate-500 opacity-50"}`}>
                                  Rs. {Math.ceil(loan.stats.unpaidBaseInterest).toLocaleString()}
                                </p>

                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest border border-white/5 bg-white/5 px-1 rounded">
                                    {loan.interestRate}%
                                  </span>
                                  <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/5 ${loan.stats.unpaidBaseInterest > 0 ? "bg-blue-500/5 text-blue-400/80" : "bg-slate-900 text-slate-600"}`}>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="text-[9px] font-black">{loan.stats.daysSinceLastEvent}d</span>
                                  </div>
                                </div>
                                {loan.stats.totalDays !== loan.stats.daysSinceLastEvent && (
                                  <p className="text-[7px] text-slate-600 font-black uppercase tracking-tighter mt-1">
                                    Total Life: {loan.stats.totalDays}d
                                  </p>
                                )}
                              </div>
                              {loan.stats.unpaidPenaltyInterest > 0 && (
                                <div className="pt-2 mt-1 border-t border-white/5 border-dashed flex flex-col items-center">
                                  <p className="text-[8px] uppercase tracking-tighter text-rose-500/70 font-black mb-0.5">Unpaid Penalty</p>
                                  <span className="text-[11px] text-rose-400 font-black whitespace-nowrap">Rs. {Math.ceil(loan.stats.unpaidPenaltyInterest).toLocaleString()}</span>

                                  <span className="text-[8px] text-rose-500/50 font-bold uppercase tracking-widest mt-0.5">Rate: {loan.penaltyRate || 20}%</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              {totalPaid > 0 && (
                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter">
                                  Paid: Rs. {Math.ceil(totalPaid).toLocaleString()}
                                </span>
                              )}
                              <span className={`text-[9px] font-black uppercase tracking-tighter transition-all ${loan.stats?.isServiceChargePaid ? 'text-emerald-500/30 line-through' : 'text-slate-500'}`}>
                                SC: Rs. {Math.ceil(loan.serviceChargeAmount || 0).toLocaleString()}
                              </span>
                              {(loan.renewalAmount || 0) > 0 && (
                                <span className={`text-[9px] font-black uppercase tracking-tighter transition-all ${loan.stats?.isRenewalChargePaid ? 'text-emerald-500/30 line-through' : 'text-slate-400'}`}>
                                  RN: Rs. {Math.ceil(loan.renewalAmount || 0).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-black text-emerald-400 text-[13px]">
                                Rs. {Math.max(0, Math.round(outstanding - (loan.userId?.advanceBalance || 0))).toLocaleString()}
                              </span>
                              {(loan.userId?.advanceBalance || 0) > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tight">
                                    Incl. Rs. {Math.ceil(loan.userId.advanceBalance).toLocaleString()} Credit
                                  </span>
                                  <Info className="w-2.5 h-2.5 text-blue-500/50" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                              {loan.status === "PENDING" && (
                                <>
                                  {(user.isLoanApprover || isAdmin) && !loan.approvedByIds.includes(user.id) && (
                                    <button onClick={() => handleApprove(loan._id)} className="w-full text-[9px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-lg transition-all shadow-lg shadow-blue-500/10 active:scale-95 text-center">
                                      Approve
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button onClick={() => handleVerify(loan._id)} className="w-full text-[9px] font-black text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg transition-all shadow-lg shadow-rose-500/10 active:scale-95 text-center">
                                      Quick
                                    </button>
                                  )}
                                </>
                              )}
                              {loan.status === "APPROVED" && isAdmin && (
                                <button onClick={() => handleVerify(loan._id)} className="w-full text-[9px] font-black text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-emerald-500/10 active:scale-95 text-center">
                                  Activate
                                </button>
                              )}
                              {loan.status === "ACTIVE" && (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                  <ShieldCheck className="w-2 h-2" />
                                  Active
                                </span>
                              )}
                              {loan.renewalCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                  <RefreshCw className="w-2 h-2" />
                                  Renewed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="px-8 py-4 bg-slate-950/20 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Showing <span className="text-white">{loans.length}</span> of <span className="text-white">{pagination.total}</span> Entries
                    </p>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1); // Reset to first page when limit changes
                        }}
                        className="bg-transparent text-[10px] font-black text-emerald-400 outline-none cursor-pointer hover:text-emerald-300 transition-colors"
                      >
                        {[10, 20, 50, 100].map(val => (
                          <option key={val} value={val} className="bg-slate-900 text-white">
                            {val}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl transition-all border border-white/5"
                    >
                      <Plus className="w-4 h-4 text-white rotate-45" />
                    </button>
                    <span className="text-[10px] font-black text-white uppercase bg-slate-800 px-3 py-1.5 rounded-xl border border-white/5">
                      Page {currentPage} / {pagination.pages}
                    </span>
                    <button
                      disabled={currentPage === pagination.pages}
                      onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl transition-all border border-white/5"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-2xl">
                  <HandCoins className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Portfolio is Empty</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Apply for financial assistance to see loan details and repayment tracking here.</p>
              </div>
            )
          )}

          {/* ── History Table ──────────────────────────────────────── */}
          {showHistory && (
            historyLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-950/10">
                      {isAdmin && (
                        <th className="px-5 py-3 border-b border-slate-800/50 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === historyLoans.length && historyLoans.length > 0}
                            ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < historyLoans.length; }}
                            onChange={toggleSelectAll}
                            className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50">Member</th>
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Active Balance</th>
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-800/50">Status</th>
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Total Paid</th>
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-800/50">Closed Date</th>
                      <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-800/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {historyLoans.map((loan: any) => {
                      const isSelected = selectedIds.has(loan._id);
                      const isDeleted = loan.status === "DELETED";
                      const closedDate = isDeleted ? loan.deletedAt : loan.completedAt;
                      const bsClosed = closedDate ? adToBs(new Date(closedDate)) : null;
                      return (
                        <tr key={loan._id} className={`group transition-all duration-200 ${isSelected ? "bg-emerald-500/5 border-l-2 border-emerald-500/40" : "hover:bg-slate-800/10"}`}>
                          {isAdmin && (
                            <td className="px-5 py-3.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(loan._id)}
                                className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[9px] ring-1 ring-white/5 overflow-hidden relative ${isDeleted ? "bg-rose-900/30 text-rose-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                                {loan.userId?.profileImage ? (
                                  <Image 
                                    src={loan.userId.profileImage} 
                                    alt={loan.userId.name} 
                                    fill 
                                    sizes="28px"
                                    className="object-cover" 
                                  />
                                ) : (
                                  loan.userId?.name?.[0] || 'U'
                                )}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-300">{loan.userId?.name}</p>
                                <p className="text-[9px] text-slate-600 font-medium">{loan.reason?.substring(0, 30)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right flex flex-col justify-end">
                            <span className="font-black text-slate-400 text-[11px]">
                              Rs. {(loan.balanceAmount !== undefined ? loan.balanceAmount : loan.principalAmount).toLocaleString()}
                            </span>
                            {(loan.balanceAmount !== undefined && loan.balanceAmount < loan.principalAmount) && (
                              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tight line-through">
                                Orig: {loan.principalAmount.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${isDeleted
                              ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              }`}>
                              {isDeleted ? <Trash2 className="w-2 h-2" /> : <CheckCircle2 className="w-2 h-2" />}
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-slate-300 text-[11px]">
                            Rs. {(loan.totalPaid || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {closedDate ? (
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold">{new Date(closedDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                                {bsClosed && (
                                  <p className="text-[9px] text-slate-600 font-medium">
                                    {bsClosed.year} {NEPALI_MONTHS[bsClosed.month - 1]} {bsClosed.day}
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-2">
                              {isAdmin && !isDeleted && (
                                <button
                                  onClick={() => handleUndo(loan._id)}
                                  className="p-2 text-slate-500 hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 border border-white/5 rounded-xl transition-all"
                                  title="Undo Last Settlement"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedIds(new Set([loan._id])); setActiveModal("details"); }}
                                className="p-2 text-slate-500 hover:text-blue-400 bg-white/5 hover:bg-blue-500/10 border border-white/5 rounded-xl transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-8 py-4 bg-slate-950/20 border-t border-slate-800">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    {historyLoans.length} historical record(s) management
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                  <HistoryIcon className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Completed and deleted loans will appear here.</p>
              </div>
            )
          )}
        </div>

        {/* Interest Calculator */}
        <div className="p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-[32px] ring-1 ring-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full group-hover:bg-blue-500/10 transition-all duration-1000" />
          <div className="flex flex-col lg:flex-row gap-12 relative z-10">
            <div className="lg:w-1/3 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Calculator className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Smart Interest Calculator</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Plan repayment strategy. Uses live rates to calculate accrued interest and penalties.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Base Rate</p>
                  <p className="text-lg font-black text-blue-400">12.0% <span className="text-[10px] text-slate-500">P.A.</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Penalty Rate</p>
                  <p className="text-lg font-black text-rose-500">20.0% <span className="text-[10px] text-slate-500">P.A.</span></p>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 font-black uppercase px-2">Principal Amount</p>
                  <input
                    type="number"
                    value={calculatingAmount}
                    onChange={e => setCalculatingAmount(Number(e.target.value))}
                    className="w-full bg-slate-950/20 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black text-lg focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 font-black uppercase px-2">Duration (Days)</p>
                  <input
                    type="number"
                    value={calculatingDays}
                    onChange={e => setCalculatingDays(Number(e.target.value))}
                    className="w-full bg-slate-950/20 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black text-lg focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-6 bg-slate-950/50 rounded-[28px] border border-white/5 relative overflow-hidden group/card shadow-inner">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                  <div className="relative z-10">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Accrued Interest</p>
                    <p className="text-2xl font-black text-white">Rs. {calculated.total.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-rose-500 mt-1">Includes Rs. {calculated.exceed.toLocaleString()} penalty</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-slate-800 opacity-20 group-hover/card:opacity-100 transition-all" />
                </div>
                <div className="flex items-center justify-between p-6 bg-emerald-600/5 rounded-[28px] border border-emerald-500/10 relative overflow-hidden group/card shadow-inner">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full" />
                  <div className="relative z-10">
                    <p className="text-[10px] text-emerald-500 font-black uppercase mb-1">Estimated Total Due</p>
                    <p className="text-3xl font-black text-white">Rs. {(calculatingAmount + calculated.total).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">* Principal + Net Accruals</p>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-emerald-500 opacity-20 group-hover/card:opacity-100 transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {/* Apply Loan Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto py-10">
          <LoanRequestForm
            userId={user.id}
            organizationId={organizationId}
            isAdmin={isAdmin}
            onSuccess={() => { setShowApplyModal(false); fetchData(); }}
            onCancel={() => setShowApplyModal(false)}
          />
        </div>
      )}

      {/* Settle Modal */}
      {activeModal === "settle" && singleSelectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <LoanSettleModal
            loan={singleSelectedLoan}
            adminId={user.id}
            onSuccess={onModalSuccess}
            onClose={() => setActiveModal(null)}
          />
        </div>
      )}


      {/* Details Modal */}
      {activeModal === "details" && singleSelectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <LoanDetailsModal
            loan={singleSelectedLoan}
            onClose={() => setActiveModal(null)}
          />
        </div>
      )}

      {/* Delete Confirm Modal */}
      {activeModal === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-rose-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Trash2 className="w-6 h-6 text-rose-500 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Delete {selectedIds.size} Record(s)</h1>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Critical Administrative Action</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
              <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-3">
                <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest px-1">Loans to be removed</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {Array.from(selectedIds).map(id => {
                    const l = loans.find(x => x._id === id);
                    return l ? (
                      <div key={id} className="flex justify-between items-center px-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl group/item">
                        <span className="text-[11px] font-bold text-slate-300">{l.userId?.name}</span>
                        <span className="text-[10px] font-black text-rose-400 group-hover:scale-110 transition-transform">Rs. {l.principalAmount?.toLocaleString()}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="flex gap-3 bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-400/80 font-bold leading-relaxed">
                  Deletion will soft-remove records from the active portfolio. This action is logged for audit purposes and members will be notified.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1 flex items-center gap-2">
                  <LockIcon className="w-3.5 h-3.5 text-slate-600" />
                  Admin Password Confirmation
                </p>
                <div className="relative group/input">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleDeleteConfirm()}
                    placeholder="Verify password to proceed"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:border-rose-500/50 transition-all outline-none placeholder:text-slate-800 text-sm"
                  />
                </div>
                {deleteError && (
                  <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-lg border border-rose-400/20 animate-in shake-in-1 duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{deleteError}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions - Integrated into scroll */}
              <div className="flex gap-4 pt-10 pb-4">
                <button
                  onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                  className="flex-1 py-5 bg-white/[0.03] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] active:scale-95"
                >
                  Abort
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading || !deletePassword}
                  className="flex-[1.5] py-5 bg-gradient-to-r from-rose-600 to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(225,29,72,0.3)] active:scale-95 hover:brightness-110"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Modal */}
      {activeModal === "clearHistory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-rose-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <AlertCircle className="w-6 h-6 text-rose-500 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Clear Entire Archive</h1>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Permanent Destructive Action</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
              <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <p className="text-xs text-rose-400 font-bold leading-relaxed">
                    You are about to permanently wipe all <strong>{historyLoans.length}</strong> historical records from the database. This action cleans up COMPLETED and DELETED loans.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1 flex items-center gap-2">
                  <LockIcon className="w-3.5 h-3.5 text-slate-600" />
                  Admin Password Confirmation
                </p>
                <div className="relative group/input">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleClearHistoryConfirm()}
                    placeholder="Verify password to proceed"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:border-rose-500/50 transition-all outline-none placeholder:text-slate-800 text-sm"
                  />
                </div>
                {deleteError && (
                  <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-lg border border-rose-400/20 animate-in shake-in-1 duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{deleteError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-10 pb-4">
                <button
                  onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                  className="flex-1 py-5 bg-white/[0.03] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] active:scale-95"
                >
                  Abort
                </button>
                <button
                  onClick={handleClearHistoryConfirm}
                  disabled={deleteLoading || !deletePassword}
                  className="flex-[1.5] py-5 bg-gradient-to-r from-rose-600 to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(225,29,72,0.3)] active:scale-95 hover:brightness-110"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Clear All History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Settlement Modal */}
      {activeModal === "undo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-amber-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <RotateCcw className="w-6 h-6 text-amber-500 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Revert Settlement</h1>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">Undo Last Transaction</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
              <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-400/80 font-bold leading-relaxed">
                    You are about to UNDO the last transaction recorded for this loan. This will delete the payment entries and restore the original interest/principal balances.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1 flex items-center gap-2">
                  <LockIcon className="w-3.5 h-3.5 text-slate-600" />
                  Admin Password Confirmation
                </p>
                <div className="relative group/input">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleUndoConfirm()}
                    placeholder="Verify password to proceed"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:border-amber-500/50 transition-all outline-none placeholder:text-slate-800 text-sm"
                  />
                </div>
                {deleteError && (
                  <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-lg border border-rose-400/20 animate-in shake-in-1 duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{deleteError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-10 pb-4">
                <button
                  onClick={() => { setActiveModal(null); setDeletePassword(""); setDeleteError(""); }}
                  className="flex-1 py-5 bg-white/[0.03] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] active:scale-95"
                >
                  Abort Action
                </button>
                <button
                  onClick={handleUndoConfirm}
                  disabled={deleteLoading || !deletePassword}
                  className="flex-[1.5] py-5 bg-gradient-to-r from-amber-600 to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[11px] flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95 hover:brightness-110"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activation Confirmation Modal */}
      {activeModal === "activate" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Activate Loan</h1>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">Verification & Disbursement</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="px-8 py-4 space-y-6">
              <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-4 justify-between bg-slate-950/50 p-4 rounded-xl border border-white/5 group cursor-pointer" 
                     onClick={() => setRecordOutflow(!recordOutflow)}>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest">Record as Bank Outflow</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                      {recordOutflow ? "Money is leaving the organization now" : "Historic migration (No cash leaves today)"}
                    </p>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all relative ${recordOutflow ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${recordOutflow ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>

                {!recordOutflow && (
                  <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-2">
                    <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-[9px] text-blue-300 font-bold uppercase leading-tight">
                      Ledger Safety: This loan will be activated without adding a new disbursement record to the bank ledger.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 pb-8">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black uppercase tracking-widest rounded-2xl transition-all text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyConfirm}
                  disabled={deleteLoading}
                  className="flex-[1.5] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all text-[10px] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Finalize Activation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Audit Modal (Collected Interest / Fees) */}
      {activeModal === "revenueAudit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Banknote className="w-6 h-6 text-emerald-400 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">{auditTitle}</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Chronological Audit Trail</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); setAuditData([]); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Tabs for SC/RC */}
            {recordTypes.includes("SERVICE_CHARGE") && (
              <div className="px-8 pb-4 flex gap-4 shrink-0">
                {[
                  { id: "SERVICE_CHARGE", label: "Service Charges" },
                  { id: "RENEWAL", label: "Renewal Fees" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAuditTab(tab.id)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${auditTab === tab.id ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-white/5 text-slate-500 hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
              {auditLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin opacity-20" />
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditData
                        .filter(d => recordTypes.includes("SERVICE_CHARGE") ? d.type === auditTab : true)
                        .map((record, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                {(() => {
                                  const bDate = adToBs(record.date);
                                  return (
                                    <>
                                      <span className="text-[11px] font-bold text-slate-300">
                                        {bDate.day} {NEPALI_MONTHS[bDate.month - 1]} {bDate.year}
                                      </span>
                                      <span className="text-[9px] text-slate-600 uppercase tracking-tighter">
                                        {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-[10px] text-emerald-400 overflow-hidden relative shadow-inner">
                                  {record.userImage ? (
                                    <Image 
                                      src={record.userImage} 
                                      alt={record.userName} 
                                      fill 
                                      sizes="32px"
                                      className="object-cover" 
                                    />
                                  ) : (
                                    record.userName?.[0] || 'U'
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-white tracking-tight uppercase">{record.userName}</span>
                                  <span className="text-[9px] text-slate-600 font-bold">#{record.accountNumber}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs font-black text-emerald-400">Rs. {record.amount.toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between shrink-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">All records are verified and irreversible.</p>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Current Scope Total</p>
                <p className="text-xl font-black text-white">
                  Rs. {auditData
                    .filter(d => recordTypes.includes("SERVICE_CHARGE") ? d.type === auditTab : true)
                    .reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Payment Audit Modal */}
      {activeModal === "advanceAudit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-6xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Banknote className="w-6 h-6 text-blue-500 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">{auditTitle}</h1>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">Comprehensive Member Credit Audit</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  {[
                    { id: "available", label: "Available Credit", icon: Wallet },
                    { id: "cleared", label: "Cleared Credit", icon: FileClock }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdvanceSubTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${advanceSubTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"}`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
                >
                  <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
              {auditLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] animate-pulse">Retrieving Ledger...</p>
                  </div>
                </div>
              ) : advanceSubTab === "available" ? (
                // AVAILABLE CREDIT VIEW (User Balances)
                auditUserBalances.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                    <Info className="w-10 h-10 text-slate-700" />
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No active credit balances found.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Account</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Current Available Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {auditUserBalances.map((user, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-[10px] text-emerald-400 overflow-hidden relative shadow-inner">
                                  {user.profileImage ? (
                                    <Image 
                                      src={user.profileImage} 
                                      alt={user.name} 
                                      fill 
                                      sizes="32px"
                                      className="object-cover" 
                                    />
                                  ) : (
                                    user.name?.[0] || 'U'
                                  )}
                                </div>
                                <span className="text-xs font-bold text-white uppercase tracking-tight">{user.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-[10px] text-slate-500">
                              #{user.accountNumber}
                            </td>
                            <td className="px-6 py-5 text-right font-black text-emerald-400 text-sm tabular-nums">
                              Rs. {user.advanceBalance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                // CLEARED CREDIT VIEW (History)
                auditData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                    <Info className="w-10 h-10 text-slate-700" />
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No transaction history found.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date (BS/AD)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Credit Earned</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Source Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {auditData.map((record, idx) => {
                          const bDate = adToBs(new Date(record.date));
                          return (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-[10px] text-blue-400 overflow-hidden relative shadow-inner">
                                    {record.userImage ? (
                                      <Image 
                                        src={record.userImage} 
                                        alt={record.userName} 
                                        fill 
                                        sizes="32px"
                                        className="object-cover" 
                                      />
                                    ) : (
                                      record.userName?.[0] || 'U'
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white uppercase tracking-tight">{record.userName}</span>
                                    <span className="text-[9px] text-slate-500 font-medium">#{record.accountNumber}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-300">{bDate.day} {NEPALI_MONTHS[bDate.month - 1]} {bDate.year}</span>
                                  <span className="text-[9px] text-slate-600 uppercase tracking-tighter">{new Date(record.date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right font-black text-blue-400 text-xs tabular-nums">
                                Rs. {record.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                  {record.source === "LOAN" ? "Settlement Overpayment" : "Regular Deposit"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            <div className="px-8 py-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between shrink-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                {advanceSubTab === "available"
                  ? "Real-time snapshot of currently held member credits."
                  : "Chronological history of credits earned through settlements and deposits."}
              </p>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
                  {advanceSubTab === "available" ? "Total Available Pool" : "Historical Credits Recorded"}
                </p>
                <p className={`text-xl font-black ${advanceSubTab === "available" ? "text-emerald-400" : "text-blue-400"}`}>
                  Rs. {(advanceSubTab === "available"
                    ? auditUserBalances.reduce((sum, u) => sum + u.advanceBalance, 0)
                    : auditData.reduce((sum, r) => sum + r.amount, 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals Modal */}
      {activeModal === "pendingApprovals" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-6xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[92vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-amber-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Clock className="w-6 h-6 text-amber-500 relative z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Manage Pending Approvals</h1>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">High-Priority Administrative Queue</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
              {loans.filter(l => l.status === "PENDING").length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/30" />
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Queue is clear. No pending requests.</p>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Requested Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Principal</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Approvals</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loans.filter(l => l.status === "PENDING").map((loan: any) => {
                        const bDate = adToBs(new Date(loan.createdAt));
                        return (
                          <tr key={loan._id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-[10px] text-amber-400 overflow-hidden relative shadow-inner">
                                  {loan.userId?.profileImage ? (
                                    <Image 
                                      src={loan.userId.profileImage} 
                                      alt={loan.userId?.name} 
                                      fill 
                                      sizes="32px"
                                      className="object-cover" 
                                    />
                                  ) : (
                                    loan.userId?.name?.[0] || 'U'
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase tracking-tight">{loan.userId?.name}</span>
                                  <span className="text-[9px] text-slate-500 font-medium">#{loan.userId?.accountNumber || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-300">{bDate.day} {NEPALI_MONTHS[bDate.month - 1]} {bDate.year}</span>
                                <span className="text-[9px] text-slate-600 uppercase tracking-tighter">{new Date(loan.createdAt).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-white text-xs">
                              Rs. {loan.principalAmount?.toLocaleString()}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase">{loan.approvedByIds.length} / 2</span>
                                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 transition-all duration-500"
                                    style={{ width: `${(loan.approvedByIds.length / 2) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                {(user.isLoanApprover || isAdmin) && !loan.approvedByIds.includes(user.id) && (
                                  <button
                                    onClick={() => handleApprove(loan._id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                                  >
                                    Approve
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleVerify(loan._id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                                  >
                                    Quick Verify
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between shrink-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Approvals require multi-signature verification based on policy.</p>
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contextual Action Bar (Floating) ────────────────────── */}
      <AnimatePresence>
        {isAdmin && selectedIds.size > 0 && !activeModal && !showApplyModal && (
          <motion.div 
            initial={{ y: 100, x: "-50%", opacity: 0 }}
            animate={{ 
              y: [0, -4, 0], // Floating bob animation
              x: "-50%", 
              opacity: 1 
            }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut"
              },
              opacity: { duration: 0.3 }
            }}
            exit={{ y: 100, x: "-50%", opacity: 0 }}
            className="fixed bottom-10 left-1/2 z-[100] flex items-center gap-4 px-5 py-3 bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1)] ring-1 ring-white/10"
          >
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <div className="relative">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-emerald-400">
                  {selectedIds.size}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white font-black uppercase tracking-widest leading-none">Selected</span>
                <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight mt-1">Actions Ready</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!showHistory && selectedIds.size === 1 && singleSelectedLoan?.status === "ACTIVE" && (
                <button
                  onClick={() => setActiveModal("settle")}
                  className="group relative flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)] active:scale-95 overflow-hidden"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="tracking-[0.1em]">Settle Loan</span>
                </button>
              )}

              {selectedIds.size === 1 && (
                <button
                  onClick={() => setActiveModal("details")}
                  className="group relative flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-[0_10px_25px_rgba(37,99,235,0.15)] active:scale-95 overflow-hidden"
                >
                  <Eye className="w-4 h-4" />
                  <span className="tracking-[0.1em]">Profile</span>
                </button>
              )}

              <button
                onClick={() => setActiveModal("delete")}
                className="group relative flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-[0_10px_25px_rgba(225,29,72,0.15)] active:scale-95 overflow-hidden"
              >
                <Trash2 className="w-4 h-4" />
                <span className="tracking-[0.1em]">Delete</span>
              </button>
            </div>

            <button
              onClick={clearSelection}
              className="ml-2 p-3 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-2xl transition-all group border border-transparent hover:border-rose-500/20"
              title="Cancel Selection"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
