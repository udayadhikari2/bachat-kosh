"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  HandCoins,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  PiggyBank,
  Send,
  BellRing
} from "lucide-react";
import Image from "next/image";
import { calculateLoanStats } from "@/lib/utils/loan-calculations";
import { getNepaliMonthRange, getNextNepaliMonth, adToBs } from "@/lib/utils/nepali-date";

interface MemberHomeTabProps {
  memberData: any;
  orgConfig: any;
  currentNepaliMonth: string;
  onTabChange: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenTransfer: () => void;
  onOpenLoanRequest: () => void;
  onOpenLoanRepay: (loanId?: string) => void;
}

export default function MemberHomeTab({
  memberData,
  orgConfig,
  currentNepaliMonth,
  onTabChange,
  onOpenDeposit,
  onOpenTransfer,
  onOpenLoanRequest,
  onOpenLoanRepay
}: MemberHomeTabProps) {
  const user = memberData?.user || {};
  const stats = memberData?.stats || { totalDeposits: 0, activeLoans: 0, totalLoanPaid: 0, currentAdvanceBalance: 0 };
  const timeline = (memberData?.timeline || []);
  const depositTimeline = timeline.filter((event: any) => event.type === "DEPOSIT").slice(0, 5);
  const loanTimeline = timeline.filter((event: any) => ["LOAN_REQUEST", "LOAN_PAYMENT", "LOAN_RENEWAL"].includes(event.type)).slice(0, 5);

  const [activeActivityTab, setActiveActivityTab] = useState<"deposits" | "loans">("deposits");

  // Active Loan Details Selection
  const activeLoans = useMemo(() => {
    return (memberData?.loans || []).filter(
      (l: any) => ["ACTIVE", "OVERDUE"].includes(l.status)
    );
  }, [memberData?.loans]);

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  useEffect(() => {
    if (activeLoans.length > 0) {
      const firstLoanId = activeLoans[0]._id.toString();
      if (!selectedLoanId || !activeLoans.some((l: any) => l._id.toString() === selectedLoanId)) {
        setSelectedLoanId(firstLoanId);
      }
    } else {
      if (selectedLoanId !== null) {
        setSelectedLoanId(null);
      }
    }
  }, [activeLoans, selectedLoanId]);

  const activeLoan = activeLoans.find((l: any) => l._id.toString() === selectedLoanId) || activeLoans[0];
  const hasActiveLoan = activeLoans.length > 0;

  const loanStats = activeLoan ? calculateLoanStats(activeLoan) : null;

  const activatedDate = activeLoan?.activatedAt
    ? new Date(activeLoan.activatedAt)
    : activeLoan?.createdAt
      ? new Date(activeLoan.createdAt)
      : new Date();

  const formatNepaliDate = (dateVal: string | Date) => {
    const bs = adToBs(dateVal);
    if (bs.year === 0) return "N/A";
    return `${bs.monthName} ${bs.day}, ${bs.year}`;
  };

  const getCalendarDays = (d1: Date, d2: Date) => {
    const npTime1 = new Date(d1.getTime() + (5 * 60 + 45) * 60 * 1000);
    const npTime2 = new Date(d2.getTime() + (5 * 60 + 45) * 60 * 1000);
    const startObj = new Date(Date.UTC(npTime1.getUTCFullYear(), npTime1.getUTCMonth(), npTime1.getUTCDate()));
    const endObj = new Date(Date.UTC(npTime2.getUTCFullYear(), npTime2.getUTCMonth(), npTime2.getUTCDate()));
    return Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));
  };

  const dueDate = activeLoan?.dueDate ? new Date(activeLoan.dueDate) : new Date();
  const totalDays = loanStats?.totalDays || Math.max(1, getCalendarDays(activatedDate, dueDate));
  const elapsedDays = Math.max(0, getCalendarDays(activatedDate, new Date()));
  const timeProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const principalPaid = loanStats ? (activeLoan.principalAmount - (loanStats.principalOutstanding || 0)) : 0;
  const principalAmount = activeLoan?.principalAmount || 0;
  const balanceAmount = loanStats ? (loanStats.outstandingAmount || 0) : (activeLoan?.balanceAmount || 0);
  const percentPaid = principalAmount > 0 ? Math.min(100, Math.max(0, Math.round((principalPaid / principalAmount) * 100))) : 0;

  const accruedInterest = loanStats ? (loanStats.totalInterest || 0) : 0;

  const lastRenewal = activeLoan?.renewalHistory && activeLoan.renewalHistory.length > 0
    ? activeLoan.renewalHistory[activeLoan.renewalHistory.length - 1]
    : null;

  const finalEndDate = (activeLoan?.status === "COMPLETED" && activeLoan.completedAt)
    ? new Date(activeLoan.completedAt)
    : (activeLoan?.status === "DELETED" && activeLoan.deletedAt)
      ? new Date(activeLoan.deletedAt)
      : new Date();

  const runningInterestDays = lastRenewal
    ? Math.max(0, getCalendarDays(new Date(lastRenewal.date), finalEndDate))
    : (loanStats ? (loanStats.totalDays || 0) : elapsedDays);
  const principalOutstanding = loanStats ? (loanStats.principalOutstanding || 0) : principalAmount;
  const outstandingInterest = loanStats ? ((loanStats.unpaidBaseInterest || 0) + (loanStats.unpaidPenaltyInterest || 0)) : 0;
  const unpaidSC = loanStats ? (loanStats.unpaidSC || 0) : (activeLoan?.serviceChargeAmount || 0);
  const unpaidRenewal = loanStats ? (loanStats.unpaidRenewal || 0) : (activeLoan?.renewalAmount || 0);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  useEffect(() => {
    if (!activeLoan?.dueDate) return;

    const targetTime = new Date(activeLoan.dueDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true });
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s, isOverdue: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeLoan?._id, activeLoan?.dueDate]);

  // Unpaid months calculations
  const unpaidMonths = useMemo(() => {
    if (!currentNepaliMonth || !orgConfig) return [];
    const initialMonth = orgConfig.financials?.initialOpeningMonth;
    const initialYear = orgConfig.financials?.initialOpeningYear;
    if (!initialMonth || !initialYear) return [];
    
    const startMonthStr = getNextNepaliMonth(`${initialMonth} ${initialYear}`);
    const monthsRange = getNepaliMonthRange(startMonthStr, currentNepaliMonth);
    
    const timeline = memberData?.timeline || [];
    return monthsRange.filter(mStr => {
      const hasDeposit = timeline.some(
        (item: any) => 
          item.type === "DEPOSIT" && 
          item.month === mStr && 
          (item.status === "APPROVED" || item.status === "PENDING")
      );
      return !hasDeposit;
    });
  }, [currentNepaliMonth, orgConfig, memberData?.timeline]);

  const previousUnpaidMonths = unpaidMonths.filter(m => m !== currentNepaliMonth);

  // Look for current month deposit status in timeline
  const currentMonthDeposit = (memberData?.timeline || []).find(
    (item: any) => item.type === "DEPOSIT" && item.month === currentNepaliMonth
  );

  const depositStatus = currentMonthDeposit?.status || "UNPAID"; // PENDING, APPROVED, REJECTED, UNPAID

  // Active Loan Details
  const activeLoansList = (memberData?.timeline || []).filter(
    (item: any) => item.type === "LOAN_REQUEST" && item.status === "ACTIVE"
  );
  const hasActiveLoanOverride = activeLoans.length > 0;
  const totalAssets = stats.totalDeposits + stats.currentAdvanceBalance;

  return (
    <div className="space-y-4">
      {/* Unpaid Month Reminder Banner */}
      {previousUnpaidMonths.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-5 flex items-start gap-4 shadow-lg shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Unpaid Deposits Reminder</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              You have unpaid monthly deposits for the following previous month(s):{" "}
              <span className="font-bold text-amber-400">
                {previousUnpaidMonths.join(", ")}
              </span>.
              Please register deposit requests for these periods first.
            </p>
          </div>
        </div>
      )}
      {/* Welcome & Info Segment */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[10px] p-3 md:backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-[8px]" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 p-[1px] relative shadow-lg">
            <div className="w-full h-full bg-slate-950 rounded-[15px] overflow-hidden relative">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-white text-lg">
                  {user.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">Member Account</h2>
            <h1 className="text-lg font-black text-white leading-tight mt-0.5 tracking-tight">{user.name}</h1>
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-1">
              Acc Number: #{user.accountNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Account Portfolio Section */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-2">Personal Account Portfolio</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Card 1: Total Savings */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Total Savings</span>
                  <span className="text-[7px] text-emerald-500/60 font-black bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Personal
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end mt-0">
                <span className="text-base font-black text-white tracking-tight mt-0.5 block">
                  Rs. {stats.totalDeposits.toLocaleString()}
                </span>
                <span className="text-[7px] text-slate-500 font-bold block mt-1 leading-normal">
                  * started from next month of initial collection month
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Advance Balance */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex flex-row items-start gap-4">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Advanced Balance</span>
                  <span className="text-[7px] text-blue-500/60 font-black bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Credits
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end mt-0">
                <span className="text-base font-black text-white tracking-tight mt-0.5 block">
                  Rs. {stats.currentAdvanceBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Saving Status */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex flex-row items-start gap-4 ">
                <div className={`p-2.5 rounded-2xl border ${depositStatus === "APPROVED"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : depositStatus === "PENDING"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-slate-850 border-slate-800 text-slate-500"
                  }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Saving ({currentNepaliMonth.split(" ")[0]})</span>
                  <span className="text-[7px] text-slate-400 font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Status
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end mt-0">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 inline-block ${depositStatus === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : depositStatus === "PENDING"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : depositStatus === "REJECTED"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                  {depositStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cooperative Organization Financials Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Cooperative Organization Financials</h3>
          <span className="text-[8.5px] font-black text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Period: {currentNepaliMonth}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Card 1: Organization Collection */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Total Collection</span>
                  <span className="text-[7px] text-emerald-500/60 font-black bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Verified Inflows
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end mt-0">
                <span className="text-base font-black text-white tracking-tight mt-0.5 block">
                  Rs. {(memberData.orgStats?.totalCollection || 0).toLocaleString()}
                </span>
                <span className="text-[7px] text-slate-500 font-bold block mt-1 leading-normal">
                  Aggregate Assets & Receivables
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Closing Balance (Available Funds) */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Available Funds</span>
                  <span className="text-[7px] text-blue-500/60 font-black bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Liquid Ledger
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end mt-0">
                <span className="text-base font-black text-white tracking-tight mt-0.5 block">
                  Rs. {(memberData.orgStats?.closingBalance || 0).toLocaleString()}
                </span>
                <span className="text-[7px] text-slate-500 font-bold block mt-1 leading-normal">
                  Liquid cash reserve this month
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Net Assets per Member */}
          <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3 rounded-3xl relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[50px]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-start">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Per Member Net Assets</span>
                  <span className="text-[7px] text-amber-500/60 font-black bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    NAV Share
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end mt-0">
                <span className="text-base font-black text-white tracking-tight mt-0.5 block">
                  Rs. {(memberData.orgStats?.perMemberNetAssets || 0).toLocaleString()}
                </span>
                <span className="text-[7px] text-slate-500 font-bold block mt-1 leading-normal">
                  Net wealth value share per member
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      {/* <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-2 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Save Monthly", icon: PiggyBank, color: "text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10", action: onOpenDeposit },
            { label: "Send Credit", icon: Send, color: "text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/10", action: onOpenTransfer },
            { label: "Ask for Loan", icon: HandCoins, color: "text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-500/10", action: onOpenLoanRequest },
            { label: "Pay Loan", icon: Wallet, color: "text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10", action: () => onOpenLoanRepay(activeLoan?._id?.toString()), disabled: !hasActiveLoan },
          ].map((act, i) => (
            <button
              key={i}
              onClick={act.action}
              disabled={act.disabled}
              className={`flex flex-col items-center p-3 rounded-2xl border transition-colors disabled:opacity-30 disabled:pointer-events-none ${act.color}`}
            >
              <act.icon className="w-5 h-5 mb-1.5" />
              <span className="text-[8px] font-black uppercase tracking-wider text-center leading-tight">{act.label}</span>
            </button>
          ))}
        </div>
      </div> */}

      {/* Active Loan Reminder Card */}
      {
        hasActiveLoan && (
          <div 
            onClick={() => onOpenLoanRepay(activeLoan?._id?.toString())}
            className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-indigo-500/30 p-6 rounded-[36px] shadow-2xl relative overflow-hidden group shadow-indigo-950/20 cursor-pointer hover:border-indigo-500/60 active:scale-[0.99] transition-all duration-300"
          >
            {/* Subtle Glowing Background Accents */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />

            {/* Selector if multiple active loans */}
            {activeLoans.length > 1 && (
              <div className="mb-6 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 relative z-10">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Select Loan Card</span>
                <select
                  value={selectedLoanId || ""}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-950 text-white border border-slate-800 text-[8px] rounded-xl px-2 py-1 focus:outline-none focus:border-indigo-500 font-black uppercase tracking-wider cursor-pointer"
                >
                  {activeLoans.map((l: any, index: number) => (
                    <option key={l._id} value={l._id.toString()}>
                      Loan #{index + 1} ({l.type || "Standard"}) - Rs. {l.principalAmount.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Card Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 relative shadow-inner">
                  <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Active Loan Tracker
                  </span>
                  <p className="text-[10px] text-white font-black uppercase tracking-wider mt-1.5">{activeLoan?.type || "Standard"} Portfolio</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                Int Rate: {activeLoan?.interestRate || 12}% p.a.
              </div>
            </div>

            <div className="space-y-6">
              {/* Balance and Duration Details */}
              <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                <div>
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Remaining Balance</span>
                  <span className="text-xl font-black text-white mt-1 block tracking-tight">
                    Rs. {balanceAmount.toLocaleString()}
                  </span>
                  <span className="text-[8.5px] text-slate-400 font-bold mt-1 block leading-none">Original Principal: Rs. {principalAmount.toLocaleString()}</span>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Interest Days</span>
                    <div className="mt-1 space-y-1">
                      <span className="text-xs font-black text-slate-200 inline-block bg-slate-950 border border-slate-900 px-2.5 py-0.5 rounded-full">
                        {runningInterestDays} Days Running
                      </span>
                      {lastRenewal && (
                        <>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                            Lifetime: <span className="text-indigo-400">{totalDays} Days</span>
                          </div>
                          <div className="text-[8px] text-amber-400 font-black uppercase tracking-wider mt-0.5">
                            Renewed: {formatNepaliDate(lastRenewal.date)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!lastRenewal && (
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-2">
                      Term Duration: <span className="text-indigo-400">{totalDays} Days</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row-wise Financial Details */}
              <div className="space-y-2.5 bg-slate-950/50 border border-white/5 rounded-2xl p-4 shadow-inner">
                {/* 1. Principal O/S Row */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                      <Wallet className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Principal Outstanding</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Remaining principal debt</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-white">
                    Rs. {principalOutstanding.toLocaleString()}
                  </span>
                </div>

                {/* 2. Interest O/S Row */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Interest Outstanding</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                        {loanStats && ((loanStats.unpaidBaseInterest || 0) > 0 || (loanStats.unpaidPenaltyInterest || 0) > 0) 
                          ? `Base: Rs. ${(loanStats.unpaidBaseInterest || 0).toLocaleString()} • Penalty: Rs. ${(loanStats.unpaidPenaltyInterest || 0).toLocaleString()}`
                          : 'Accumulated interest'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-white">
                    Rs. {outstandingInterest.toLocaleString()}
                  </span>
                </div>

                {/* 3. Service Charge (SC) Row */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                      <HandCoins className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Service Charge (SC)</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Unpaid administration & service fee</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-white">
                    Rs. {unpaidSC.toLocaleString()}
                  </span>
                </div>

                {/* 4. Renewal Charge (RC) Row */}
                <div className="flex items-center justify-between py-2.5 hover:bg-white/[0.01] px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                      <Clock className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Renewal Charge (RC)</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Unpaid renewal & extension fee</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-white">
                    Rs. {unpaidRenewal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Countdown or Overdue Banner */}
              {timeLeft.isOverdue ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3.5 text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0 animate-bounce" />
                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-widest">Repayment Term Overdue</h5>
                    <p className="text-[8px] text-rose-300/80 mt-1.5 leading-normal font-medium">Accumulating penalty charges. Please settle or renew as soon as possible to avoid interest compounding.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8.5px] text-slate-400 font-black uppercase tracking-widest">Remaining Days for Renewal</span>
                    <span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-widest">
                      {timeLeft.days} Days Left
                    </span>
                  </div>

                  {/* Professional Styled Digit Countdown Grid */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Days", value: timeLeft.days, border: "border-emerald-500/20", glow: "shadow-emerald-500/5", text: "text-emerald-400" },
                      { label: "Hours", value: timeLeft.hours, border: "border-indigo-500/20", glow: "shadow-indigo-500/5", text: "text-indigo-400" },
                      { label: "Mins", value: timeLeft.minutes, border: "border-indigo-500/20", glow: "shadow-indigo-500/5", text: "text-indigo-400" },
                      { label: "Secs", value: timeLeft.seconds, border: "border-cyan-500/20", glow: "shadow-cyan-500/5", text: "text-cyan-400 animate-pulse" }
                    ].map((time, idx) => (
                      <div key={idx} className={`bg-slate-950/80 border ${time.border} rounded-2xl py-3 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg ${time.glow} shadow-inner`}>
                        <span className={`text-xl font-black font-mono tracking-tighter leading-none ${time.text} relative z-10`}>
                          {time.value.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider mt-1.5 relative z-10">
                          {time.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settle and Term Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Settle ratio progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 px-1">
                    <span>Loan Settle Ratio</span>
                    <span className="text-slate-300">{percentPaid}% Paid</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-white/5 p-[1px]">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }} />
                  </div>
                </div>

                {/* Time progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 px-1">
                    <span>Term Progress</span>
                    <span className="text-slate-300">{timeProgressPercent}% Elapsed</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-white/5 p-[1px]">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${timeProgressPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* View Details Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLoanRepay(activeLoan?._id?.toString());
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                View Full Details
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )
      }

      {/* Recent Activity Timeline Categorized */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
        {/* Header segments */}
        <div className="flex border-b border-slate-800 px-1 mb-6">
          <button
            onClick={() => setActiveActivityTab("deposits")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
              activeActivityTab === "deposits" 
                ? "border-emerald-500 text-white" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Recent Deposits
          </button>
          <button
            onClick={() => setActiveActivityTab("loans")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
              activeActivityTab === "loans" 
                ? "border-emerald-500 text-white" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Recent Loans
          </button>
        </div>

        {/* Tab Content */}
        {activeActivityTab === "deposits" ? (
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Showing Last 5 Deposit Events</span>
              <button
                onClick={() => onTabChange("deposit")}
                className="text-[9px] font-black text-emerald-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                View All History <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {depositTimeline.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                No deposit activity logged
              </div>
            ) : (
              <div className="space-y-4">
                {depositTimeline.map((event: any, i: number) => (
                  <div key={event.id || i} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      event.status === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : event.status === "PENDING"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-bold text-white truncate leading-tight">{event.title}</p>
                        {event.amount > 0 && (
                          <span className="text-xs font-black text-white shrink-0">
                            Rs. {event.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {new Date(event.date).toLocaleDateString()} {event.month ? `• ${event.month}` : ""}
                      </p>
                      {event.details && (
                        <p className="text-[9px] text-slate-600 mt-1 italic line-clamp-1">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Showing Last 5 Loan Events</span>
              <button
                onClick={() => onTabChange("loans")}
                className="text-[9px] font-black text-emerald-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                View All History <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loanTimeline.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                No loan activity logged
              </div>
            ) : (
              <div className="space-y-4">
                {loanTimeline.map((event: any, i: number) => (
                  <div key={event.id || i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-400">
                      <HandCoins className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-bold text-white truncate leading-tight">{event.title}</p>
                        {event.amount > 0 && (
                          <span className="text-xs font-black text-white shrink-0">
                            Rs. {event.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {new Date(event.date).toLocaleDateString()} {event.month ? `• ${event.month}` : ""}
                      </p>
                      {event.details && (
                        <p className="text-[9px] text-slate-600 mt-1 italic line-clamp-1">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
