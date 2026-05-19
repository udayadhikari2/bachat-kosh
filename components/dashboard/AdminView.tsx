"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  PiggyBank,
  HandCoins,
  ArrowUpRight,
  Plus,
  MoreVertical,
  Circle,
  Shield,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  RefreshCcw,
  Info,
  TrendingUp,
  FileCheck,
  Wallet,
  CreditCard,
  ShieldCheck,
  Eye,
  EyeOff,
  FileText
} from "lucide-react";
import dynamic from "next/dynamic";
import { NEPALI_MONTHS, getCurrentNepaliDate, getNepaliYearRange, adToBs } from "@/lib/utils/nepali-date";

const AddUserForm = dynamic(() => import("./AddUserForm"), {
  ssr: false
});
import { getUsersByOrg, verifyAdminPassword } from "@/lib/actions/user";
import { getAdminDepositStats, updateOrganizationFinancials, getDeposits } from "@/lib/actions/deposit";
import { getBankLedger } from "@/lib/actions/bank-ledger";
import { getFinancialHealth } from "@/lib/actions/loan";
import { getLoans } from "@/lib/actions/loan";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  accountNumber?: string;
  isLoanApprover: boolean;
  isSecondaryAdmin: boolean;
  isActive: boolean;
}

export default function AdminView() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lifetimeStats, setLifetimeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showLifetime, setShowLifetime] = useState(false);

  const isMonthBeforeBaseline = (mIdx: number, year: number) => {
    if (!lifetimeStats?.financials?.initialOpeningMonth || !lifetimeStats?.financials?.initialOpeningYear) return false;
    const startM = NEPALI_MONTHS.indexOf(lifetimeStats.financials.initialOpeningMonth) + 1;
    const startY = lifetimeStats.financials.initialOpeningYear;
    if (year < startY) return true;
    if (year === startY && mIdx < startM) return true;
    return false;
  };

  // Financial Ledger State
  const current = getCurrentNepaliDate();
  const [targetMonth, setTargetMonth] = useState(current.monthName);
  const [targetYear, setTargetYear] = useState(current.year);
  const orgId = (session?.user as any)?.organizationId;

  async function fetchData(month = targetMonth, year = targetYear) {
    if (!orgId) return;
    setLoading(true);

    // Combine month and year for backend query if both are selected
    const queryMonth = (month && year) ? `${month} ${year}` : (month || "all");

    try {
      const [uResult, sResult, lifetimeResult, ledgerResult, healthResult] = await Promise.all([
        getUsersByOrg(orgId).catch(err => ({ success: false, error: err.message })),
        getAdminDepositStats(orgId, queryMonth).catch(err => ({ success: false, error: err.message })),
        getAdminDepositStats(orgId, "all").catch(err => ({ success: false, error: err.message })),
        getBankLedger(orgId, queryMonth).catch(err => ({ success: false, error: err.message })),
        getFinancialHealth(orgId, month, year).catch(err => ({ success: false, error: err.message }))
      ]);

      if (uResult.success) setUsers((uResult as any).data);
      if (sResult.success) setStats((sResult as any).data);
      if (lifetimeResult.success) setLifetimeStats((lifetimeResult as any).data);
      if (ledgerResult.success) setLedgerData((ledgerResult as any).data);
      if (healthResult.success) setHealthData((healthResult as any).data);
    } catch (error) {
      console.error("[ERROR] AdminView fetchData:", error);
    } finally {
      setLoading(false);
    }
  }
  const isInitialMonth = targetMonth === lifetimeStats?.financials?.initialOpeningMonth && targetYear === lifetimeStats?.financials?.initialOpeningYear;

  const handlePrevMonth = () => {
    const mIdx = NEPALI_MONTHS.indexOf(targetMonth);
    if (mIdx === -1) { // If "All Months" is selected, go to current or last month
      setTargetMonth(NEPALI_MONTHS[11]);
      return;
    }
    let newMonthIdx = mIdx - 1;
    let newYear = targetYear;
    if (newMonthIdx < 0) {
      newMonthIdx = 11;
      newYear -= 1;
    }
    if (!isMonthBeforeBaseline(newMonthIdx + 1, newYear)) {
      setTargetMonth(NEPALI_MONTHS[newMonthIdx]);
      setTargetYear(newYear);
    }
  };

  const handleNextMonth = () => {
    const mIdx = NEPALI_MONTHS.indexOf(targetMonth);
    let newMonthIdx = mIdx + 1;
    let newYear = targetYear;
    if (newMonthIdx > 11) {
      newMonthIdx = 0;
      newYear += 1;
    }
    setTargetMonth(NEPALI_MONTHS[newMonthIdx]);
    setTargetYear(newYear);
  };
  useEffect(() => {
    fetchData(targetMonth, targetYear);
  }, [orgId, targetMonth, targetYear]);

  // Sync default filters with baseline on load
  useEffect(() => {
    if (lifetimeStats?.financials?.initialOpeningMonth && lifetimeStats?.financials?.initialOpeningYear) {
      const startM = NEPALI_MONTHS.indexOf(lifetimeStats.financials.initialOpeningMonth) + 1;
      const startY = lifetimeStats.financials.initialOpeningYear;

      const current = getCurrentNepaliDate();
      if (targetMonth === current.monthName && targetYear === current.year) {
        if (current.year < startY || (current.year === startY && current.month < startM)) {
          setTargetMonth(lifetimeStats.financials.initialOpeningMonth);
          setTargetYear(startY);
        }
      }
    }
  }, [lifetimeStats?.financials]);

  const periodicInflow = stats ? (stats.grandTotalCollection + (stats.totalLoanRepaid || 0)) : 0;
  const periodicOutflow = stats ? ((ledgerData?.totalExpenditure || 0) + (ledgerData?.totalLoanDisbursed || 0) + (ledgerData?.bankCharges || 0)) : 0;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header with Monthly Controller - Floating Terminal */}
      <div className="sticky top-2 z-[100] flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-slate-900/80 p-3 sm:p-4 rounded-[5px] border border-white/10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">Admin Terminal</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Financial Oversight & Ledger Status</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 relative z-50">
          {(targetMonth !== current.monthName || targetYear !== current.year) && (
            <button
              onClick={() => {
                setTargetMonth(current.monthName);
                setTargetYear(current.year);
              }}
              className="text-[10px] uppercase font-black text-rose-500 hover:text-white transition-all bg-rose-500/10 px-3 py-2 rounded-xl"
            >
              Back to Current
            </button>
          )}

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="group flex items-center gap-2 text-[10px] uppercase font-black text-emerald-400 hover:text-white transition-all bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 hover:border-emerald-500"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
            Sync Ledger
          </button>

          <div className="flex items-center gap-4 bg-slate-900/40 p-2 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTargetYear(prev => prev - 1)}
                disabled={isMonthBeforeBaseline(targetMonth ? NEPALI_MONTHS.indexOf(targetMonth) + 1 : 12, targetYear - 1)}
                className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="relative">
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-8 py-2 text-[11px] font-black text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-500/50 cursor-pointer transition-all shadow-inner block w-24 text-center"
                >
                  {getNepaliYearRange(lifetimeStats?.financials?.initialOpeningYear || current.year).map((year: number) => {
                    return (
                      <option key={year} value={year} className="text-slate-300 bg-slate-900">{year}</option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3 h-3 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={() => setTargetYear(prev => prev + 1)}
                className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                disabled={isMonthBeforeBaseline(targetMonth ? NEPALI_MONTHS.indexOf(targetMonth) : 12, targetYear)}
                className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="relative">
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-8 py-2 text-[11px] font-black text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500 hover:border-emerald-500/50 cursor-pointer transition-all shadow-inner block w-32 text-center"
                >
                  <option value="" className="text-slate-500">All Months</option>
                  {NEPALI_MONTHS.map((m, idx) => {
                    const isDisabled = isMonthBeforeBaseline(idx + 1, targetYear);
                    return (
                      <option key={m} value={m} disabled={isDisabled} className={`${isDisabled ? 'text-slate-700' : 'text-slate-300'} bg-slate-900`}>{m}</option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3 h-3 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>
      ) : stats && (
        <>
          {/* Comprehensive Financial Ledger: Split-Audit UI - REBUILD v1 */}
          <div className="space-y-6">
            {/* Top Reconciliation Summary - High Density - Floating */}
            <div className="sticky top-[92px] z-[90] bg-slate-900/80 border border-white/5 rounded-[5px] p-1 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {[
                  { label: "Opening", val: ledgerData?.openingBalance, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/5" },
                  {
                    label: "Inflow",
                    val: (stats.totalApprovedAmount + stats.totalDelayedFinePaid + (stats.totalServiceChargePaid || 0) + (stats.totalLoanInterestPaid || 0) + (stats.totalLoanRepaid || 0) + (stats.bankInterest || 0) + (stats.navCollection || 0) + (stats.miscellaneous || 0) + (stats.totalAdvancedPayment || 0)),
                    icon: ArrowUpRight,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/5"
                  },
                  { label: "Outflow", val: (ledgerData?.totalExpenditure || 0) + (ledgerData?.totalLoanDisbursed || 0) + (ledgerData?.bankCharges || 0), icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/5" },
                  { label: "Closing", val: ledgerData?.closingBalance, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/5" },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} p-4 rounded-[24px] border border-white/5 flex flex-col gap-1 relative group`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                      <s.icon className={`w-3 h-3 ${s.color} opacity-40`} />
                    </div>
                    <p className={`text-sm font-black ${s.color} tracking-tight`}>Rs. {s.val?.toLocaleString('en-IN') || 0}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {/* Collection Cluster (Inflow) */}
              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h3 className="text-[13px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    Collection Audit
                  </h3>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Revenue Streams</span>
                </div>

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-white/5">
                    <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Category</span>
                    <div className="flex gap-10">
                      {!isInitialMonth && (
                        <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest w-40 text-right">Total ({targetMonth || "All"})</span>
                      )}
                      <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest w-40 text-right">
                        {isInitialMonth ? `Initial (${targetMonth})` : `Previous ${targetMonth ? `(Upto ${NEPALI_MONTHS[(NEPALI_MONTHS.indexOf(targetMonth) - 1 + 12) % 12]})` : ""}`}
                      </span>
                      <span className="text-[12px] font-black text-amber-500 uppercase tracking-widest w-40 text-right">Upto ({targetMonth})</span>
                      <div className="w-40 flex items-center justify-end gap-2 group/header">
                        <span className="text-[12px] font-black text-emerald-500 uppercase tracking-widest text-right">Lifetime</span>
                        <button
                          onClick={() => setShowLifetime(!showLifetime)}
                          className="p-1 hover:bg-white/10 rounded-md transition-colors"
                        >
                          {showLifetime ? <EyeOff className="w-3 h-3 text-emerald-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {[
                    { label: "Monthly Deposit", val: isInitialMonth ? 0 : stats.totalApprovedAmount, prev: stats.prev?.totalApprovedAmount, upto: stats.upto?.totalApprovedAmount, lifetime: lifetimeStats?.totalApprovedAmount, icon: UserCheck },
                    { label: "Late Fines", val: isInitialMonth ? 0 : stats.totalDelayedFinePaid, prev: stats.prev?.totalDelayedFinePaid, upto: stats.upto?.totalDelayedFinePaid, lifetime: lifetimeStats?.totalDelayedFinePaid, icon: Clock },
                    { label: "Service Charges", val: isInitialMonth ? 0 : (stats.totalServiceChargePaid || 0), prev: stats.prev?.totalServiceChargePaid, upto: stats.upto?.totalServiceChargePaid, lifetime: lifetimeStats?.totalServiceChargePaid || 0, icon: Shield },
                    { label: "Loan Interest", val: isInitialMonth ? 0 : (stats.totalLoanInterestPaid || 0), prev: stats.prev?.totalLoanInterestPaid, upto: stats.upto?.totalLoanInterestPaid, lifetime: lifetimeStats?.totalLoanInterestPaid || 0, icon: PiggyBank },
                    { label: "Bank Interest", val: isInitialMonth ? 0 : (stats.bankInterest || 0), prev: stats.prev?.bankInterest, upto: stats.upto?.bankInterest, lifetime: lifetimeStats?.bankInterest || 0, icon: Building2 },
                    { label: "NAV Assets", val: isInitialMonth ? 0 : (stats.navCollection || 0), prev: stats.prev?.navCollection, upto: stats.upto?.navCollection, lifetime: lifetimeStats?.navCollection || 0, icon: TrendingUp },
                    { label: "Misc Income", val: isInitialMonth ? 0 : (stats.miscellaneous || 0), prev: stats.prev?.miscellaneous, upto: stats.upto?.miscellaneous, lifetime: lifetimeStats?.miscellaneous || 0, icon: FileCheck },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all group/row">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center">
                          <row.icon className="w-3 h-3 text-slate-500 group-hover/row:text-emerald-500 transition-colors" />
                        </div>
                        <p className="text-[12px] font-black text-slate-300 uppercase tracking-tight">{row.label}</p>
                      </div>
                      <div className="flex gap-10">
                        {!isInitialMonth && (
                          <p className="text-[16px] font-black text-blue-400 tracking-tight w-40 text-right">Rs. {row.val?.toLocaleString('en-IN') || 0}</p>
                        )}
                        <p className="text-[16px] font-black text-slate-500 tracking-tight w-40 text-right">Rs. {row.prev?.toLocaleString('en-IN') || 0}</p>
                        <p className="text-[16px] font-black text-amber-500 tracking-tight w-40 text-right">Rs. {row.upto?.toLocaleString('en-IN') || 0}</p>
                        <p className={`text-[16px] font-black text-emerald-400 tracking-tight w-40 text-right transition-all duration-300 ${showLifetime ? '' : 'blur-[6px] hover:blur-none cursor-help'}`}>
                          Rs. {row.lifetime?.toLocaleString('en-IN') || 0}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* High-Fidelity Cluster Total: Collection */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl shadow-xl relative overflow-hidden group/total">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/[0.02] to-transparent pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover/total:scale-110 transition-transform">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Total Collection ({targetMonth} {targetYear})</p>
                          <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">Verified Revenue</p>
                        </div>
                      </div>
                      <div className="flex gap-10 relative z-10">
                        {!isInitialMonth && (
                          <p className="text-[16px] font-black text-blue-400 w-40 text-right tracking-tight">
                            Rs. {([
                              stats.totalApprovedAmount,
                              stats.totalDelayedFinePaid,
                              stats.totalServiceChargePaid || 0,
                              stats.totalLoanInterestPaid || 0,
                              stats.bankInterest || 0,
                              stats.navCollection || 0,
                              stats.miscellaneous || 0
                            ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                          </p>
                        )}
                        <p className="text-[16px] font-black text-slate-500 w-40 text-right tracking-tight">
                          Rs. {([
                            stats.prev?.totalApprovedAmount,
                            stats.prev?.totalDelayedFinePaid,
                            stats.prev?.totalServiceChargePaid,
                            stats.prev?.totalLoanInterestPaid,
                            stats.prev?.bankInterest,
                            stats.prev?.navCollection,
                            stats.prev?.miscellaneous
                          ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[16px] font-black text-amber-500 w-40 text-right tracking-tight">
                          Rs. {([
                            stats.upto?.totalApprovedAmount,
                            stats.upto?.totalDelayedFinePaid,
                            stats.upto?.totalServiceChargePaid,
                            stats.upto?.totalLoanInterestPaid,
                            stats.upto?.bankInterest,
                            stats.upto?.navCollection,
                            stats.upto?.miscellaneous
                          ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                        </p>
                        <p className={`text-[16px] font-black text-emerald-400 w-40 text-right tracking-tight transition-all duration-300 ${showLifetime ? '' : 'blur-[6px] hover:blur-none cursor-help'}`}>
                          Rs. {([
                            lifetimeStats?.totalApprovedAmount,
                            lifetimeStats?.totalDelayedFinePaid,
                            lifetimeStats?.totalServiceChargePaid,
                            lifetimeStats?.totalLoanInterestPaid,
                            lifetimeStats?.bankInterest,
                            lifetimeStats?.navCollection,
                            lifetimeStats?.miscellaneous
                          ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Asset Recovery & Member Credits Section */}
                  <div className="pt-6 mt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 whitespace-nowrap">Asset Tracking & Credits</span>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    {[
                      {
                        label: "Operational Revenue",
                        val: isInitialMonth ? 0 : ([
                          stats.totalApprovedAmount,
                          stats.totalDelayedFinePaid,
                          stats.totalServiceChargePaid || 0,
                          stats.totalLoanInterestPaid || 0,
                          stats.bankInterest || 0,
                          stats.navCollection || 0,
                          stats.miscellaneous || 0
                        ].reduce((a, b) => (a || 0) + (b || 0), 0)),
                        prev: ([
                          stats.prev?.totalApprovedAmount,
                          stats.prev?.totalDelayedFinePaid,
                          stats.prev?.totalServiceChargePaid,
                          stats.prev?.totalLoanInterestPaid,
                          stats.prev?.bankInterest,
                          stats.prev?.navCollection,
                          stats.prev?.miscellaneous
                        ].reduce((a, b) => (a || 0) + (b || 0), 0)),
                        upto: ([
                          stats.upto?.totalApprovedAmount,
                          stats.upto?.totalDelayedFinePaid,
                          stats.upto?.totalServiceChargePaid,
                          stats.upto?.totalLoanInterestPaid,
                          stats.upto?.bankInterest,
                          stats.upto?.navCollection,
                          stats.upto?.miscellaneous
                        ].reduce((a, b) => (a || 0) + (b || 0), 0)),
                        lifetime: ([
                          lifetimeStats?.totalApprovedAmount,
                          lifetimeStats?.totalDelayedFinePaid,
                          lifetimeStats?.totalServiceChargePaid || 0,
                          lifetimeStats?.totalLoanInterestPaid || 0,
                          lifetimeStats?.bankInterest || 0,
                          lifetimeStats?.navCollection || 0,
                          lifetimeStats?.miscellaneous || 0
                        ].reduce((a, b) => (a || 0) + (b || 0), 0)),
                        icon: PiggyBank, color: "text-emerald-400", bg: "bg-emerald-500/10"
                      },
                      {
                        label: "Principal Repayment",
                        val: isInitialMonth ? 0 : (stats.totalLoanRepaid || 0),
                        prev: stats.prev?.totalLoanRepaid,
                        upto: stats.upto?.totalLoanRepaid,
                        lifetime: (lifetimeStats?.totalLoanRepaid || 0),
                        icon: HandCoins, color: "text-blue-400", bg: "bg-blue-500/10",
                        showInlineList: true,
                        listType: 'principal'
                      },
                      {
                        label: "Advanced Credit (Inflow)",
                        val: isInitialMonth ? 0 : (stats.totalAdvancedPayment || 0),
                        prev: stats.prev?.totalAdvancedPayment,
                        upto: stats.upto?.totalAdvancedPayment,
                        lifetime: (lifetimeStats?.totalAdvancedPayment || 0),
                        icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/10",
                        showDetails: true,
                        showInlineList: true,
                        listType: 'advance'
                      },
                      {
                        label: "Advance Credit Used",
                        val: isInitialMonth ? 0 : (stats.totalCreditUsed || 0),
                        prev: stats.prev?.totalCreditUsed,
                        upto: stats.upto?.totalCreditUsed,
                        lifetime: (lifetimeStats?.totalCreditUsed || 0),
                        icon: RefreshCcw, color: "text-rose-400", bg: "bg-rose-500/10",
                        isNegative: true
                      },
                    ].map((row: any, i) => (
                      <React.Fragment key={i}>
                        <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl hover:bg-slate-800/40 transition-all group/row">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg ${row.bg} border border-white/5 flex items-center justify-center`}>
                              <row.icon className={`w-3 h-3 ${row.color}`} />
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{row.label}</p>
                            </div>
                          </div>
                          <div className="flex gap-10">
                            {!isInitialMonth && (
                              <p className={`text-[16px] font-black ${row.isNegative ? 'text-rose-500' : row.color} tracking-tight w-40 text-right`}>
                                {row.isNegative ? '-' : ''}Rs. {row.val?.toLocaleString('en-IN') || 0}
                              </p>
                            )}
                            <p className="text-[16px] font-black text-slate-500 tracking-tight w-40 text-right">
                              {row.isNegative ? '-' : ''}Rs. {row.prev?.toLocaleString('en-IN') || 0}
                            </p>
                            <p className="text-[16px] font-black text-amber-500/80 tracking-tight w-40 text-right">
                              {row.isNegative ? '-' : ''}Rs. {row.upto?.toLocaleString('en-IN') || 0}
                            </p>
                            <p className={`text-[16px] font-black text-emerald-400 tracking-tight w-40 text-right transition-all duration-300 ${showLifetime ? '' : 'blur-[6px] hover:blur-none cursor-help'}`}>
                              {row.isNegative ? '-' : ''}Rs. {row.lifetime?.toLocaleString('en-IN') || 0}
                            </p>
                          </div>
                        </div>

                        {row.showInlineList && (
                          <div className="ml-10 mt-2 mb-4 space-y-2 border-l-2 border-white/5 pl-4">
                            {(() => {
                              if (row.listType === 'principal') {
                                return stats.principalRepaymentLogs?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .map((log: any, idx: number) => {
                                    const bs = adToBs(log.date);
                                    return (
                                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black uppercase bg-blue-500/20 text-blue-400">
                                            {log.memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black text-slate-300">{log.memberName}</p>
                                            <p className="text-[8px] font-bold text-slate-500 tracking-tighter uppercase">
                                              #{log.accountNo} • {bs.year}-{bs.month}-{bs.day} ({new Date(log.date).toLocaleDateString()})
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-[11px] font-black text-blue-400">Rs. {log.amount.toLocaleString('en-IN')}</p>
                                      </div>
                                    );
                                  });
                              }

                              // Unified Advanced Credit Logic
                              const memberMap = new Map();

                              // Group Outstanding Balances
                              stats.outstandingCredits?.forEach((u: any) => {
                                memberMap.set(u.accountNo, { ...u, txs: [] });
                              });

                              // Group Monthly Transactions
                              [...(stats.advanceInflowLogs || []), ...(stats.advanceUsageLogs || [])].forEach((log: any) => {
                                const existing = memberMap.get(log.accountNo) || { memberName: log.memberName, accountNo: log.accountNo, amount: 0, txs: [] };
                                existing.txs.push(log);
                                memberMap.set(log.accountNo, existing);
                              });

                              return Array.from(memberMap.values()).map((member: any, idx: number) => (
                                <div key={idx} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black uppercase ${member.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {member.memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black text-slate-300">
                                          {member.memberName}
                                          {member.amount > 0 && <span className="ml-2 text-[7px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md uppercase">Balance</span>}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-500 tracking-tighter uppercase">#{member.accountNo}</p>
                                      </div>
                                    </div>
                                    <p className="text-[11px] font-black text-emerald-400">Rs. {member.amount.toLocaleString('en-IN')}</p>
                                  </div>

                                  {/* Minimal Transaction Indicators for the month */}
                                  {member.txs?.length > 0 && (
                                    <div className="pl-8 flex flex-wrap gap-x-4 gap-y-1">
                                      {member.txs.map((tx: any, tIdx: number) => (
                                        <p key={tIdx} className={`text-[7px] font-black uppercase tracking-tighter ${tx.isUsage ? 'text-rose-500/60' : 'text-amber-500/60'}`}>
                                          {tx.isUsage ? 'Usage' : 'Inflow'}:
                                          <span className="ml-1 text-slate-400">Rs. {tx.amount.toLocaleString('en-IN')}</span>
                                          {tx.source && <span className="ml-1 text-slate-600">({tx.source})</span>}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Grand Total Collection: All Inflows (Excluding Principal) */}
                  <div className="pt-4 mt-2">
                    <div className="flex items-center justify-between p-5 bg-blue-500/10 border border-blue-500/30 rounded-3xl shadow-2xl relative overflow-hidden group/grand">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/[0.05] to-transparent pointer-events-none" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] group-hover/grand:scale-110 transition-transform">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-white uppercase tracking-[0.2em]">Grand Total Collection</p>
                          <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest">Revenue + Advanced Credit</p>
                        </div>
                      </div>
                      <div className="flex gap-10 relative z-10">
                        {!isInitialMonth && (
                          <p className="text-[18px] font-black text-blue-400 w-40 text-right tracking-tighter">
                            Rs. {(stats.grandTotalCollection || 0).toLocaleString('en-IN')}
                          </p>
                        )}
                        <p className="text-[18px] font-black text-slate-500 w-40 text-right tracking-tighter">
                          Rs. {([
                            stats.prev?.totalApprovedAmount,
                            stats.prev?.totalDelayedFinePaid,
                            stats.prev?.totalServiceChargePaid,
                            stats.prev?.totalLoanInterestPaid,
                            stats.prev?.bankInterest,
                            stats.prev?.navCollection,
                            stats.prev?.miscellaneous,
                            stats.prev?.totalAdvancedPayment
                          ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[18px] font-black text-amber-500 w-40 text-right tracking-tighter">
                          Rs. {([
                            stats.upto?.totalApprovedAmount,
                            stats.upto?.totalDelayedFinePaid,
                            stats.upto?.totalServiceChargePaid,
                            stats.upto?.totalLoanInterestPaid,
                            stats.upto?.bankInterest,
                            stats.upto?.navCollection,
                            stats.upto?.miscellaneous,
                            stats.upto?.totalAdvancedPayment
                          ].reduce((a, b) => (a || 0) + (b || 0), 0)).toLocaleString('en-IN')}
                        </p>
                        <div className="w-40" /> {/* Match Lifetime Column Spacing */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Statement: Assets vs Liabilities */}
              <div className="space-y-6 print:space-y-4">
                <div className="flex items-center justify-between gap-4 print:hidden">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                        Live Audit: {(() => {
                          const bs = adToBs(new Date());
                          return `${bs.year}-${bs.month.toString().padStart(2, '0')}-${bs.day.toString().padStart(2, '0')}`;
                        })()} | {new Date().toLocaleDateString()}
                      </span>
                    </span>
                  </div>

                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 1. Total Collection (Assets & Inflows) */}
                  <div className="bg-slate-900/40 border border-emerald-500/10 rounded-[32px] p-6 space-y-6 relative overflow-hidden group/collection shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Total Collection</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aggregate Assets & Receivables</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: `Historical Collection (${targetMonth} ${targetYear})`, val: stats?.upto?.grandTotalCollection || 0, icon: ShieldCheck, color: "text-emerald-400" },
                        { label: "Live Accrued Interest", val: healthData?.totalAccruedInterestActive || 0, icon: Clock, color: "text-blue-400" },
                        { label: "Outstanding Fee (SC/RC)", val: healthData?.totalOutstandingFeesActive || 0, icon: Info, color: "text-amber-400" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all">
                          <div className="flex items-center gap-3">
                            <row.icon className={`w-4 h-4 ${row.color}`} />
                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-tight">{row.label}</span>
                          </div>
                          <span className="text-base font-black text-white tracking-tighter">Rs. {row.val.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Total Valuation</span>
                        <span className="text-xl font-black text-white tracking-tighter">
                          Rs. {([
                            stats?.upto?.grandTotalCollection || 0,
                            healthData?.totalAccruedInterestActive || 0,
                            healthData?.totalOutstandingFeesActive || 0
                          ].reduce((a, b) => a + b, 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Expenditures (Outflows & Liabilities) */}
                  <div className="bg-slate-900/40 border border-rose-500/10 rounded-[32px] p-6 space-y-6 relative overflow-hidden group/expenditure shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[50px] pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-rose-500 rotate-45" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Expenditures</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Outflows & Liabilities</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: "Advanced Payment (Credits)", val: healthData?.totalAdvancePaidActive || 0, icon: Wallet, color: "text-amber-400" },
                        { label: "Historical Bank Charges", val: stats?.upto?.bankCharges || 0, icon: Building2, color: "text-slate-400" },
                        { label: "Historical Expenditure", val: stats?.upto?.totalExpenditure || 0, icon: XCircle, color: "text-rose-400" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all">
                          <div className="flex items-center gap-3">
                            <row.icon className={`w-4 h-4 ${row.color}`} />
                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-tight">{row.label}</span>
                          </div>
                          <span className="text-base font-black text-white tracking-tighter">Rs. {row.val.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                        <span className="text-[12px] font-black text-rose-400 uppercase tracking-widest">Total Deductions</span>
                        <span className="text-xl font-black text-white tracking-tighter">
                          Rs. {([
                            healthData?.totalAdvancePaidActive || 0,
                            stats?.upto?.bankCharges || 0,
                            stats?.upto?.totalExpenditure || 0
                          ].reduce((a, b) => a + b, 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Summary Display: NAV Analysis */}
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-white/10 rounded-[40px] p-8 md:p-12 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent)] pointer-events-none" />

                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-[32px] bg-emerald-500 flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)]">
                        <ShieldCheck className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Net Asset Value (NAV)</h4>
                        <div className="flex flex-col gap-3">
                          <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                            Rs. {(([
                              stats?.upto?.grandTotalCollection || 0,
                              healthData?.totalAccruedInterestActive || 0,
                              healthData?.totalOutstandingFeesActive || 0
                            ].reduce((a, b) => a + b, 0)) - ([
                              healthData?.totalAdvancePaidActive || 0,
                              stats?.upto?.bankCharges || 0,
                              stats?.upto?.totalExpenditure || 0
                            ].reduce((a, b) => a + b, 0))).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Organization Wealth Portfolio ({targetMonth || "Lifetime"})
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block h-24 w-px bg-white/10" />

                    <div className="flex flex-col items-center md:items-end text-center md:text-right">
                      <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Per Member Wealth</h4>
                      <p className="text-4xl font-black text-white tracking-tighter">
                        Rs. {Math.ceil((([
                          stats?.upto?.grandTotalCollection || 0,
                          healthData?.totalAccruedInterestActive || 0,
                          healthData?.totalOutstandingFeesActive || 0
                        ].reduce((a, b) => a + b, 0)) - ([
                          healthData?.totalAdvancePaidActive || 0,
                          stats?.upto?.bankCharges || 0,
                          stats?.upto?.totalExpenditure || 0
                        ].reduce((a, b) => a + b, 0))) / (users.filter(u => u.role === 'USER').length || 1)).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                        Distributed across {users.filter(u => u.role === 'USER').length} verified regular members
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* Operational Reconciliation Section */}
          {ledgerData && (
            <div className="mt-8 p-8 bg-slate-950/60 border border-white/5 rounded-[32px] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileCheck className="w-4 h-4" /> Period Reconciliation
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed max-w-md">
                    Verified book balances and ledger reconciliation for the selected fiscal period.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-col items-end px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Period Inflow</span>
                    <span className="text-sm font-black text-emerald-400">
                      + Rs. {periodicInflow.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex flex-col items-end px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Period Outflow</span>
                    <span className="text-sm font-black text-rose-400">
                      - Rs. {periodicOutflow.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="w-px h-12 bg-white/10 mx-2 hidden md:block" />

                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Net Book Balance</span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white tracking-tighter">Rs. {ledgerData.closingBalance?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Advance Payment Details Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAdvanceModal(false)} />
          <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Advance Credit Logs</h3>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1">
                  Inflow History for {targetMonth || "All Periods"} {targetYear}
                </p>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(80vh-180px)]">
              {stats.advanceInflowLogs?.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <span className="col-span-2">Member / Account</span>
                    <span>Date</span>
                    <span>Source</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {stats.advanceInflowLogs.map((log: any, i: number) => (
                    <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                      <div className="col-span-2">
                        <p className="text-sm font-black text-white">{log.memberName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">#{log.accountNo}</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-[11px] font-bold text-slate-300">{new Date(log.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] font-black px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md inline-block w-fit uppercase">
                          {log.source}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <p className="text-base font-black text-emerald-400">Rs. {log.amount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
                  <Info className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">No advanced payments recorded for this period</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-950/40 border-t border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Period Inflow</p>
              <p className="text-xl font-black text-white tracking-tighter">
                Rs. {stats.totalAdvancedPayment?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AddUserForm
          onClose={() => {
            setShowModal(false);
            fetchData();
          }}
          fixedOrgId={orgId}
        />
      )}
    </div>
  );
}
