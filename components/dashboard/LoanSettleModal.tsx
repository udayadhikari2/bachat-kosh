"use client";

import { useState, useMemo, useEffect } from "react";
import { X, CreditCard, AlertCircle, CheckCircle2, Loader2, Calendar, Info, CornerDownRight, ShieldCheck, RefreshCw, Calculator, HandCoins } from "lucide-react";
import { settleLoan } from "@/lib/actions/loan";
import { calculateLoanStats } from "@/lib/utils/loan-calculations";

import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import NepaliDatePicker from "./NepaliDatePicker";
import { toast } from "react-hot-toast";
import { getOrganization } from "@/lib/actions/organization";
import { generateLoanStatementPDF } from "@/lib/utils/pdf-generator";
import { FileText, Download } from "lucide-react";


interface LoanSettleModalProps {
  loan: any;
  adminId: string;
  onSuccess: () => void;
  onClose: () => void;
  defaultRenew?: boolean;
}

type PaymentType = "PRINCIPAL" | "INTEREST" | "PENALTY" | "RENEWAL" | "SERVICE_CHARGE" | "ADVANCE";

const PRIORITY_ORDER: PaymentType[] = [
  "SERVICE_CHARGE",
  "INTEREST",
  "PENALTY",
  "RENEWAL",
  "PRINCIPAL"
];

export default function LoanSettleModal({ loan, adminId, onSuccess, onClose, defaultRenew }: LoanSettleModalProps) {
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<Set<PaymentType>>(new Set([]));
  const [allocations, setAllocations] = useState<Record<string, number>>({
    PRINCIPAL: 0, INTEREST: 0, PENALTY: 0, RENEWAL: 0, SERVICE_CHARGE: 0
  });
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [excessMode, setExcessMode] = useState<"PRINCIPAL" | "ADVANCE">("PRINCIPAL");
  const [useAdvance, setUseAdvance] = useState<boolean>(false);
  const [advanceToConsume, setAdvanceToConsume] = useState<number>(0);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [dateChangeMessage, setDateChangeMessage] = useState<string | null>(null);

  const availableAdvance = loan.userId?.advanceBalance || 0;

  
  // Renewal during settlement state
  const [shouldRenew, setShouldRenew] = useState(defaultRenew || false);
  const [extensionDays, setExtensionDays] = useState<number>(180);
  const [newRenewalFee, setNewRenewalFee] = useState<string>(Math.ceil(loan.serviceChargeAmount || 0).toString());
  const parsedRenewalFee = Math.ceil(parseFloat(newRenewalFee) || 0);


  const [modalStats, setModalStats] = useState(loan.stats);

  // Recalculate stats when effective date changes
  useEffect(() => {
    const stats = calculateLoanStats(loan, new Date(effectiveDate));
    setModalStats(stats);
  }, [effectiveDate, loan]);

  const stats = modalStats;
  const totalPaid = loan.totalPaid || 0;

  const handleDownloadStatement = () => {
    setShowPrintOptions(true);
  };

  const finalDownload = async () => {
    setShowPrintOptions(false);
    setDownloading(true);
    try {
      const res = await getOrganization(loan.organizationId);
      if (res.success) {
        const activationDate = new Date(loan.activatedAt);
        const evaluationDate = new Date(effectiveDate);
        
        const diffTime = Math.abs(evaluationDate.getTime() - activationDate.getTime());
        const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        generateLoanStatementPDF({
          loan,
          organization: res.data,
          user: loan.userId,
          activationDate,
          evaluationDate,
          daysElapsed,
          includeRenewalFee: shouldRenew,
          renewalFeeAmount: parsedRenewalFee,
          advanceAmountUsed: useAdvance ? advanceToConsume : 0,
          availableAdvanceBalance: availableAdvance
        });
        toast.success("Detailed Bill generated successfully");
      } else {
        toast.error("Failed to fetch organization details");
      }
    } catch {
      toast.error("An error occurred while generating PDF");
    } finally {
      setDownloading(false);
    }
  };


  
  // Calculate specific outstandings for better admin context
  const getOutstandingForType = (type: PaymentType) => {
    let raw = 0;
    switch (type) {
      case "PRINCIPAL": raw = loan.principalAmount - (loan.principalPaid || 0); break;
      case "INTEREST": raw = stats.unpaidBaseInterest || 0; break;
      case "PENALTY": raw = stats.unpaidPenaltyInterest || 0; break;
      case "RENEWAL": 
        raw = (loan.renewalAmount || 0) - (loan.renewalPaid || 0);
        if (shouldRenew) raw += parsedRenewalFee;
        break;
      case "SERVICE_CHARGE": raw = (loan.serviceChargeAmount || 0) - (loan.serviceChargePaid || 0); break;
    }
    return Math.ceil(Math.max(0, raw));
  };

  const scOutstanding = getOutstandingForType("SERVICE_CHARGE");
  const rnOutstanding = (loan.renewalAmount || 0) - (loan.renewalPaid || 0);
  const penaltyOutstanding = getOutstandingForType("PENALTY");
  const interestOutstanding = getOutstandingForType("INTEREST");
  const extrasTotal = scOutstanding + rnOutstanding + penaltyOutstanding + interestOutstanding;

  // Evaluate for calculations in UI
  const cashDeposit = useMemo(() => {
    try {
      const sanitized = displayAmount.replace(/[^0-9+\-*/.]/g, '');
      const cashAmount = Math.ceil(eval(sanitized) || 0);
      return cashAmount;
    } catch {
      return 0;
    }
  }, [displayAmount]);

  const grossSettleAmount = useMemo(() => {
    return cashDeposit + (useAdvance ? advanceToConsume : 0);
  }, [cashDeposit, useAdvance, advanceToConsume]);

  const totalLiability = Math.ceil(Math.max(0, (stats.totalAmountToPay - totalPaid) + (shouldRenew ? parsedRenewalFee : 0)));
  const netSettlementLiability = Math.ceil(Math.max(0, totalLiability - availableAdvance));
  
  const totalRequiredToRenew = extrasTotal + parsedRenewalFee;
  const canRenew = grossSettleAmount >= totalRequiredToRenew;
  
  const outstandingTotal = Math.ceil(Math.max(0, stats.totalAmountToPay - totalPaid));
  const isFullSettlement = grossSettleAmount >= outstandingTotal && outstandingTotal > 0;
  const isOverpaying = grossSettleAmount > outstandingTotal;

  // Automatic distribution logic
  useEffect(() => {
    // Safely evaluate the displayAmount
    let evaluated = 0;
    try {
      // Basic sanitizer: only allow numbers and operators
      const sanitized = displayAmount.replace(/[^0-9+\-*/.]/g, '');
      if (sanitized) {
        // Simple evaluator for basic math
        evaluated = eval(sanitized) || 0;
      }
    } catch {
      evaluated = 0;
    }

    let remaining = evaluated;
    const nextAllocations: Record<string, number> = {
      PRINCIPAL: 0, INTEREST: 0, PENALTY: 0, RENEWAL: 0, SERVICE_CHARGE: 0, ADVANCE: 0
    };

    // Distribute based on priority order for SELECTED types
    // Except PRINCIPAL, which depends on excessMode if we consider it "excess" 
    // Actually, let's keep the priority loop but handle the tail manually if needed
    for (const type of PRIORITY_ORDER) {
      if (type === "PRINCIPAL") continue; // Handle tail separately for choice

      if (selectedTypes.has(type) && remaining > 0) {
        const outstanding = getOutstandingForType(type);
        const toAssign = Math.min(remaining, outstanding);
        nextAllocations[type] = toAssign;
        remaining -= toAssign;
      }
    }

    // Handle Principal vs Advance vs Over-Settlement
    const extrasThreshold = extrasTotal + (shouldRenew ? parsedRenewalFee : 0);
    const principalBalance = getOutstandingForType("PRINCIPAL");
    
    if (remaining > 0 && grossSettleAmount > extrasThreshold && selectedTypes.has("PRINCIPAL")) {
      const surplus = remaining;

      if (surplus >= principalBalance) {
        // FULL SETTLEMENT CASE: Clear EVERYTHING first, then Advance
        nextAllocations.PRINCIPAL = principalBalance;
        nextAllocations.ADVANCE = surplus - principalBalance;
      } else {
        // PARTIAL PRINCIPAL CASE: Offer choice between Benefit (Reduction) and Credit (Advance)
        if (excessMode === "PRINCIPAL") {
          nextAllocations.PRINCIPAL = surplus;
        } else {
          nextAllocations.ADVANCE = surplus;
        }
      }
      remaining = 0;
    }
    
    setAllocations(nextAllocations);
  }, [displayAmount, selectedTypes, excessMode, extrasTotal, shouldRenew, parsedRenewalFee]);

  // Amount Entry Auto-Selection Logic
  const handleAmountChange = (val: string) => {
    setDisplayAmount(val);
    
    let evaluated = 0;
    try {
      const sanitized = val.replace(/[^0-9+\-*/.]/g, '');
      evaluated = eval(sanitized) || 0;
    } catch {
      evaluated = 0;
    }
    
    const amt = Math.ceil(evaluated);

    
    if (amt > 0) {
      let remaining = amt;
      const nextSelected = new Set<PaymentType>();
      for (const type of PRIORITY_ORDER) {
        if (remaining > 0) {
          const outstanding = getOutstandingForType(type);
          if (outstanding > 0 || type === "PRINCIPAL") {
            nextSelected.add(type);
            const toAssign = type === "PRINCIPAL" ? remaining : Math.min(remaining, outstanding);
            remaining -= toAssign;
          }
        }
      }
      setSelectedTypes(nextSelected);
    } else {
      setSelectedTypes(new Set([]));
    }
  };

  const handleClearDue = () => {
    // To clear the loan, we need to settle the netSettlementLiability in cash
    // while consuming the available advance.
    setUseAdvance(true);
    setAdvanceToConsume(availableAdvance);
    setDisplayAmount(netSettlementLiability.toString());
    setSelectedTypes(new Set(PRIORITY_ORDER));
  };

  const bsSelected = useMemo(() => adToBs(new Date(effectiveDate)), [effectiveDate]);
  const nepaliSelected = bsSelected.year > 0 
    ? `${bsSelected.year} ${NEPALI_MONTHS[bsSelected.month - 1]} ${bsSelected.day}`
    : "Invalid Date";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validAllocations = Object.entries(allocations)
      .map(([type, amount]) => ({ type: type as PaymentType, amount }))
      .filter(a => a.amount > 0);

    if (validAllocations.length === 0) {
      toast.error("Enter a valid collective amount");
      return;
    }

    setLoading(true);
    try {
      const res = await settleLoan({
        loanId: loan._id,
        adminId,
        allocations: validAllocations,
        date: effectiveDate,
        note: note || undefined,
        useAdvance: useAdvance ? advanceToConsume : undefined,
        renewalParams: shouldRenew ? {
          extensionDays,
          renewalAmount: parsedRenewalFee
        } : undefined
      });
      if (res.success) {
        toast.success(res.isFullySettled ? "Loan fully settled! 🎉" : "Payment recorded successfully");
        onSuccess();
      } else {
        toast.error(res.error || "Settlement failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const paymentTypesList: { value: PaymentType; label: string; color: string; icon: any }[] = [
    { value: "SERVICE_CHARGE", label: "Activation/Service Fee", color: "from-slate-600 to-slate-800", icon: ShieldCheck },
    { value: "INTEREST", label: "Interest", color: "from-blue-600 to-indigo-600", icon: Info },
    { value: "PENALTY", label: "Penalty", color: "from-rose-600 to-pink-600", icon: AlertCircle },
    { value: "RENEWAL", label: "Renewal Charge", color: "from-amber-600 to-orange-600", icon: RefreshCw },
    { value: "PRINCIPAL", label: "Principal", color: "from-emerald-600 to-teal-600", icon: CheckCircle2 },
  ];

  const toggleType = (type: PaymentType) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      if (next.size > 1) next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
  };

  return (
    <div className="w-full max-w-6xl bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[95vh]">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      
      {/* Header */}
      <div className="px-8 pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <CreditCard className="w-6 h-6 text-emerald-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Collective Settlement</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{loan.userId?.name}</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">ID: {loan._id.slice(-6)}</span>
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-white/5 hidden md:block" />

          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-2xl group hover:border-emerald-500/20 transition-all">
             <div className="flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500 group-hover:text-emerald-500/70 transition-colors">Evaluation Date</p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{nepaliSelected}</p>
             </div>
             <div className="w-[180px] relative">
                <NepaliDatePicker 
                  value={effectiveDate} 
                  onChange={(date) => {
                    setEffectiveDate(date);
                    const msg = `Interest Ledger Refreshed: ${adToBs(date).year}/${adToBs(date).month}/${adToBs(date).day}`;
                    setDateChangeMessage(msg);
                    setTimeout(() => setDateChangeMessage(null), 4000);
                  }} 
                  disableFuture={true}
                />
                
                {dateChangeMessage && (
                   <div className="absolute left-full ml-5 top-1/2 -translate-y-1/2 whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500 z-50">
                      <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl backdrop-blur-xl flex items-center gap-3 shadow-[0_10px_40px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/20">
                         <div className="relative">
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                            <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider leading-none">{dateChangeMessage}</span>
                            <span className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-widest mt-1">Precise Calculation Active</span>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-95"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>

      <form 
        onSubmit={handleSubmit} 
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        className="flex flex-col flex-1 overflow-hidden lg:flex-row"
      >
        {/* Left Side: Detailed Content (70%) */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar lg:border-r lg:border-white/5 lg:w-[70%]">

          {/* Member Advance Balance Consumption / Deduction Check */}
          {availableAdvance > 0 && (
            <div className={`p-6 rounded-[24px] border transition-all duration-500 shadow-2xl ${
              useAdvance 
                ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5" 
                : "bg-white/[0.02] border-white/5 opacity-80"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-500 ${useAdvance ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 rotate-12 scale-110" : "bg-white/5 border-white/10 text-slate-600"}`}>
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-tight ${useAdvance ? "text-emerald-400" : "text-slate-400"}`}>Deduct from Advance Balance?</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                         <span className="text-[10px] text-emerald-400 font-black tabular-nums">
                           Rs. {availableAdvance.toLocaleString()}
                         </span>
                       </div>
                       <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Available Credit</span>
                       {useAdvance && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-full font-black animate-pulse">ACTIVE DEDUCTION</span>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                   <button
                       type="button"
                       onClick={() => {
                         const newState = !useAdvance;
                         setUseAdvance(newState);
                         if (newState) setAdvanceToConsume(Math.min(availableAdvance, outstandingTotal + (shouldRenew ? parsedRenewalFee : 0)));
                         else setAdvanceToConsume(0);
                       }}
                       className={`w-14 h-7 rounded-full transition-all relative ring-4 ring-offset-4 ring-offset-slate-950 ${useAdvance ? "bg-emerald-500 ring-emerald-500/10" : "bg-slate-800 ring-transparent"}`}
                   >
                       <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-xl transition-all duration-500 ${useAdvance ? "left-8" : "left-1"}`} />
                   </button>
                   <span className="text-[8px] text-slate-700 font-bold uppercase tracking-tighter mr-1">{useAdvance ? "YES, DEDUCT" : "NO, STORE"}</span>
                </div>
              </div>

              {useAdvance && (
                <div className="space-y-4 pt-5 mt-4 border-t border-emerald-500/10 animate-in fade-in slide-in-from-top-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                       <label className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest px-1">Amount to Subtract from Total</label>
                       <div className="relative group/deduct text-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500/30 group-focus-within/deduct:text-emerald-500 transition-colors">Rs.</span>
                          <input 
                            type="number"
                            max={availableAdvance}
                            value={advanceToConsume}
                            onChange={(e) => setAdvanceToConsume(Math.min(availableAdvance, Math.ceil(parseFloat(e.target.value) || 0)))}
                            className="w-full bg-slate-950 border border-emerald-500/20 rounded-xl pl-8 pr-3 py-3 text-xs font-black text-emerald-400 outline-none shadow-inner focus:border-emerald-500/50 transition-all placeholder:text-slate-800"
                            placeholder="0"
                          />
                       </div>
                    </div>
                    <div className="flex-[0.6] pt-5 flex gap-2">
                       <button
                         type="button"
                         onClick={() => setAdvanceToConsume(Math.min(availableAdvance, outstandingTotal + (shouldRenew ? parsedRenewalFee : 0)))}
                         className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[8px] font-black text-emerald-500 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/5"
                       >
                         Cover Due
                       </button>
                       <button
                         type="button"
                         onClick={() => setAdvanceToConsume(availableAdvance)}
                         className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[8px] font-black text-blue-400 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/5"
                       >
                         Deduct All
                       </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                     <div className="w-1.5 h-1.5 border border-emerald-500/50 rounded-full animate-ping" />
                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">This will reduce the cash requirement for this transaction by <span className="text-emerald-500 font-black">Rs. {advanceToConsume.toLocaleString()}</span></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Renew Segment */}
          <section className={`p-6 rounded-[24px] border transition-all duration-500 ${
            shouldRenew 
              ? "bg-amber-500/5 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]" 
              : "bg-white/[0.02] border-white/5 opacity-80"
          }`}>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${shouldRenew ? "bg-amber-500/20 border-amber-500/30 text-amber-500" : "bg-white/5 border-white/10 text-slate-600"}`}>
                      <RefreshCw className={`w-5 h-5 ${shouldRenew ? "animate-spin-slow" : ""}`} />
                   </div>
                   <div>
                      <p className={`text-[11px] font-black uppercase tracking-tight ${shouldRenew ? "text-amber-500" : "text-slate-500"}`}>Renewal Status</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Initialize Loan Term Extension</p>
                   </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShouldRenew(!shouldRenew)}
                    className={`w-12 h-6 rounded-full transition-all relative ${shouldRenew ? "bg-amber-500" : "bg-slate-800"}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${shouldRenew ? "left-7" : "left-1"}`} />
                </button>
             </div>

             {shouldRenew && (
               <div className="space-y-4 pt-4 border-t border-amber-500/10 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Renewal Charge (RE)</label>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/50">Rs.</span>
                          <input 
                            type="number"
                            value={newRenewalFee}
                            readOnly
                            className="w-full bg-black/20 border border-amber-500/10 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-500 outline-none cursor-not-allowed shadow-inner"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Extend For</label>
                       <div className="flex gap-1">
                          {[90, 180, 270].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setExtensionDays(d)}
                              className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${extensionDays === d ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}
                            >
                              {d}d
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                     <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                     <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tight">Minimum Rs. {Math.ceil(totalRequiredToRenew).toLocaleString()} needed to finalize renewal transaction.</p>
                  </div>
               </div>
             )}
          </section>

          {/* Detailed Financial Table */}
          <div className="flex items-center justify-between px-2 mb-3">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Financial Breakdown
             </h4>
             <button
                type="button"
                onClick={handleDownloadStatement}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
             >
                {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Download Bill
             </button>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden">

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-12 text-center">Tgt</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Outstanding</th>
                  <th className="px-5 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <Row 
                  label="Activation Fee" 
                  value={scOutstanding} 
                  allocated={allocations.SERVICE_CHARGE}
                  isSelected={selectedTypes.has("SERVICE_CHARGE")}
                  onToggle={() => toggleType("SERVICE_CHARGE")}
                  color="text-slate-400" 
                />
                <Row 
                  label="Standard Interest" 
                  value={interestOutstanding} 
                  allocated={allocations.INTEREST}
                  isSelected={selectedTypes.has("INTEREST")}
                  onToggle={() => toggleType("INTEREST")}
                  color="text-blue-400" 
                />
                <Row 
                  label="Penalty Interest (Exceed)" 
                  value={penaltyOutstanding} 
                  allocated={allocations.PENALTY}
                  isSelected={selectedTypes.has("PENALTY")}
                  onToggle={() => toggleType("PENALTY")}
                  color="text-rose-400" 
                />
                {shouldRenew && (
                  <Row 
                    label="Renewal Fee (Current)" 
                    value={parsedRenewalFee} 
                    allocated={allocations.RENEWAL > rnOutstanding ? Math.min(parsedRenewalFee, allocations.RENEWAL - rnOutstanding) : 0}
                    isSelected={selectedTypes.has("RENEWAL")}
                    onToggle={() => toggleType("RENEWAL")}
                    color="text-amber-400" 
                  />
                )}
                {rnOutstanding > 0 && (
                  <Row 
                    label="Renewal Fee (Previous)" 
                    value={rnOutstanding} 
                    allocated={Math.min(rnOutstanding, allocations.RENEWAL)}
                    isSelected={selectedTypes.has("RENEWAL")}
                    onToggle={() => toggleType("RENEWAL")}
                    color="text-amber-500" 
                  />
                )}

                <tr className="bg-white/[0.01] border-t border-white/5">
                  <td colSpan={2} className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Subtotal (Excl. Principal)</td>
                  <td className="px-5 py-3 text-right text-[10px] font-bold text-slate-400">Rs. {Math.ceil(scOutstanding + interestOutstanding + penaltyOutstanding + rnOutstanding + (shouldRenew ? parsedRenewalFee : 0)).toLocaleString()}</td>

                  <td className="px-5 py-3 text-right text-[10px] font-black text-slate-300">
                    Rs. {Math.ceil(allocations.SERVICE_CHARGE + allocations.INTEREST + allocations.PENALTY + allocations.RENEWAL).toLocaleString()}

                  </td>
                </tr>

                <Row 
                  label={excessMode === "PRINCIPAL" ? "Principal Reduction" : "Principal Balance"}
                  value={getOutstandingForType("PRINCIPAL")} 
                  allocated={allocations.PRINCIPAL}
                  isSelected={selectedTypes.has("PRINCIPAL")}
                  onToggle={() => {}} // Disabled manual toggle for principal
                  color="text-emerald-400" 
                  isStatic={true}
                  disabled={grossSettleAmount <= (extrasTotal + (shouldRenew ? parsedRenewalFee : 0))}
                />
                
                {allocations.ADVANCE > 0 && (
                  <tr className="bg-blue-500/5 border-l-2 border-l-blue-500">
                    <td className="px-5 py-3 text-center">
                       <CheckCircle2 className="w-4 h-4 text-blue-500 mx-auto" />
                    </td>
                    <td className="px-5 py-3">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight">Consolidated Advanced Credit</p>
                       <p className="text-[8px] text-blue-500/60 font-bold uppercase tracking-widest">Held for future obligations</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                       <p className="text-[10px] font-bold text-slate-700">—</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                       <p className="text-xs font-black text-blue-400">Rs. {Math.ceil(allocations.ADVANCE).toLocaleString()}</p>
                    </td>
                  </tr>
                )}
                
                <tr className="bg-emerald-500/5 border-t border-emerald-500/20">
                  <td colSpan={2} className="px-5 py-4">
                     <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight">Net Settlement Target</span>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Liability: Rs. {totalLiability.toLocaleString()}</span>
                           <span className="w-1 h-1 bg-slate-700 rounded-full" />
                           <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">Credit: Rs. {availableAdvance.toLocaleString()}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-5 py-4 text-right text-xs font-bold text-slate-400">Rs. {netSettlementLiability.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-lg font-black text-emerald-400">Rs. {grossSettleAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Advanced Benefit Choice - Only visible if we have a partial principal surplus (not yet full payoff) */}
          {(() => {
            const threshold = extrasTotal + (shouldRenew ? parsedRenewalFee : 0);
            const amt = grossSettleAmount;
            const principalBalance = getOutstandingForType("PRINCIPAL");
            return amt > threshold && amt < (threshold + principalBalance) && selectedTypes.has("PRINCIPAL");
          })() && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[28px] p-6 space-y-4 animate-in slide-in-from-top-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -translate-y-1/2 translate-x-1/2" />
               <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                     <HandCoins className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-emerald-400 tracking-tight">Surplus Balance Strategy</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Rs. {Math.ceil(allocations.PRINCIPAL + allocations.ADVANCE).toLocaleString()} detected beyond fees/interest</p>
                  </div>
               </div>
               
               <div className="flex gap-3 relative z-10">
                  <button
                    type="button"
                    onClick={() => setExcessMode("PRINCIPAL")}
                    disabled={grossSettleAmount > (extrasTotal + (shouldRenew ? parsedRenewalFee : 0) + getOutstandingForType("PRINCIPAL"))}
                    className={`flex-1 p-4 rounded-2xl border transition-all text-left relative group ${excessMode === "PRINCIPAL" ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-white/5 border-white/5 opacity-60 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"}`}
                  >
                     <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${excessMode === "PRINCIPAL" ? "text-white" : "text-slate-500"}`}>Reduce Principal</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${excessMode === "PRINCIPAL" ? "bg-emerald-500 border-emerald-500" : "border-slate-700"}`}>
                           {excessMode === "PRINCIPAL" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                     </div>
                     <p className="text-[9px] text-slate-500 mt-1 leading-tight font-medium">Reduces core borrowed balance immediately.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExcessMode("ADVANCE")}
                    className={`flex-1 p-4 rounded-2xl border transition-all text-left relative group ${excessMode === "ADVANCE" ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "bg-white/5 border-white/5 opacity-60 hover:opacity-100"}`}
                  >
                     <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${excessMode === "ADVANCE" ? "text-white" : "text-slate-500"}`}>Advance Credit</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${excessMode === "ADVANCE" ? "bg-blue-500 border-blue-500" : "border-slate-700"}`}>
                           {excessMode === "ADVANCE" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                     </div>
                     <p className="text-[9px] text-slate-500 mt-1 leading-tight font-medium">Keeps principal same. Funds available as credit for future dues.</p>
                  </button>
               </div>
            </div>
          )}

          {/* Note Section */}
          <div className="pt-4">
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">Internal Transaction Note</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Audit reference info..."
                rows={2}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white text-xs font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-800 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Control Panel (30%) */}
        <div className="lg:w-[30%] shrink-0 p-8 bg-slate-900/60 backdrop-blur-3xl flex flex-col justify-between border-t lg:border-t-0 border-white/5 relative overflow-y-auto custom-scrollbar min-h-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="space-y-8 relative z-10">
            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                   <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                   Deposit Registry
                </p>
                <button
                  type="button"
                  onClick={handleClearDue}
                  className="text-[9px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest underline decoration-emerald-500/20 underline-offset-4"
                >
                  Payoff Net: Rs. {netSettlementLiability.toLocaleString()}
                </button>
              </div>
              
              <div className="group/input flex items-center bg-slate-950/40 border border-white/10 rounded-[24px] px-6 py-4 transition-all focus-within:border-emerald-500/40 focus-within:bg-white/[0.02] shadow-xl">
                <span className={`font-black text-sm transition-colors duration-300 ${cashDeposit > 0 ? "text-emerald-400/40" : "text-slate-700"} shrink-0`}>
                  Rs.
                </span>
                <input
                  type="text"
                  value={displayAmount}
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none outline-none text-white font-black text-2xl text-right placeholder:text-slate-900"
                />
              </div>
                
              <div className="mt-4">
                 <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center divide-x divide-white/5">
                    <div className="flex-1 px-2 space-y-1">
                       <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Deposit</p>
                       <p className="text-[11px] text-white font-black tabular-nums">Rs. {cashDeposit.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 px-4 space-y-1">
                       <p className={`text-[8px] font-black uppercase tracking-widest ${useAdvance && advanceToConsume > 0 ? "text-blue-500" : "text-slate-600"}`}>Credit</p>
                       <p className={`text-[11px] font-black tabular-nums ${useAdvance && advanceToConsume > 0 ? "text-blue-400" : "text-slate-600"}`}>
                          {useAdvance && advanceToConsume > 0 ? `+ ${advanceToConsume.toLocaleString()}` : "0"}
                       </p>
                    </div>
                    <div className="flex-[1.4] pl-4 space-y-0.5">
                       <p className="text-[8px] text-emerald-500/70 font-black uppercase tracking-widest">Gross Settlement</p>
                       <p className="text-xl font-black text-emerald-400 tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">Rs. {grossSettleAmount.toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Context Insights */}
            <div className="p-5 bg-white/[0.01] border border-white/5 rounded-[24px] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Transaction Type</span>
                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isFullSettlement ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20" : "bg-blue-500/20 text-blue-500 border border-blue-500/20"}`}>
                  {isFullSettlement ? "Full Settle" : "Partial Pay"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Auto Renewal</span>
                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${shouldRenew ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" : "bg-slate-800/40 text-slate-600 border border-white/5"}`}>
                  {shouldRenew ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            {shouldRenew && !canRenew && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">Insufficient for Renewal</p>
                  <p className="text-[10px] text-rose-400 font-medium mt-1 leading-tight">Must pay at least Rs. {Math.ceil(totalRequiredToRenew).toLocaleString()} to cover all interest and fees before term extension.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 mt-12 relative z-10">
            <button
              type="submit"
              disabled={loading || grossSettleAmount <= 0 || (shouldRenew && !canRenew)}
              className="w-full py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all text-[12px] flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.25)] active:scale-95 disabled:opacity-50 ring-1 ring-white/10 hover:brightness-110"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              {isFullSettlement ? "Finalize Settlement" : "Post Payment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-5 bg-white/[0.03] hover:bg-white/5 text-slate-500 hover:text-white font-black uppercase tracking-[0.15em] rounded-[24px] transition-all text-[11px] active:scale-95 border border-white/5"
            >
              Abort Action
            </button>
          </div>
        </div>
      </form>
      
      {/* Print Options Popup Modal */}
      {showPrintOptions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
           {/* Backdrop with extreme blur */}
           <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => setShowPrintOptions(false)} />
           
           <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
              
              <div className="p-10 space-y-8">
                 <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-[20px] border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                       <FileText className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Print Configuration</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Select items to reflect on the bill</p>
                 </div>

                 <div className="space-y-4">
                    {/* Option 1: Renewal */}
                    <button
                      type="button"
                      onClick={() => setShouldRenew(!shouldRenew)}
                      className={`w-full p-5 rounded-[24px] border transition-all flex items-center justify-between group ${shouldRenew ? "bg-amber-500/10 border-amber-500/40" : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"}`}
                    >
                       <div className="flex items-center gap-4 text-left">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${shouldRenew ? "bg-amber-500/20 border-amber-500/20 text-amber-500" : "bg-white/5 border-white/10 text-slate-600"}`}>
                             <RefreshCw className={`w-5 h-5 ${shouldRenew ? "animate-spin-slow" : ""}`} />
                          </div>
                          <div>
                             <p className={`text-[11px] font-black uppercase tracking-tight ${shouldRenew ? "text-amber-400" : "text-slate-400"}`}>Include Renewal Fee</p>
                             <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5 tracking-widest">Adds Rs. {parsedRenewalFee.toLocaleString()} to total</p>
                          </div>
                       </div>
                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${shouldRenew ? "bg-amber-500 border-amber-500" : "border-slate-700"}`}>
                          {shouldRenew && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                       </div>
                    </button>

                    {/* Option 2: Advance Deduction */}
                    <button
                      type="button"
                      disabled={availableAdvance <= 0}
                      onClick={() => {
                         const next = !useAdvance;
                         setUseAdvance(next);
                         if (next) setAdvanceToConsume(Math.min(availableAdvance, outstandingTotal + (shouldRenew ? parsedRenewalFee : 0)));
                      }}
                      className={`w-full p-5 rounded-[24px] border transition-all flex items-center justify-between group ${useAdvance ? "bg-blue-500/10 border-blue-500/40" : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed"}`}
                    >
                       <div className="flex items-center gap-4 text-left">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${useAdvance ? "bg-blue-500/20 border-blue-500/20 text-blue-500" : "bg-white/5 border-white/10 text-slate-600"}`}>
                             <HandCoins className="w-5 h-5" />
                          </div>
                          <div>
                             <p className={`text-[11px] font-black uppercase tracking-tight ${useAdvance ? "text-blue-400" : "text-slate-400"}`}>Apply Advance Credit</p>
                             <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5 tracking-widest">Available: Rs. {availableAdvance.toLocaleString()}</p>
                          </div>
                       </div>
                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${useAdvance ? "bg-blue-500 border-blue-500" : "border-slate-700"}`}>
                          {useAdvance && <CheckCircle2 className="text-slate-950 w-3 h-3 stroke-[3]" />}
                       </div>
                    </button>
                 </div>

                 <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="button"
                      onClick={finalDownload}
                      className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-[24px] text-[11px] shadow-[0_20px_40px_rgba(59,130,246,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                       <Download className="w-4 h-4" />
                       Generate Detailed Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrintOptions(false)}
                      className="w-full py-4 text-[10px] text-slate-600 hover:text-slate-400 font-black uppercase tracking-widest transition-colors"
                    >
                       Cancel Print
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, allocated, isSelected, onToggle, color, disabled, isStatic }: any) {
if (value <= 0 && label !== "Principal Balance" && label !== "Principal Reduction") return null;

return (
  <tr 
    onClick={(!disabled && !isStatic) ? onToggle : undefined}
    className={`group transition-colors ${disabled ? 'opacity-20 cursor-not-allowed filter grayscale' : (isStatic ? 'cursor-default' : 'cursor-pointer')} ${isSelected ? 'bg-white/[0.03]' : 'bg-transparent opacity-60 hover:opacity-100'}`}
  >
    <td className="px-5 py-4 text-center">
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800'} ${disabled ? 'bg-slate-900 border-slate-700' : ''}`}>
         {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
    </td>
    <td className="px-5 py-4">
      <p className={`text-[10px] font-black uppercase tracking-tight transition-colors ${isSelected && !disabled ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </p>
    </td>
    <td className="px-5 py-4 text-right">
      <p className="text-[10px] font-bold text-slate-400">Rs. {Math.ceil(value).toLocaleString()}</p>
    </td>
    <td className="px-5 py-4 text-right">
      <p className={`text-xs font-black ${isSelected && allocated > 0 ? (color || 'text-emerald-400') : 'text-slate-800'}`}>
        {allocated > 0 ? `Rs. ${Math.ceil(allocated).toLocaleString()}` : "—"}
      </p>
    </td>
  </tr>
);
}
