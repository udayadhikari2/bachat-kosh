"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  X,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarIcon,
  UploadCloud,
  ArrowRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adToBs, getCurrentNepaliDate, parseNepaliMonth, getDaysInMonth, bsToAd } from "@/lib/utils/nepali-date";
import NepaliDatePicker from "./NepaliDatePicker";
import { createDeposit } from "@/lib/actions/deposit";
import { getUserBalance } from "@/lib/actions/user";
import { getOrganization } from "@/lib/actions/organization";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface SubmitDepositFormProps {
  onClose: () => void;
  currentMonth?: string;
  defaultAmount?: number;
}

export default function SubmitDepositForm({
  onClose,
  currentMonth = "",
  defaultAmount = 1000
}: SubmitDepositFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString());
  const [bsMonth, setBsMonth] = useState("");
  const [englishMonth, setEnglishMonth] = useState("");
  const [depositType, setDepositType] = useState<"MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST">("MONTHLY");
  const [advancedPayment, setAdvancedPayment] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [creditUsed, setCreditUsed] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [orgConfig, setOrgConfig] = useState<any>(null);
  const [inputAmount, setInputAmount] = useState<number>(defaultAmount || 0);
  const [fineApplied, setFineApplied] = useState(0);
  const [remarks, setRemarks] = useState("");

  const { data: session } = useSession();

  useEffect(() => {
    const bs = getCurrentNepaliDate();
    setBsMonth(`${bs.monthName} ${bs.year}`);

    if (session?.user) {
      const user = session.user as any;
      Promise.all([
        getUserBalance(user.id),
        getOrganization(user.organizationId)
      ]).then(([balanceRes, orgRes]) => {
        if (balanceRes.success) setUserBalance(balanceRes.balance || 0);
        if (orgRes.success) {
          setOrgConfig(orgRes.data.config);
          setInputAmount(orgRes.data.config?.monthlyDepositAmount || defaultAmount || 0);
        }
      });
    }
  }, [session, defaultAmount]);

  const requiredBase = depositType === "MONTHLY" ? (orgConfig?.monthlyDepositAmount || defaultAmount || 0) : 0;

  useEffect(() => {
    if (depositType !== "MONTHLY" || !orgConfig) {
      setFineApplied(0);
      setAdvancedPayment(0);
      return;
    }

    try {
      const target = parseNepaliMonth(bsMonth);
      const daysInMonth = getDaysInMonth(target.year, target.month);
      const lastDayAd = bsToAd(target.year, target.month, daysInMonth);
      lastDayAd.setHours(23, 59, 59, 999);

      const isLate = new Date(paymentDate) > lastDayAd;
      const fine = isLate ? orgConfig.lateFee : 0;
      setFineApplied(fine);

      const totalRequired = requiredBase + fine;
      const totalProvided = (inputAmount || 0) + (useCredit ? creditUsed : 0);
      
      if (totalProvided < totalRequired) {
        setAdvancedPayment(inputAmount || 0); // Only new cash is added to pool if insufficient
      } else {
        setAdvancedPayment(totalProvided - totalRequired);
      }
    } catch (e) {
      console.error("Calculation error:", e);
    }
  }, [paymentDate, bsMonth, inputAmount, creditUsed, useCredit, depositType, orgConfig, requiredBase]);

  const totalRequired = requiredBase + fineApplied;
  const isInsufficient = depositType === "MONTHLY" && ((inputAmount || 0) + (useCredit ? creditUsed : 0)) < totalRequired;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = session?.user as any;
    if (!user) {
      setError("User session expired");
      setLoading(false);
      return;
    }

    if (useCredit && creditUsed > userBalance) {
      setError("Not enough advance balance");
      setLoading(false);
      return;
    }

    const result = await createDeposit({
      userId: user.id,
      organizationId: user.organizationId,
      amount: inputAmount || 0,
      advancedPayment: advancedPayment > 0 ? advancedPayment : 0,
      creditUsed: useCredit ? creditUsed : 0,
      month: bsMonth,
      depositType,
      depositDate: paymentDate,
      remarks,
      proof: (useCredit && creditUsed >= totalRequired)
        ? "CREDIT_PAYMENT"
        : "https://placehold.co/600x400/000000/FFFFFF/png?text=Transaction+Proof"
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(onClose, 2000);
    } else {
      setError(result.error || "Failed to submit deposit");
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
            className="w-20 h-20 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 relative"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-emerald-500/20 rounded-2xl -z-10"
            />
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Success!</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">Your deposit has been queued for verification.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-xl bg-slate-950 border border-white/10 rounded-[48px] shadow-[0_0_150px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="flex justify-between items-center px-8 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-2xl overflow-hidden relative p-1">
              <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-800">
                {(session?.user as any)?.profileImage || session?.user?.image ? (
                  <Image
                    src={(session?.user as any)?.profileImage || session?.user?.image}
                    alt={session?.user?.name || "User"}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-emerald-500/50" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">New Submission</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Registry Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group active:scale-90">
            <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold uppercase tracking-tight">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1.5">Target Month</p>
              <p className="text-white font-black text-base uppercase tracking-tight">{englishMonth}</p>
              <p className="text-[8px] text-emerald-500/50 font-black uppercase mt-1 tracking-tighter">{bsMonth}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1.5">Monthly Goal</p>
              <p className="text-emerald-400 font-black text-base">Rs. {orgConfig?.monthlyDepositAmount || defaultAmount}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {fineApplied > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex items-center gap-5">
                  <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">Late Fine Active</p>
                    <p className="text-xs text-rose-400/70 font-bold mt-0.5">Rs. {fineApplied} added to required total for overdue submission.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Type</label>
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as any)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-5 py-3 text-emerald-400 font-black tracking-widest uppercase text-[11px] outline-none"
                >
                  <option value="MONTHLY">Monthly Savings</option>
                  <option value="SERVICE_CHARGE">Service Charge</option>
                  <option value="LOAN_INTEREST">Loan Interest</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Payment Date</label>
                <NepaliDatePicker value={paymentDate} onChange={setPaymentDate} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction Amount (NPR)</label>
                  {totalRequired > 0 && (
                    <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-tighter">Min: Rs. {totalRequired}</span>
                  )}
                </div>
                <div className="relative group/input">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-base">Rs.</span>
                  <input
                    type="number"
                    value={inputAmount || ""}
                    onChange={(e) => setInputAmount(Number(e.target.value) || 0)}
                    required
                    className={`w-full bg-white/[0.03] border rounded-2xl pl-12 pr-6 py-3.5 text-lg font-black text-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner tracking-tight ${isInsufficient ? "border-rose-500/50 ring-4 ring-rose-500/5" : "border-white/5 focus:border-emerald-500/40"}`}
                    placeholder="0"
                  />
                </div>
                {isInsufficient && (
                  <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-2 ml-4 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Amount less than Rs. {totalRequired} is rejected.
                  </p>
                )}
              </div>

              <AnimatePresence>
                {depositType === "MONTHLY" && advancedPayment > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-[32px] flex items-center gap-5 relative overflow-hidden group">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">{isInsufficient ? "Advance Funding" : "Surplus Detected"}</p>
                      <p className="text-xs text-blue-400/60 font-bold mt-0.5">Rs. {advancedPayment.toLocaleString()} {isInsufficient ? "will be added to your credit pool." : "added to global credit pool."}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {userBalance > 0 && depositType === "MONTHLY" && (
              <div className={`p-6 rounded-[36px] border transition-all duration-500 shadow-2xl ${useCredit ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5" : "bg-white/[0.02] border-white/5 opacity-80"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${useCredit ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 rotate-12 scale-110" : "bg-white/5 border-white/10 text-slate-600"}`}>
                      <PiggyBank className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-tight ${useCredit ? "text-emerald-400" : "text-slate-400"}`}>Consume Global Credit</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Available Balance: Rs. {userBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { const newState = !useCredit; setUseCredit(newState); if (newState) setCreditUsed(Math.min(userBalance, totalRequired)); }} className={`w-14 h-7 rounded-full relative transition-all duration-500 ring-4 ring-offset-4 ring-offset-slate-950 ${useCredit ? "bg-emerald-500 ring-emerald-500/10" : "bg-slate-800 ring-transparent"}`}>
                    <motion.div animate={{ x: useCredit ? 28 : 4 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-xl" />
                  </button>
                </div>
                {useCredit && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-6 pt-6 border-t border-emerald-500/10 overflow-hidden">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest ml-2">Credit Amount to Apply</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/30 font-black text-sm">Rs.</span>
                        <input type="number" max={userBalance} value={creditUsed} onChange={(e) => setCreditUsed(Math.min(userBalance, Number(e.target.value) || 0))} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-black text-emerald-400 outline-none" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Verification Evidence</label>
              {(useCredit && creditUsed >= totalRequired) ? (
                <div className="w-full p-12 bg-emerald-500/5 border-2 border-dashed border-emerald-500/20 rounded-[40px] flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                  <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Paid via Credit</p>
                </div>
              ) : (
                <div className="w-full py-16 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all">
                  <UploadCloud className="w-8 h-8 text-slate-600 mb-4" />
                  <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Drop or Capture Proof</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Transaction Notes (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Brief description or purpose of this transaction..."
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 outline-none transition-all shadow-inner min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading || isInsufficient} className="w-full group relative py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black uppercase tracking-[0.3em] rounded-[32px] shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{isInsufficient ? "Insufficient Assets" : "Submit Transaction"}</span>}
              {!isInsufficient && !loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
