"use client";

import { useState } from "react";
import {
  X,
  Wallet,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Building2,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Search,
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { createAggregation, updateAggregation } from "@/lib/actions/aggregation";
import { getUsersByOrg } from "@/lib/actions/user";
import NepaliDatePicker from "./NepaliDatePicker";
import { getCurrentNepaliDate, NEPALI_MONTHS, parseNepaliMonth, adToBs } from "@/lib/utils/nepali-date";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

interface RevenueAggregationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  orgId: string;
  orgConfig: any;
  initialData?: any;
}

export default function RevenueAggregationForm({ onClose, onSuccess, orgId, orgConfig, initialData }: RevenueAggregationFormProps) {
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // Form State
  const current = getCurrentNepaliDate();
  const [depositMonth, setDepositMonth] = useState(`${NEPALI_MONTHS[current.month - 1]} ${current.year}`);
  const [depositType, setDepositType] = useState<"NAV" | "MISCELLANEOUS" | "ADVANCE">("NAV");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString());
  const [remarks, setRemarks] = useState("");
  
  // Member Selection State
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(false);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Fetch Users for Member Selection
  useEffect(() => {
    async function fetchUsers() {
      setIsUserLoading(true);
      const res = await getUsersByOrg(orgId);
      if (res.success) setUsers(res.data);
      setIsUserLoading(false);
    }
    fetchUsers();
  }, [orgId]);

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      setDepositMonth(initialData.month);
      setDepositType(initialData.type || initialData.depositType);
      setAmount(initialData.amount.toString());
      setPaymentDate(initialData.date || initialData.depositDate);
      setRemarks(initialData.remarks?.replace('[AGGREGATION] ', '')?.replace('[AGGREGATION CREDIT] ', '') || "");
      if (initialData.memberId) {
        setSelectedMemberId(initialData.memberId);
      }
    }
  }, [initialData]);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMonthBeforeBaseline = (monthStr: string) => {
    if (!orgConfig?.financials?.initialOpeningMonth || !orgConfig?.financials?.initialOpeningYear) return false;
    const target = parseNepaliMonth(monthStr);
    const startM = NEPALI_MONTHS.indexOf(orgConfig.financials.initialOpeningMonth) + 1;
    const startY = orgConfig.financials.initialOpeningYear;
    if (target.year < startY) return true;
    if (target.year === startY && target.month < startM) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!remarks) {
      setError("Audit remarks are mandatory for institutional transparency");
      return;
    }

    if (depositType === "ADVANCE" && !selectedMemberId) {
      setError("Please select a target member for the advanced payment");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        organizationId: orgId,
        amount: parseFloat(amount),
        month: depositMonth,
        type: depositType,
        date: paymentDate,
        remarks: remarks,
        memberId: depositType === "ADVANCE" ? selectedMemberId : undefined,
      } as any;

      const res = initialData 
        ? await updateAggregation(initialData._id, payload)
        : await createAggregation(payload);

      if (res.success) {
        toast.success(`${depositType} recorded successfully`, {
          icon: '💎',
          style: {
            borderRadius: '16px',
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }
        });
        onSuccess();
      } else {
        setError(res.error || "Failed to record aggregation");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] backdrop-blur-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-8 py-5 border-b border-white/5">
           <div className="flex items-center gap-4">
             <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-blue-500/20 transform rotate-1">
               <TrendingUp className="w-5 h-5 text-white" />
             </div>
             <div>
               <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1 flex items-center gap-2">
                 Aggregation
                 <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
               </h2>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                 <ShieldCheck className="w-2.5 h-2.5" />
                 Institutional Audit
               </p>
             </div>
           </div>
           <button 
             onClick={onClose} 
             className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all active:scale-90"
           >
             <X className="w-5 h-5 text-slate-500 hover:text-rose-500" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 relative z-10">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -5 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-tight"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Category</label>
                <div className="relative group/sel">
                  <select 
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value as any)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest appearance-none outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="NAV">NAV Asset</option>
                    <option value="MISCELLANEOUS">Misc Revenue</option>
                    <option value="ADVANCE">Advanced Payment (Credit)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>
              </div>

              <AnimatePresence>
                {depositType === "ADVANCE" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="col-span-full space-y-2 overflow-hidden"
                  >
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center justify-between">
                      Select Member 
                      {selectedMemberId && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Selected</span>}
                    </label>
                    <div className="space-y-3">
                       <div className="relative group/search">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2">
                           <Search className="w-3.5 h-3.5 text-slate-600 group-focus-within/search:text-blue-500 transition-colors" />
                         </div>
                         <input 
                           type="text"
                           placeholder="Search by name or account number..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full bg-slate-950/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-[10px] font-medium text-white placeholder:text-slate-700 outline-none focus:border-blue-500/30 transition-all shadow-inner"
                         />
                       </div>

                       <div className="bg-slate-950/50 border border-white/5 rounded-2xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 grid grid-cols-1 gap-1">
                         {isUserLoading ? (
                           <div className="flex items-center justify-center py-8 gap-2 text-[9px] text-slate-600 font-black uppercase">
                             <Loader2 className="w-3 h-3 animate-spin" /> Fetching Members...
                           </div>
                         ) : users.filter(u => 
                             u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.accountNumber?.includes(searchTerm)
                           ).length > 0 ? (
                             users.filter(u => 
                               u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               u.accountNumber?.includes(searchTerm)
                             ).map(user => (
                               <button
                                 key={user._id}
                                 type="button"
                                 onClick={() => setSelectedMemberId(user._id)}
                                 className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                                   selectedMemberId === user._id 
                                     ? "bg-blue-500/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5" 
                                     : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                 }`}
                               >
                                 <div className="flex items-center gap-3">
                                   <div className={`w-9 h-9 rounded-xl flex items-center justify-center border overflow-hidden transition-all ${
                                     selectedMemberId === user._id ? "bg-blue-500/20 border-blue-500/30 ring-2 ring-blue-500/20" : "bg-slate-900 border-white/5"
                                   }`}>
                                     {user.profileImage ? (
                                       <Image 
                                         src={user.profileImage} 
                                         alt={user.name}
                                         width={36}
                                         height={36}
                                         className="w-full h-full object-cover"
                                       />
                                     ) : (
                                       <UserIcon className={`w-4 h-4 ${selectedMemberId === user._id ? "text-blue-400" : "text-slate-600"}`} />
                                     )}
                                   </div>
                                   <div className="text-left">
                                     <p className="text-[10px] font-black uppercase tracking-tight">{user.name}</p>
                                     <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{user.accountNumber || "No Acc #"}</p>
                                   </div>
                                 </div>
                                 {selectedMemberId === user._id && (
                                   <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                     <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                   </div>
                                 )}
                               </button>
                             ))
                           ) : (
                             <div className="py-8 text-center">
                               <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No members found</p>
                             </div>
                           )
                         }
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Period</label>
                <div className="flex items-center gap-1.5 bg-slate-950/50 border border-white/5 rounded-xl p-1 relative">
                  <button type="button" onClick={() => {
                    const [mName, yStr] = depositMonth.split(" ");
                    let mIdx = NEPALI_MONTHS.indexOf(mName);
                    let year = parseInt(yStr);
                    if (mIdx === 0) { mIdx = 11; year--; } else { mIdx--; }
                    const nextMonth = `${NEPALI_MONTHS[mIdx]} ${year}`;
                    if (!isMonthBeforeBaseline(nextMonth)) setDepositMonth(nextMonth);
                  }}
                    disabled={isMonthBeforeBaseline(depositMonth)}
                    className="w-8 h-8 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1 flex gap-1 items-center justify-center">
                    <button type="button" onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }} className="text-[9px] font-black text-white tracking-widest uppercase hover:text-blue-400 transition-colors">
                      {depositMonth.split(" ")[0].substring(0, 3)}
                    </button>
                    <span className="text-[8px] text-white/20">/</span>
                    <button type="button" onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }} className="text-[9px] font-black text-white tracking-widest uppercase hover:text-blue-400 transition-colors">
                      {depositMonth.split(" ")[1]}
                    </button>

                    <AnimatePresence>
                      {showMonthDropdown && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-2xl z-[100] p-1.5 grid grid-cols-3 gap-1 backdrop-blur-2xl shadow-2xl">
                          {NEPALI_MONTHS.map(m => {
                            const isDisabled = isMonthBeforeBaseline(`${m} ${depositMonth.split(" ")[1]}`);
                            return (
                              <button
                                key={m}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => { setDepositMonth(`${m} ${depositMonth.split(" ")[1]}`); setShowMonthDropdown(false); }}
                                className={`text-[8px] font-black rounded-lg py-2 uppercase transition-all text-center ${isDisabled ? 'text-slate-700' : 'text-slate-400 hover:bg-blue-500/10 hover:text-blue-400'}`}
                              >
                                {m.substring(0, 3)}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {showYearDropdown && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-white/10 rounded-2xl z-[100] p-1.5 flex flex-col gap-0.5 backdrop-blur-2xl shadow-2xl max-h-32 overflow-y-auto custom-scrollbar">
                          {[2080, 2081, 2082, 2083, 2084, 2085].map(y => {
                            const isDisabled = isMonthBeforeBaseline(`${depositMonth.split(" ")[0]} ${y}`);
                            return (
                              <button
                                key={y}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => { setDepositMonth(`${depositMonth.split(" ")[0]} ${y}`); setShowYearDropdown(false); }}
                                className={`text-[8px] font-black rounded-lg py-2 uppercase transition-all text-center ${isDisabled ? 'text-slate-700' : 'text-slate-400 hover:bg-blue-500/10 hover:text-blue-400'}`}
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
                    className="w-8 h-8 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
             </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Aggregated Position</label>
              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Manual Audit</span>
            </div>
            <div className="relative group/amt">
               <div className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-600 group-focus-within/amt:text-blue-500 transition-colors">Rs.</div>
               <input 
                 type="number"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 placeholder="0.00"
                 className="w-full bg-slate-950/80 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-2xl font-black text-white outline-none focus:border-blue-500/30 transition-all shadow-inner placeholder:text-slate-800"
               />
            </div>
          </div>

          {/* Date & Remarks Row-by-Row for better spacing */}
          <div className="space-y-4">
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Audit Transmission Date</label>
               <div className="bg-slate-950/50 rounded-xl p-0.5 border border-white/5">
                 <NepaliDatePicker value={paymentDate} onChange={setPaymentDate} compact />
               </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Source / Audit Remarks</label>
              <div className="relative group/rem">
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="E.g. Bank Interest, NAV Adjust, or specific transaction details..."
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-300 outline-none focus:border-blue-500/50 h-24 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group/btn pt-2"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover/btn:opacity-30 transition-all" />
            <div className="relative w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 uppercase tracking-[0.25em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Processing...' : initialData ? 'Update Record' : 'Commit to Ledger'}
            </div>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
