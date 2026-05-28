"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  HandCoins, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  PiggyBank, 
  Send,
  BellRing
} from "lucide-react";
import Image from "next/image";

interface MemberHomeTabProps {
  memberData: any;
  orgConfig: any;
  currentNepaliMonth: string;
  onTabChange: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenTransfer: () => void;
  onOpenLoanRequest: () => void;
  onOpenLoanRepay: () => void;
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
  const timeline = (memberData?.timeline || []).slice(0, 5); // display 5 most recent activities

  // Active Loan Details
  const activeLoan = (memberData?.loans || []).find(
    (l: any) => l.status === "ACTIVE"
  );
  
  const activatedDate = activeLoan?.activatedAt 
    ? new Date(activeLoan.activatedAt) 
    : activeLoan?.createdAt 
      ? new Date(activeLoan.createdAt) 
      : new Date();
  
  const dueDate = activeLoan?.dueDate ? new Date(activeLoan.dueDate) : new Date();
  const totalDays = Math.max(1, Math.ceil((dueDate.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.ceil((new Date().getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)));
  const timeProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  
  const principalPaid = activeLoan?.principalPaid || 0;
  const principalAmount = activeLoan?.principalAmount || 0;
  const balanceAmount = activeLoan?.balanceAmount || 0;
  const percentPaid = principalAmount > 0 ? Math.min(100, Math.max(0, Math.round((principalPaid / principalAmount) * 100))) : 0;

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
  }, [activeLoan?.dueDate]);

  // Look for current month deposit status in timeline
  const currentMonthDeposit = (memberData?.timeline || []).find(
    (item: any) => item.type === "DEPOSIT" && item.month === currentNepaliMonth
  );

  const depositStatus = currentMonthDeposit?.status || "UNPAID"; // PENDING, APPROVED, REJECTED, UNPAID

  // Active Loan Details
  const activeLoansList = (memberData?.timeline || []).filter(
    (item: any) => item.type === "LOAN_REQUEST" && item.status === "ACTIVE"
  );
  // Fetch actual active loan details from Mongoose if we have it
  // For the dashboard, we'll summarize based on getMemberActivity or fallback
  const hasActiveLoan = stats.activeLoans > 0;
  
  // Quick calculations for display
  const totalAssets = stats.totalDeposits + stats.currentAdvanceBalance;

  return (
    <div className="space-y-6">
      {/* Welcome & Info Segment */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
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

      {/* Metrics Cards Grid (Carousel-style layout on small screen) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1: Total Contributions */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full" />
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit rounded-2xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="mt-5">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Total Savings</span>
            <span className="text-lg font-black text-white tracking-tight mt-1 block">
              Rs. {stats.totalDeposits.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: Advance Credit balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full" />
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="mt-5">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Advance Balance</span>
            <span className="text-lg font-black text-white tracking-tight mt-1 block">
              Rs. {stats.currentAdvanceBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 3: Total Assets */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-2xl rounded-full" />
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit rounded-2xl">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="mt-5">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Net Share Assets</span>
            <span className="text-lg font-black text-white tracking-tight mt-1 block">
              Rs. {totalAssets.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Monthly saving status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-2xl rounded-full" />
          <div className={`p-3 w-fit rounded-2xl border ${
            depositStatus === "APPROVED" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : depositStatus === "PENDING"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-500"
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div className="mt-5">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Saving ({currentNepaliMonth.split(" ")[0]})</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 inline-block ${
              depositStatus === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-400"
                : depositStatus === "PENDING"
                  ? "bg-amber-500/10 text-amber-400"
                  : depositStatus === "REJECTED"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-slate-800 text-slate-400"
            }`}>
              {depositStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-2 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Save Monthly", icon: PiggyBank, color: "text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10", action: onOpenDeposit },
            { label: "Send Credit", icon: Send, color: "text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/10", action: onOpenTransfer },
            { label: "Ask for Loan", icon: HandCoins, color: "text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-500/10", action: onOpenLoanRequest },
            { label: "Pay Loan", icon: Wallet, color: "text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10", action: onOpenLoanRepay, disabled: !hasActiveLoan },
          ].map((act, i) => (
            <button
              key={i}
              onClick={act.action}
              disabled={act.disabled}
              className={`flex flex-col items-center p-3 rounded-2xl border transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${act.color}`}
            >
              <act.icon className="w-5 h-5 mb-1.5" />
              <span className="text-[8px] font-black uppercase tracking-wider text-center leading-tight">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Loan Reminder Card */}
      {hasActiveLoan && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-indigo-500/30 p-6 rounded-[36px] shadow-2xl relative overflow-hidden group shadow-indigo-950/20">
          {/* Subtle Glowing Background Accents */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />

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
                <span className="text-[8.5px] text-slate-400 font-bold mt-1 block leading-none">Principal: Rs. {principalAmount.toLocaleString()}</span>
              </div>
              <div className="text-right flex flex-col justify-between">
                <div>
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Total Duration</span>
                  <span className="text-xs font-black text-slate-200 mt-1 inline-block bg-slate-950 border border-slate-900 px-2.5 py-0.5 rounded-full">
                    {totalDays} Days Term
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-2">
                  Elapsed: <span className="text-indigo-400">{elapsedDays} Days</span>
                </div>
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
              onClick={() => onTabChange("loans")}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              Details & Repayment Tab
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity Timeline */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Recent Activity</h3>
          <button 
            onClick={() => onTabChange("deposit")}
            className="text-[9px] font-black text-emerald-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
          >
            History <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {timeline.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
            No activity logged in registry
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((event: any, i: number) => (
              <div key={event.id || i} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  event.type === "DEPOSIT"
                    ? event.status === "APPROVED"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : event.status === "PENDING"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}>
                  {event.type === "DEPOSIT" ? <PiggyBank className="w-4 h-4" /> : <HandCoins className="w-4 h-4" />}
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
    </div>
  );
}
