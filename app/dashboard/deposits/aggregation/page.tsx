"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  PiggyBank,
  Search,
  Filter,
  Download,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  ChevronDown,
  Building2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Calendar as CalendarIcon,
  User as UserIcon
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from "react-hot-toast";
import PageHeader from "@/components/dashboard/PageHeader";
import RevenueAggregationForm from "@/components/dashboard/RevenueAggregationForm";
import TransferCreditModal from "@/components/dashboard/TransferCreditModal";
import {
  getAggregations,
  deleteAggregation
} from "@/lib/actions/aggregation";
import { getAdminDepositStats } from "@/lib/actions/deposit";
import { getCurrentNepaliDate, NEPALI_MONTHS, adToBs } from "@/lib/utils/nepali-date";

export default function AggregationPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";
  const orgId = currentUser?.organizationId;

  // State
  const [showAddForm, setShowAddForm] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lifetimeStats, setLifetimeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingDeposit, setEditingDeposit] = useState<any>(null);
  const [transferringAgg, setTransferringAgg] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState(getCurrentNepaliDate().year);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const queryMonth = filterMonth === "all" ? "all" : `${NEPALI_MONTHS[filterMonth - 1]} ${filterYear}`;
    const [depRes, statsRes, lifetimeRes] = await Promise.all([
      getAggregations({
        organizationId: orgId,
        page,
        limit: 15,
        search,
        month: queryMonth
      }),
      isAdmin ? getAdminDepositStats(orgId, queryMonth) : Promise.resolve({ success: false }),
      isAdmin ? getAdminDepositStats(orgId, "all") : Promise.resolve({ success: false })
    ]);

    if (depRes.success) {
      setDeposits(depRes.data as any);
      setTotalPages(depRes.pagination?.pages || 1);
      setTotalRecords(depRes.pagination?.total || 0);
    }
    if (statsRes && statsRes.success) {
      setStats((statsRes as any).data);
    }
    if (lifetimeRes && lifetimeRes.success) {
      setLifetimeStats((lifetimeRes as any).data);
    }
    setLoading(false);
  }, [orgId, page, filterMonth, filterYear, search, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportToExcel = () => {
    const data = deposits.map(d => ({
      Date: new Date(d.depositDate).toLocaleDateString(),
      Month: d.month,
      Type: d.depositType,
      Amount: d.amount,
      Member: d.userId?.name || 'N/A',
      Status: d.status,
      Remarks: d.remarks || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aggregation");
    const monthStr = filterMonth === "all" ? "All_Months" : NEPALI_MONTHS[(filterMonth as number) - 1];
    XLSX.writeFile(wb, `Aggregation_Report_${monthStr}_${filterYear}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Revenue Aggregation"
        description="NAV Collections & Miscellaneous Deposits"
        actions={(
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-6 py-3 bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 rounded-2xl text-[10px] font-black text-slate-400 hover:text-emerald-400 transition-all uppercase tracking-widest"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Data
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black text-white transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                New Aggregation
              </button>
            )}
          </div>
        )}
      />

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "NAV Position", val: stats?.navCollection || 0, lifetime: lifetimeStats?.navCollection || 0, color: "text-emerald-400", icon: Building2 },
          { label: "Misc Revenue", val: stats?.miscellaneous || 0, lifetime: lifetimeStats?.miscellaneous || 0, color: "text-blue-400", icon: TrendingUp },
          { label: "Total Assets", val: (stats?.navCollection || 0) + (stats?.miscellaneous || 0), lifetime: (lifetimeStats?.navCollection || 0) + (lifetimeStats?.miscellaneous || 0), color: "text-white", icon: PiggyBank },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-6 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <div className="flex flex-col">
                    <h4 className={`text-2xl font-black ${s.color} tracking-tighter`}>Rs. {s.val.toLocaleString('en-IN')}</h4>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                      Lifetime: <span className="text-slate-400">Rs. {s.lifetime.toLocaleString('en-IN')}</span>
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-white/5 rounded-xl">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search aggregation records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* All Transactions Button */}
          <button
            onClick={() => { setFilterMonth("all"); setPage(1); }}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all ${filterMonth === "all"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5"
              : "bg-slate-950 border-slate-800 text-slate-500 hover:text-white hover:bg-white/5"
              }`}
          >
            All Transactions
          </button>

          <div className="w-px h-6 bg-slate-800 mx-2" />

          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-inner relative z-30">
            <button
              onClick={() => {
                const currentMonth = filterMonth === "all" ? getCurrentNepaliDate().month : filterMonth;
                if (currentMonth === 1) {
                  setFilterMonth(12);
                  setFilterYear(prev => prev - 1);
                } else {
                  setFilterMonth(currentMonth - 1);
                }
                setPage(1);
              }}
              className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <div className="relative">
              <button
                onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/5 rounded-xl transition-all ${filterMonth !== "all" ? "text-emerald-400" : "text-slate-600"}`}
              >
                {filterMonth === "all" ? "Select Month" : NEPALI_MONTHS[filterMonth - 1]}
                <ChevronDown className={`w-3 h-3 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showMonthDropdown && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 grid grid-cols-1 gap-1 max-h-64 overflow-y-auto custom-scrollbar">
                    {NEPALI_MONTHS.map((m, i) => (
                      <button
                        key={m}
                        onClick={() => { setFilterMonth(i + 1); setShowMonthDropdown(false); setPage(1); }}
                        className={`text-[9px] font-black uppercase p-2 rounded-lg text-left ${filterMonth === i + 1 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => {
                const currentMonth = filterMonth === "all" ? getCurrentNepaliDate().month : filterMonth;
                if (currentMonth === 12) {
                  setFilterMonth(1);
                  setFilterYear(prev => prev + 1);
                } else {
                  setFilterMonth(currentMonth + 1);
                }
                setPage(1);
              }}
              className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            <button
              onClick={() => { setFilterYear(prev => prev - 1); setPage(1); }}
              className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <div className="relative">
              <button
                onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/5 rounded-xl transition-all ${filterMonth !== "all" ? "text-blue-400" : "text-slate-600"}`}
              >
                {filterYear}
                <ChevronDown className={`w-3 h-3 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showYearDropdown && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {[2080, 2081, 2082, 2083, 2084, 2085].map(y => (
                      <button
                        key={y}
                        onClick={() => { setFilterYear(y); setShowYearDropdown(false); setPage(1); }}
                        className={`text-[9px] font-black uppercase p-2 rounded-lg text-left ${filterYear === y ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                      >
                        {y}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { setFilterYear(prev => prev + 1); setPage(1); }}
              className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Aggregation Ledger */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/30">
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Asset Type</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Txn Date (AD/BS)</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Month</th>
                <th className="py-5 px-8 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Audit Remarks</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-500/20" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Scanning Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : deposits.length > 0 ? (
                deposits.map((d) => (
                  <tr key={d._id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${d.type === 'NAV' ? 'bg-emerald-500' :
                              d.type === 'ADVANCE' ? 'bg-indigo-500' :
                                'bg-blue-500'
                            }`} />
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">{d.type}</span>
                        </div>
                        {d.type === 'ADVANCE' && d.memberId && (
                          <div className="flex items-center gap-2 mt-1.5 pl-5">
                            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                              {d.memberId.profileImage ? (
                                <Image
                                  src={d.memberId.profileImage}
                                  alt={d.memberId.name}
                                  fill
                                  sizes="20px"
                                  className="object-cover"
                                />
                              ) : (
                                <UserIcon className="w-2.5 h-2.5 text-slate-500" />
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                              For: {d.memberId.name || "Unknown"} ({d.memberId.accountNumber || "—"})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{new Date(d.date).toLocaleDateString()}</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                          {adToBs(new Date(d.date)).year}-{adToBs(new Date(d.date)).month}-{adToBs(new Date(d.date)).day}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3 text-emerald-500" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">{d.month}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <span className={`text-[13px] font-black ${d.type === 'NAV' ? 'text-emerald-400' :
                          d.type === 'ADVANCE' ? 'text-indigo-400' :
                            'text-blue-400'
                        } tracking-tight`}>
                        Rs. {d.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-[10px] font-medium text-slate-400 italic max-w-xs truncate">{d.remarks || "Institutional flow record"}</p>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {isAdmin && d.type === 'ADVANCE' && d.memberId && (d.memberId.advanceBalance || 0) > 0 && (
                          <button
                            onClick={() => setTransferringAgg(d)}
                            className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-lg text-[10px] font-black uppercase tracking-wider active:scale-90"
                            title="Transfer Credit"
                          >
                            Transfer Credit
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingDeposit(d); setShowAddForm(true); }}
                          className="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/5 active:scale-90"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Permanently purge this institutional aggregation record?')) {
                              const res = await deleteAggregation(d._id);
                              if (res.success) {
                                toast.success('Purged successfully');
                                loadData();
                              } else {
                                toast.error(res.error);
                              }
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <AlertCircle className="w-10 h-10 text-slate-800" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No aggregated revenue found for this period</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-950/40 px-8 py-4 border-t border-slate-800/50 flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Showing {deposits.length} of {totalRecords} Records</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-4 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black text-emerald-400">
                {page} / {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <RevenueAggregationForm
            orgId={orgId}
            onClose={() => { setShowAddForm(false); setEditingDeposit(null); }}
            onSuccess={() => {
              setShowAddForm(false);
              setEditingDeposit(null);
              loadData();
            }}
            initialData={editingDeposit}
            orgConfig={{
              financials: stats?.financials,
              config: stats?.config
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transferringAgg && (
          <TransferCreditModal
            aggregation={transferringAgg}
            adminId={currentUser?.id}
            orgId={orgId}
            onClose={() => setTransferringAgg(null)}
            onSuccess={() => {
              setTransferringAgg(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
