"use client";

import { useState, useEffect } from "react";
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
  TrendingUp,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { getUsersByOrg } from "@/lib/actions/user";
import { createDeposit, updateDeposit } from "@/lib/actions/deposit";
import NepaliDatePicker from "./NepaliDatePicker";
import { getCurrentNepaliDate, NEPALI_MONTHS, parseNepaliMonth, getDaysInMonth, bsToAd, adToBs } from "@/lib/utils/nepali-date";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface AdminDepositFormProps {
  onClose: () => void;
  onSuccess: () => void;
  orgConfig: any;
  isAdmin: boolean;
  initialData?: any;
}

export default function AdminDepositForm({ onClose, onSuccess, orgConfig, isAdmin, initialData }: AdminDepositFormProps) {
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // Search & Member State
  const [search, setSearch] = useState(initialData?.userId?.name || "");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(initialData?.userId || null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Form State
  const [depositMonth, setDepositMonth] = useState(initialData?.month || "");
  const [depositType, setDepositType] = useState<"MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST" | "NAV" | "MISCELLANEOUS">(initialData?.depositType || "MONTHLY");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState(initialData?.creditUsed || 0);
  const [paymentDate, setPaymentDate] = useState(initialData?.depositDate || new Date().toISOString());
  const [proof, setProof] = useState(initialData?.proof || "");
  const [remarks, setRemarks] = useState(initialData?.remarks || "");

  // Status State
  const [loading, setLoading] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser?.organizationId) return;

      if (isAdmin) {
        setLoadingUsers(true);
        const res = await getUsersByOrg(currentUser.organizationId);
        if (res.success) {
          setUsers(res.data);
          if (initialData?.userId) {
            const targetId = typeof initialData.userId === 'object' ? initialData.userId._id : initialData.userId;
            const foundUser = res.data.find((u: any) => u._id === targetId);
            if (foundUser) setSelectedUser(foundUser);
          }
        }
        setLoadingUsers(false);
      } else {
        setSelectedUser({
          _id: currentUser.id,
          name: currentUser.name,
          advanceBalance: currentUser.advanceBalance || 0,
          accountNumber: currentUser.accountNumber
        });
        setSearch(currentUser.name);
      }
    };
    fetchUsers();

    if (!initialData) {
      const current = getCurrentNepaliDate();
      setDepositMonth(`${NEPALI_MONTHS[current.month - 1]} ${current.year}`);
    }
  }, [currentUser?.organizationId, isAdmin, initialData]);

  useEffect(() => {
    if (selectedUser && !initialData && !amount && depositType === "MONTHLY") {
      setAmount(orgConfig?.monthlyDepositAmount || "");
    }
  }, [selectedUser, depositType, orgConfig, initialData, amount]);

  const filteredUsers = users.filter(u =>
    u.role === "USER" && (
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.accountNumber?.includes(search)
    )
  );

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    setSearch(user.name);
    setShowUserDropdown(false);
    setUseCredit(false);
    setCreditAmount(0);

    // Fetch History
    setLoadingHistory(true);
    const { getDeposits } = await import("@/lib/actions/deposit");
    const res = await getDeposits({
      organizationId: currentUser.organizationId,
      search: user.name, // The getDeposits action searches by user name in the current implementation
      limit: 3
    });
    // Double check it's the correct user (search might return others)
    if (res.success) {
      const history = res.data.filter((d: any) => d.userId._id === user._id || d.userId === user._id);
      setUserHistory(history.slice(0, 3));
    }
    setLoadingHistory(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearch("");
    setShowUserDropdown(true);
    setUseCredit(false);
    setCreditAmount(0);
    if (!initialData) setAmount("");
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateResult = () => {
    if (depositType !== "MONTHLY" || !selectedUser) return { requiredAmount: 0, advancedPayment: 0, creditUsed: 0, isInsufficient: false, fineApplied: 0, monthsLate: 0 };

    const reqAmountBase = (orgConfig?.monthlyDepositAmount || 0);
    let fineApplied = 0;
    let monthsLate = 0;

    try {
      const target = parseNepaliMonth(depositMonth);
      const payment = adToBs(paymentDate);

      // Calculate month difference: (Year Diff * 12) + Month Diff
      monthsLate = (payment.year - target.year) * 12 + (payment.month - target.month);

      if (monthsLate > 0) {
        fineApplied = monthsLate * (orgConfig?.lateFee || 0);
      }
    } catch (e) { }

    const reqAmt = reqAmountBase + fineApplied;
    const cashProvided = Number(amount) || 0;

    let creditUsed = 0;
    const available = selectedUser.advanceBalance || 0;

    if (useCredit) {
      const totalPotential = cashProvided + available;

      if (totalPotential >= reqAmt) {
        // We have enough to cover the month.
        // Priority: Use cash first, then cover the rest with credit up to reqAmt.
        creditUsed = Math.min(available, Math.max(0, reqAmt - cashProvided));
      } else {
        // Requirement 3: Insufficient total.
        // "add the old credit + deposit amount as credit"
        // In this case, we don't 'use' any credit for this month's deposit.
        // The cashProvided will simply be added to the credit pool.
        creditUsed = 0;
      }
    }

    const totalProvided = cashProvided + creditUsed;
    const isInsufficient = totalProvided < reqAmt;

    let advPay = 0;
    if (isInsufficient) {
      advPay = cashProvided;
    } else {
      advPay = totalProvided - reqAmt;
    }

    return { requiredAmount: reqAmt, advancedPayment: advPay, creditUsed, isInsufficient, fineApplied, monthsLate };
  };

  const { requiredAmount, advancedPayment, creditUsed: actualCreditUsed, isInsufficient, fineApplied, monthsLate } = calculateResult();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Please select a member first");
      return;
    }

    setLoading(true);
    setError("");

    const data = {
      userId: selectedUser._id,
      organizationId: currentUser.organizationId,
      amount: Number(amount),
      month: depositMonth,
      depositType,
      depositDate: paymentDate,
      proof: proof || "https://placehold.co/400x400/1e293b/white?text=Admin+Registry",
      creditUsed: actualCreditUsed,
      status: "APPROVED",
      remarks
    };

    let res;
    if (initialData?._id) {
      res = await updateDeposit(initialData._id, data);
    } else {
      res = await createDeposit(data);
    }

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } else {
      setError(res.error || "Failed to register deposit");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] p-10 text-center shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Registry Updated</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">The transaction has been successfully {initialData ? 'updated' : 'logged'} on behalf of {selectedUser?.name}.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <div className="min-h-screen py-10 flex items-center justify-center w-full">
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          className="w-full max-w-7xl bg-slate-950 border border-white/10 rounded-[48px] shadow-[0_0_150px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto flex flex-col"
        >
          {/* Background Ambient Effects */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          {/* Main Layout Grid */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0 relative z-10">
            {/* Left Sidebar: Member Search & Selector */}
            <div className="w-full lg:w-80 bg-slate-950/40 backdrop-blur-sm border-r border-white/5 p-8 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-1 px-1">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <h3 className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Member Directory</h3>
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Find member..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowUserDropdown(true);
                      if (selectedUser && e.target.value !== selectedUser.name) setSelectedUser(null);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-11 pr-11 py-2 text-[11px] text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSelectedUser(null);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-xl transition-all text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 px-1 mt-4">
                <div className="w-1 h-2 bg-blue-500 rounded-full" />
                <h3 className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Member List</h3>
              </div>

              <div className="space-y-2 h-[120px] overflow-y-auto custom-scrollbar pr-1">
                {loadingUsers ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => handleUserSelect(u)}
                      className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group text-left ${selectedUser?._id === u._id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-white/5 hover:bg-slate-900 hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center overflow-hidden relative shrink-0">
                          {u.profileImage ? (
                            <Image src={u.profileImage} alt={u.name} fill sizes="32px" className="object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-slate-700">{u.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black truncate transition-colors ${selectedUser?._id === u._id ? 'text-emerald-400' : 'text-slate-300'}`}>{u.name}</p>
                          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest truncate">A/C: {u.accountNumber || "N/A"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[9px] font-black ${selectedUser?._id === u._id ? 'text-emerald-500' : 'text-slate-400'}`}>Rs. {u.advanceBalance || 0}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  search && (
                    <div className="text-center py-4 opacity-30">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">No matches</p>
                    </div>
                  )
                )}
              </div>

              {/* Selected Member Insights (Details & History) */}
              <AnimatePresence>
                {selectedUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-6 pt-4 border-t border-white/5"
                  >
                    {/* Profile Mini Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3 h-3 text-emerald-500" />
                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">Member Profile</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase">A/C Number</span>
                          <span className="text-[9px] font-black text-white">{selectedUser.accountNumber || "N/A"}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Mobile</span>
                          <span className="text-[9px] font-black text-white">{selectedUser.phoneNumber || "Not Set"}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Credit Pool</span>
                          <span className="text-[9px] font-black text-emerald-500">Rs. {selectedUser.advanceBalance?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction History */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">Recent Activity</h4>
                      </div>

                      <div className="space-y-2">
                        {loadingHistory ? (
                          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-blue-500/50" /></div>
                        ) : userHistory.length > 0 ? (
                          userHistory.map((h, i) => (
                            <div key={i} className="bg-slate-900/50 border border-white/5 rounded-xl p-2.5 flex items-center justify-between group hover:bg-slate-900 transition-colors">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-white uppercase truncate">{h.month}</p>
                                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tight">{h.depositType}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-emerald-400">Rs. {h.amount}</p>
                                <p className={`text-[7px] font-black uppercase tracking-tighter ${h.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}`}>{h.status}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[8px] text-slate-600 font-bold uppercase text-center py-2">No history found</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center Panel: Form Fields */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950/20 relative border-r border-white/5">
              <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02] border-b border-white/5 sticky top-0 z-[60]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-[14px] font-black text-white uppercase tracking-widest">{initialData ? 'Update Registry' : 'New Registry'}</h2>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all active:scale-90">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-tight">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Deposit Month</label>
                    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-1 shadow-inner relative">
                      <button type="button" onClick={() => {
                        const [mName, yStr] = depositMonth.split(" ");
                        let mIdx = NEPALI_MONTHS.indexOf(mName);
                        let year = parseInt(yStr);
                        if (mIdx === 0) { mIdx = 11; year--; } else { mIdx--; }
                        const nextMonth = `${NEPALI_MONTHS[mIdx]} ${year}`;
                        if (!isMonthBeforeBaseline(nextMonth)) {
                          setDepositMonth(nextMonth);
                        }
                      }}
                        disabled={isMonthBeforeBaseline(depositMonth)}
                        className={`w-8 h-8 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center relative">
                        <button type="button" onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }} className="text-[10px] font-black text-white tracking-tight uppercase flex items-center justify-center gap-1 group/mth hover:text-emerald-400 transition-colors w-full py-1">
                          <span>{depositMonth.split(" ")[0]}</span>
                          <ChevronDown className={`w-3 h-3 text-slate-600 group-hover/mth:text-emerald-400 transition-all ${showMonthDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showMonthDropdown && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl z-[100] p-1 grid grid-cols-2 gap-1 backdrop-blur-xl shadow-2xl">
                              {NEPALI_MONTHS.map(m => {
                                const isDisabled = isMonthBeforeBaseline(`${m} ${depositMonth.split(" ")[1]}`);
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => { setDepositMonth(`${m} ${depositMonth.split(" ")[1]}`); setShowMonthDropdown(false); }}
                                    className={`text-[9px] font-black rounded p-1.5 uppercase transition-all text-center ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
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
                        <button type="button" onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }} className="text-[10px] font-black text-white tracking-tight uppercase flex items-center justify-center gap-1 group/year hover:text-emerald-400 transition-colors w-full py-1">
                          <span>{depositMonth.split(" ")[1]}</span>
                          <ChevronDown className={`w-3 h-3 text-slate-600 group-hover/year:text-emerald-400 transition-all ${showYearDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showYearDropdown && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl z-[100] p-1 flex flex-col gap-1 backdrop-blur-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar">
                              {[2080, 2081, 2082, 2083, 2084, 2085].map(y => {
                                const isDisabled = isMonthBeforeBaseline(`${depositMonth.split(" ")[0]} ${y}`);
                                return (
                                  <button
                                    key={y}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => { setDepositMonth(`${depositMonth.split(" ")[0]} ${y}`); setShowYearDropdown(false); }}
                                    className={`text-[9px] font-black rounded p-1.5 uppercase transition-all ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
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
                        const [mName, yStr] = depositMonth.split(" ");
                        let mIdx = NEPALI_MONTHS.indexOf(mName);
                        let year = parseInt(yStr);
                        if (mIdx === 11) { mIdx = 0; year++; } else { mIdx++; }
                        setDepositMonth(`${NEPALI_MONTHS[mIdx]} ${year}`);
                      }}
                        className="w-8 h-8 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center hover:bg-slate-900 transition-all text-slate-500 hover:text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Deposit Type</label>
                    <div className="relative group/sel">
                      <select
                        value={depositType}
                        onChange={(e) => setDepositType(e.target.value as any)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl pl-4 pr-10 py-2.5 text-[10px] text-white font-black uppercase tracking-widest outline-none appearance-none transition-all focus:border-blue-500/50"
                      >
                        <option value="MONTHLY">Monthly Savings</option>
                        <option value="SERVICE_CHARGE">Service Charge</option>
                        <option value="LOAN_INTEREST">Loan Interest</option>
                        <option value="NAV">NAV Asset Collection</option>
                        <option value="MISCELLANEOUS">Miscellaneous Income</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Deposit Amount</label>
                  <div className="relative group/amt">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-600 group-focus-within/amt:text-emerald-500 transition-colors">Rs.</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full bg-slate-950 border ${isInsufficient ? 'border-amber-500/40 focus:border-amber-500' : 'border-white/5 focus:border-emerald-500/50'} rounded-2xl pl-12 pr-6 py-4 text-xl font-black text-white outline-none transition-all shadow-inner`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Payment Date</label>
                    <NepaliDatePicker value={paymentDate} onChange={setPaymentDate} side="bottom" compact />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Evidence Proof</label>
                    <div className="relative h-[46px] group/proof cursor-pointer">
                      <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                      <div className={`absolute inset-0 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-all ${proof ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/5 bg-white/[0.01] hover:border-blue-500/30"}`}>
                        {proof ? (
                          <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[9px] text-emerald-400 font-black uppercase">Attached</span></>
                        ) : (
                          <><Camera className="w-3.5 h-3.5 text-slate-700 group-hover:text-blue-400 transition-colors" /><span className="text-[9px] text-slate-600 font-black uppercase">Upload Proof</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Administrative Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Transaction notes..."
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-[11px] text-white outline-none transition-all focus:border-blue-500/50 min-h-[100px] resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Right Sidebar: Audit Confirmation */}
            <div className="w-full lg:w-64 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col gap-6 shrink-0 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-tight">Audit Check</h3>
                  <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Transaction Preview</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-950 border border-white/5 p-3 rounded-xl">
                  <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Target Result</p>
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm font-black uppercase tracking-tight ${isInsufficient ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {isInsufficient ? 'To Advance' : 'Valid Entry'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-white/5 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Payment Date:</span>
                    <span className="text-white">{new Date(paymentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Audit Status:</span>
                    <span className={monthsLate > 0 ? "text-rose-500" : "text-emerald-500"}>
                      {monthsLate > 0 ? `${monthsLate} MONTHS LATE` : "ON TIME"}
                    </span>
                  </div>
                  <div className="w-full h-px bg-white/5 my-1" />
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Late Fee:</span>
                    <span className={fineApplied > 0 ? "text-rose-500" : "text-emerald-500"}>Rs. {fineApplied}</span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Credit Used:</span>
                    <span className={actualCreditUsed > 0 ? "text-blue-400" : "text-slate-500"}>Rs. {actualCreditUsed}</span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Surplus:</span>
                    <span className={advancedPayment > 0 ? "text-emerald-400" : "text-slate-500"}>Rs. {advancedPayment}</span>
                  </div>
                </div>

                {selectedUser?.advanceBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !useCredit;
                      setUseCredit(next);
                      if (next) {
                        const available = selectedUser.advanceBalance || 0;
                        const req = (orgConfig?.monthlyDepositAmount || 0) + fineApplied;
                        if (available >= req) {
                          setAmount("0");
                        } else if (available > 0) {
                          setAmount((req - available).toString());
                        }
                      }
                    }}
                    className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between group ${useCredit ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className={`w-3.5 h-3.5 ${useCredit ? 'text-emerald-500' : 'text-slate-600'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${useCredit ? 'text-emerald-400' : 'text-slate-500'}`}>Use Credit Pool</span>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${useCredit ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800'}`}>
                      {useCredit && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                )}

                {isInsufficient && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[7px] text-amber-200/60 font-bold leading-tight uppercase tracking-tight">
                      Below threshold. Funds will pool into advance balance.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedUser}
                  className={`w-full relative group py-4 text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 overflow-hidden ${isInsufficient ? 'bg-amber-600' : 'bg-blue-600'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-[10px]">{isInsufficient ? 'Pool Funds' : (initialData ? 'Update' : 'Commit')}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-[6px] text-slate-600 text-center uppercase font-black tracking-[0.1em] px-4 leading-relaxed">
                  Confirmation updates member ledger and audit trail immediately.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
