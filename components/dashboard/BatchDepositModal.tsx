"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  User as UserIcon,
  Wallet,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Settings2,
  SaveAll,
  CheckSquare,
  Square,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { getUsersByOrg } from "@/lib/actions/user";
import { createMultipleDeposits } from "@/lib/actions/deposit";
import NepaliDatePicker from "./NepaliDatePicker";
import { getCurrentNepaliDate, NEPALI_MONTHS, bsToAd, getDaysInMonth, parseNepaliMonth, adToBs } from "@/lib/utils/nepali-date";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface BatchDepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
  orgConfig: any;
  isAdmin: boolean;
}

interface BatchRowData {
  userId: string;
  included: boolean;
  amount: string;
  useCredit: boolean;
  paymentDate: string;
  remarks: string;
  proof: string;
  expanded: boolean;
}

export default function BatchDepositModal({ onClose, onSuccess, orgConfig, isAdmin }: BatchDepositModalProps) {
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // Global Controls
  const [globalMonth, setGlobalMonth] = useState("");
  const [globalType, setGlobalType] = useState<"MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST">("MONTHLY");
  const [globalDate, setGlobalDate] = useState(new Date().toISOString());
  const [globalAmount, setGlobalAmount] = useState(orgConfig?.monthlyDepositAmount?.toString() || "");

  // UI State
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Batch Data State (Keyed by User ID)
  const [batchData, setBatchData] = useState<Record<string, BatchRowData>>({});

  useEffect(() => {
    const current = getCurrentNepaliDate();
    setGlobalMonth(`${NEPALI_MONTHS[current.month - 1]} ${current.year}`);

    const fetchUsers = async () => {
      if (!currentUser?.organizationId) return;
      if (isAdmin) {
        setLoadingUsers(true);
        const res = await getUsersByOrg(currentUser.organizationId);
        if (res.success) {
          const activeUsers = res.data.filter((u: any) => u.isActive !== false && u.role === "USER");

          // Sort members with advance balance to the top
          activeUsers.sort((a: any, b: any) => {
            const aCredit = a.advanceBalance || 0;
            const bCredit = b.advanceBalance || 0;
            if (aCredit > 0 && bCredit <= 0) return -1;
            if (bCredit > 0 && aCredit <= 0) return 1;
            return 0;
          });

          setUsers(activeUsers);

          // Initialize Batch Data
          const initialBatch: Record<string, BatchRowData> = {};
          activeUsers.forEach((u: any) => {
            const hasCredit = (u.advanceBalance || 0) > 0;
            initialBatch[u._id] = {
              userId: u._id,
              included: false,
              amount: orgConfig?.monthlyDepositAmount?.toString() || "",
              useCredit: false,
              paymentDate: new Date().toISOString(),
              remarks: "",
              proof: "",
              expanded: hasCredit
            };
          });
          setBatchData(initialBatch);
        }
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [currentUser?.organizationId, isAdmin, orgConfig]);

  // Bulk Actions
  const toggleAll = (include: boolean) => {
    setBatchData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key].included = include;
        if (include) {
          next[key].amount = globalAmount;
        }
      });
      return next;
    });
  };

  const applyGlobalDate = () => {
    setBatchData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key].included) {
          const updatedRow = next[key];
          updatedRow.paymentDate = globalDate;

          const user = users.find((u: any) => u._id === updatedRow.userId);
          const available = user?.advanceBalance || 0;

          let fineApplied = 0;
          let requiredAmount = orgConfig?.monthlyDepositAmount || 0;
          try {
            const target = parseNepaliMonth(globalMonth);
            const daysInMonth = getDaysInMonth(target.year, target.month);
            const lastDayAd = bsToAd(target.year, target.month, daysInMonth);
            const paymentDate = new Date(updatedRow.paymentDate);
            lastDayAd.setHours(23, 59, 59, 999);
            if (paymentDate > lastDayAd) fineApplied = orgConfig?.lateFee || 0;
          } catch (e) { }

          requiredAmount += fineApplied;

          if (updatedRow.useCredit) {
            const newCash = Math.max(0, requiredAmount - available);
            updatedRow.amount = newCash.toString();
            const usedCredit = Math.min(available, requiredAmount);
            if (usedCredit > 0) updatedRow.remarks = `Credit of Rs. ${usedCredit} used`;
          } else {
            updatedRow.amount = requiredAmount.toString();
            if (updatedRow.remarks.startsWith("Credit of Rs.")) updatedRow.remarks = "";
          }
        }
      });
      return next;
    });
    toast.success("Global date applied to selected members");
  };

  const applyGlobalAmount = () => {
    setBatchData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key].included) {
          next[key].amount = globalAmount;
        }
      });
      return next;
    });
    toast.success("Global amount applied to selected members");
  };

  const isMonthBeforeBaseline = (monthStr: string) => {
    if (!orgConfig?.financials?.initialOpeningMonth || !orgConfig?.financials?.initialOpeningYear) return false;
    const target = parseNepaliMonth(monthStr);
    const startM = NEPALI_MONTHS.indexOf(orgConfig.financials.initialOpeningMonth) + 1;
    const startY = orgConfig.financials.initialOpeningYear;
    if (target.year < startY) return true;
    if (target.year === startY && target.month < startM) return true;
    return false;
  };

  const updateRow = async (userId: string, field: keyof BatchRowData, value: any) => {
    setBatchData(prev => {
      const updatedRow = { ...prev[userId], [field]: value };

      if (field === 'included' && value === true) {
        updatedRow.amount = globalAmount;
      }

      if (field === 'useCredit' || field === 'paymentDate') {
        const user = users.find((u: any) => u._id === userId);
        const available = user?.advanceBalance || 0;

        let fineApplied = 0;
        let requiredAmount = orgConfig?.monthlyDepositAmount || 0;
        try {
          const target = parseNepaliMonth(globalMonth);
          const payment = adToBs(updatedRow.paymentDate);
          const monthsLate = (payment.year - target.year) * 12 + (payment.month - target.month);
          if (monthsLate > 0) {
            fineApplied = monthsLate * (orgConfig?.lateFee || 0);
          }
        } catch (e) { }

        requiredAmount += fineApplied;

        if (updatedRow.useCredit) {
          const newCash = Math.max(0, requiredAmount - available);
          updatedRow.amount = newCash.toString();
          const usedCredit = Math.min(available, requiredAmount);
          updatedRow.remarks = usedCredit > 0 ? `Credit of Rs. ${usedCredit} used` : "";
        } else {
          updatedRow.amount = requiredAmount.toString();
          if (updatedRow.remarks.startsWith("Credit of Rs.")) updatedRow.remarks = "";
        }
      }

      return { ...prev, [userId]: updatedRow };
    });

  };

  const calculateRowDetails = (row: BatchRowData) => {
    let fineApplied = 0;
    let requiredAmount = 0;
    let advancedPayment = 0;
    let lateFee = orgConfig?.lateFee || 0;
    let creditUsed = 0;

    if (globalType === "MONTHLY" && globalMonth) {
      try {
        const target = parseNepaliMonth(globalMonth);
        const payment = adToBs(row.paymentDate);
        const monthsLate = (payment.year - target.year) * 12 + (payment.month - target.month);

        if (monthsLate > 0) {
          fineApplied = monthsLate * (orgConfig?.lateFee || 0);
        }

        requiredAmount = (orgConfig?.monthlyDepositAmount || 0) + fineApplied;
        const cashProvided = Number(row.amount) || 0;

        if (row.useCredit) {
          const user = users.find(u => u._id === row.userId);
          const available = user?.advanceBalance || 0;
          const neededFromCredit = Math.max(0, requiredAmount - cashProvided);
          creditUsed = Math.min(available, neededFromCredit);
        }

        const totalProvided = cashProvided + creditUsed;

        if (totalProvided < requiredAmount) {
          advancedPayment = cashProvided;
          creditUsed = 0;
        } else if (totalProvided > requiredAmount) {
          advancedPayment = totalProvided - requiredAmount;
        }
      } catch (e) { }
    }
    return { fineApplied, requiredAmount, advancedPayment, creditUsed };
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.accountNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const selectedCount = Object.values(batchData).filter(r => r.included).length;
  const totalAmount = Object.values(batchData)
    .filter(r => r.included)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleSubmit = async () => {
    const includedRows = Object.values(batchData).filter(r => r.included);
    if (includedRows.length === 0) {
      toast.error("Please select at least one member to process.");
      return;
    }

    if (!globalMonth) {
      toast.error("Target month is required");
      return;
    }

    setSubmitting(true);

    // Prepare payloads
    const payloads = includedRows.map(row => {
      const { creditUsed } = calculateRowDetails(row);

      return {
        userId: row.userId,
        organizationId: currentUser.organizationId,
        amount: Number(row.amount),
        month: globalMonth,
        depositType: globalType,
        depositDate: row.paymentDate,
        proof: row.proof,
        remarks: row.remarks,
        creditUsed: creditUsed,
      };
    });

    try {
      const res = await createMultipleDeposits(payloads);
      if (res.success) {
        if (res.errors && res.errors.length > 0) {
          toast.error(`Processed ${res.count} deposits, but ${res.errors.length} failed. Check member amounts.`);
          console.error("Batch Errors:", res.errors);
        } else {
          toast.success(`Successfully recorded ${res.count} deposits!`);
          onSuccess();
        }
      } else {
        toast.error(res.error || "Failed to process batch deposits");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="w-full h-full max-h-[900px] flex items-center justify-center">
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          className="w-full max-w-7xl h-full bg-slate-950 border border-white/10 rounded-[48px] shadow-[0_0_150px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col"
        >
          {/* Ambient Effects */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-[60]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-2xl shrink-0">
                <SaveAll className="w-4 h-4 text-blue-400/70" />
              </div>
              <div>
                <h2 className="text-[14px] font-black text-white tracking-tight uppercase">Batch Ledger</h2>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] -mt-0.5">Administrative Bulk Processing</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all group active:scale-90"
            >
              <X className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0 relative z-10">
            {/* Left Sidebar: Search & Global Controls */}
            <div className="w-full lg:w-72 bg-slate-950/40 backdrop-blur-sm border-r border-white/5 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
              {/* Selection Summary */}
              <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Queue Status</span>
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${selectedCount > 0 ? 'text-emerald-500' : 'text-slate-600'}`}>{selectedCount > 0 ? 'Active' : 'Idle'}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white tracking-tighter">{selectedCount}</span>
                  <span className="text-[9px] font-black text-slate-600 uppercase">Members</span>
                </div>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="w-full h-px bg-white/5" />

              {/* Global Settings */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-2.5 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Global Sync</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Target Month</label>
                  <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-1 relative">
                    <button type="button" onClick={() => {
                      const [mName, yStr] = globalMonth.split(" ");
                      let mIdx = NEPALI_MONTHS.indexOf(mName);
                      let year = parseInt(yStr);
                      if (mIdx === 0) { mIdx = 11; year--; } else { mIdx--; }
                      const nextMonth = `${NEPALI_MONTHS[mIdx]} ${year}`;
                      if (!isMonthBeforeBaseline(nextMonth)) {
                        setGlobalMonth(nextMonth);
                      }
                    }}
                      disabled={isMonthBeforeBaseline(globalMonth)}
                      className="w-8 h-8 bg-slate-950 border border-white/5 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 text-center relative">
                      <button type="button" onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }} className="text-[10px] font-black text-white tracking-tight uppercase flex items-center justify-center gap-1 group/mth hover:text-blue-400 transition-colors w-full py-1">
                        <span>{globalMonth.split(" ")[0]}</span>
                        <ChevronDown className={`w-3 h-3 text-slate-500 group-hover/mth:text-blue-400 transition-all ${showMonthDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showMonthDropdown && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl z-[100] p-1 grid grid-cols-2 gap-1 backdrop-blur-xl shadow-2xl">
                            {NEPALI_MONTHS.map(m => {
                              const isDisabled = isMonthBeforeBaseline(`${m} ${globalMonth.split(" ")[1]}`);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => { setGlobalMonth(`${m} ${globalMonth.split(" ")[1]}`); setShowMonthDropdown(false); }}
                                  className={`text-[9px] font-black rounded p-1.5 uppercase transition-all ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-blue-500/10 hover:text-blue-400'}`}
                                >
                                  {m.substring(0, 3)}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 text-center relative border-l border-white/5">
                      <button type="button" onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }} className="text-[10px] font-black text-white tracking-tight uppercase flex items-center justify-center gap-1 group/year hover:text-blue-400 transition-colors w-full py-1">
                        <span>{globalMonth.split(" ")[1]}</span>
                        <ChevronDown className={`w-3 h-3 text-slate-500 group-hover/year:text-blue-400 transition-all ${showYearDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showYearDropdown && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl z-[100] p-1 flex flex-col gap-1 backdrop-blur-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar">
                            {[2080, 2081, 2082, 2083, 2084, 2085].map(y => {
                              const isDisabled = isMonthBeforeBaseline(`${globalMonth.split(" ")[0]} ${y}`);
                              return (
                                <button
                                  key={y}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => { setGlobalMonth(`${globalMonth.split(" ")[0]} ${y}`); setShowYearDropdown(false); }}
                                  className={`text-[9px] font-black rounded p-1.5 uppercase transition-all ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-blue-500/10 hover:text-blue-400'}`}
                                >
                                  {y}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button type="button" onClick={() => {
                      const [mName, yStr] = globalMonth.split(" ");
                      let mIdx = NEPALI_MONTHS.indexOf(mName);
                      let year = parseInt(yStr);
                      if (mIdx === 11) { mIdx = 0; year++; } else { mIdx++; }
                      setGlobalMonth(`${NEPALI_MONTHS[mIdx]} ${year}`);
                    }} className="w-8 h-8 bg-slate-950 border border-white/5 rounded-lg flex items-center justify-center hover:bg-slate-900 transition-all text-slate-400 hover:text-white">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Date</label>
                    <button onClick={applyGlobalDate} className="text-[8px] text-blue-400 font-black hover:text-blue-300 uppercase transition-all">Sync All</button>
                  </div>
                  <NepaliDatePicker value={globalDate} onChange={setGlobalDate} side="bottom" compact />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Amount</label>
                    <button onClick={applyGlobalAmount} className="text-[8px] text-emerald-400 font-black hover:text-emerald-300 uppercase transition-all">Sync All</button>
                  </div>
                  <div className="relative group/globalamt">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">Rs.</span>
                    <input type="number" value={globalAmount} onChange={(e) => setGlobalAmount(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-white focus:border-emerald-500/30 outline-none transition-all" />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-950/20 relative border-r border-white/5">
              {/* Center Header: Search & Selection */}
              <div className="p-4 border-b border-white/5 bg-white/[0.01] backdrop-blur-sm flex items-center gap-4 sticky top-0 z-50">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search member in ledger..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-11 pr-11 py-3 text-[11px] text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all shadow-inner"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleAll(true)} className="px-4 py-3 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black text-slate-400 hover:text-emerald-400 transition-all uppercase tracking-widest flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> Select All
                  </button>
                  <button onClick={() => toggleAll(false)} className="px-4 py-3 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black text-slate-400 hover:text-rose-400 transition-all uppercase tracking-widest flex items-center gap-2">
                    <Square className="w-4 h-4" /> Clear All
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {loadingUsers ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Initializing...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-10 opacity-30">
                    <Search className="w-8 h-8 text-slate-500" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No members found</p>
                  </div>
                ) : (
                  (() => {
                    let hasShownCreditHeader = false;
                    let hasShownNormalHeader = false;

                    return filteredUsers.flatMap(user => {
                      const row = batchData[user._id];
                      if (!row) return [];

                      const hasCredit = (user.advanceBalance || 0) > 0;
                      const elements = [];

                      if (hasCredit && !hasShownCreditHeader) {
                        elements.push(
                          <div key="credit-header" className="text-[9px] font-black text-emerald-500 uppercase tracking-widest py-1 border-b border-emerald-500/10 mb-1 flex items-center gap-2">
                            <Wallet className="w-3 h-3" /> Credit Pool Ready
                          </div>
                        );
                        hasShownCreditHeader = true;
                      } else if (!hasCredit && !hasShownNormalHeader) {
                        elements.push(
                          <div key="normal-header" className={`text-[9px] font-black text-slate-500 uppercase tracking-widest py-1 border-b border-white/5 mb-1 flex items-center gap-2 ${hasShownCreditHeader ? "mt-4" : "mt-1"}`}>
                            <UserIcon className="w-3 h-3" /> Standard Entry
                          </div>
                        );
                        hasShownNormalHeader = true;
                      }

                      const { fineApplied, requiredAmount, creditUsed } = calculateRowDetails(row);
                      const totalProvided = Number(row.amount) + creditUsed;
                      const isInsufficient = totalProvided < requiredAmount && globalType === "MONTHLY";

                      elements.push(
                        <motion.div id={`user-row-${user._id}`} key={user._id} layout className={`bg-slate-950 border ${row.included ? (isInsufficient ? 'border-amber-500/30' : 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]') : 'border-white/5 opacity-60'} rounded-2xl transition-all duration-300`}>
                          <div className="flex items-center gap-4 px-4 py-3">
                            <button onClick={() => updateRow(user._id, 'included', !row.included)} className={`w-5 h-5 shrink-0 rounded-lg border flex items-center justify-center transition-all ${row.included ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-slate-700 hover:border-slate-500'}`}>
                              {row.included && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </button>

                            <div className="flex items-center gap-3 w-48 shrink-0">
                              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden relative shrink-0">
                                {user.image || user.profileImage ? <Image src={user.image || user.profileImage} alt="" fill sizes="32px" className="object-cover" /> : <UserIcon className="w-3.5 h-3.5 text-slate-700" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-white truncate leading-none mb-1">{user.name}</p>
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest truncate">A/C: {user.accountNumber || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="flex-1 flex items-center gap-4">
                              <div className="flex-1 relative group/amt">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600">Rs.</span>
                                <input type="number" disabled={!row.included} value={row.amount} onChange={(e) => updateRow(user._id, 'amount', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl pl-8 pr-3 py-2 text-[11px] font-black text-emerald-400 outline-none disabled:opacity-30 transition-all focus:border-emerald-500/50" />
                              </div>
                              <div className="w-40 shrink-0">
                                <NepaliDatePicker value={row.paymentDate} onChange={(v) => updateRow(user._id, 'paymentDate', v)} side="bottom" compact />
                              </div>
                            </div>

                            <button onClick={() => updateRow(user._id, 'expanded', !row.expanded)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${row.expanded ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                              <Settings2 className={`w-4 h-4 transition-transform ${row.expanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {row.expanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-slate-900/50 p-3 flex items-center justify-between gap-4">
                                <div className="flex gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Late Fee</span>
                                    <span className={`text-[10px] font-black ${fineApplied > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Rs. {fineApplied}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Credit Used</span>
                                    <span className="text-[10px] font-black text-emerald-400">Rs. {creditUsed}</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <input type="text" value={row.remarks} onChange={(e) => updateRow(user._id, 'remarks', e.target.value)} placeholder="Administrative notes..." className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-white outline-none focus:border-blue-500/50" />
                                </div>
                                {user.advanceBalance > 0 && (
                                  <button onClick={() => updateRow(user._id, 'useCredit', !row.useCredit)} className={`px-4 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${row.useCredit ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-white/5 text-slate-500 hover:text-white'}`}>
                                    <Wallet className="w-3.5 h-3.5" />
                                    Pool Balance (Rs. {user.advanceBalance || 0})
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                      return elements;
                    });
                  })()
                )}
              </div>
            </div>

            {/* Right Sidebar: Audit Confirmation */}
            <div className="w-full lg:w-64 bg-slate-900/50 backdrop-blur-xl p-5 flex flex-col gap-6 shrink-0 border-l border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-tight">Audit Check</h3>
                  <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Final Confirmation</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-950 border border-white/5 p-3 rounded-xl">
                  <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1 text-center">Batch Queue</p>
                  <div className="flex justify-center items-baseline gap-1">
                    <span className="text-2xl font-black text-white tracking-tighter">{selectedCount}</span>
                    <span className="text-[9px] font-black text-slate-600 uppercase">Selected</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-white/5 p-3 rounded-xl">
                  <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1 text-center">Liquidity Summary</p>
                  <div className="flex justify-center items-baseline gap-1.5">
                    <span className="text-[9px] font-black text-emerald-500 uppercase">Rs.</span>
                    <span className="text-2xl font-black text-emerald-400 tracking-tighter">{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">{globalMonth || 'Select Period'}</p>
                </div>

                {selectedCount > 0 && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[8px] text-emerald-200/70 font-bold leading-tight uppercase tracking-tight">
                      Batch validated against organization policies. Ready for commit.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedCount === 0}
                  className={`w-full relative group py-4 text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 overflow-hidden ${submitting ? 'bg-slate-800' : 'bg-emerald-600'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span className="text-[10px]">Commit Batch</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-[6px] text-slate-600 text-center uppercase font-black tracking-[0.1em] px-4 leading-relaxed">
                  By committing, you agree to update the organization's ledger for {selectedCount} members.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
