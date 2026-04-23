"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  X, 
  PiggyBank, 
  Camera, 
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarIcon
} from "lucide-react";
import { adToBs, getCurrentNepaliDate } from "@/lib/utils/nepali-date";
import NepaliDatePicker from "./NepaliDatePicker";
import { createDeposit } from "@/lib/actions/deposit";
import { getUserBalance } from "@/lib/actions/user";
import { useSession } from "next-auth/react";

interface SubmitDepositFormProps {
  onClose: () => void;
  currentMonth: string;
  defaultAmount: number;
}

export default function SubmitDepositForm({ 
  onClose, 
  currentMonth,
  defaultAmount 
}: SubmitDepositFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString());
  const [bsMonth, setBsMonth] = useState("");
  const [depositType, setDepositType] = useState<"MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST">("MONTHLY");
  const [advancedPayment, setAdvancedPayment] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [creditUsed, setCreditUsed] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  
  const { data: session } = useSession();

  useEffect(() => {
    const bs = getCurrentNepaliDate();
    setBsMonth(`${bs.monthName} ${bs.year}`);
    
    // Fetch user balance
    if (session?.user) {
      const user = session.user as any;
      getUserBalance(user.id).then(res => {
        if (res.success) setUserBalance(res.balance || 0);
      });
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(formData.get("amount"));

    const user = session?.user as any;
    if (!user) {
      setError("User session expired");
      setLoading(false);
      return;
    }

    // Validation for credit
    if (useCredit && creditUsed > userBalance) {
      setError("Not enough advance balance");
      setLoading(false);
      return;
    }

    const result = await createDeposit({
      userId: user.id,
      organizationId: user.organizationId,
      amount,
      advancedPayment: advancedPayment > 0 ? advancedPayment : 0,
      creditUsed: useCredit ? creditUsed : 0,
      month: bsMonth,
      depositType,
      depositDate: paymentDate,
      proof: (useCredit && creditUsed >= amount) 
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Submission Received!</h2>
          <p className="text-slate-400">Your deposit record has been submitted for verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center">
            <PiggyBank className="w-5 h-5 mr-2 text-emerald-400" />
            Monthly Savings Entry
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Target Month (BS)</p>
              <p className="text-white font-black text-sm uppercase tracking-tight">{bsMonth}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Savings Goal</p>
              <p className="text-emerald-400 font-black text-sm">Rs. {defaultAmount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Transaction Category</label>
              <select 
                value={depositType}
                onChange={(e) => setDepositType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-emerald-400 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-black tracking-widest uppercase text-xs cursor-pointer shadow-inner"
              >
                <option value="MONTHLY">Monthly Savings</option>
                <option value="SERVICE_CHARGE">Service Charge</option>
                <option value="LOAN_INTEREST">Loan Interest</option>
              </select>
            </div>

            <NepaliDatePicker 

              label="Transaction Date (Nepali)"
              value={paymentDate}
              onChange={setPaymentDate}
            />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Paid Amount (NPR)</label>
              <input
                type="number"
                name="amount"
                defaultValue={defaultAmount}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold"
              />
            </div>

            {/* Advanced Payment — shown when deposit type is MONTHLY */}
            {depositType === "MONTHLY" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest ml-1">
                    Advanced Payment (NPR) <span className="text-slate-600 normal-case font-bold">— if paid above monthly goal</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advancedPayment === 0 ? "" : advancedPayment}
                    placeholder="0"
                    onChange={(e) => setAdvancedPayment(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-blue-900/60 rounded-xl px-4 py-3 text-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all font-bold placeholder-slate-800 shadow-inner"
                  />
                </div>

                {/* Credit Consumption Section */}
                {userBalance > 0 && (
                  <div className={`p-5 rounded-2xl border transition-all duration-300 ${useCredit ? "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5" : "bg-slate-950/50 border-slate-800"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl border transition-all ${useCredit ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 scale-110" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Use Global Credit</p>
                            <p className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-tight">Available: Rs. {userBalance.toLocaleString()}</p>
                         </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCredit(!useCredit);
                          if (!useCredit) setCreditUsed(defaultAmount);
                        }}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${useCredit ? "bg-emerald-600" : "bg-slate-800"}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${useCredit ? "left-7" : "left-1"}`} />
                      </button>
                    </div>

                    {useCredit && (
                      <div className="mt-4 pt-4 border-t border-emerald-500/10 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1.5 block">Credit Amount to Apply</label>
                        <input
                          type="number"
                          max={userBalance}
                          value={creditUsed}
                          onChange={(e) => setCreditUsed(Math.min(userBalance, Number(e.target.value) || 0))}
                          className="w-full bg-slate-950 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Verification Evidence 
                {useCredit && creditUsed >= (Number(new FormData().get("amount")) || defaultAmount) && (
                  <span className="text-emerald-500/70 ml-2">(Optional - Paid via Credit)</span>
                )}
              </label>
              {(useCredit && creditUsed >= (defaultAmount)) ? (
                <div className="w-full p-6 bg-slate-950 border-2 border-emerald-500/10 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest">Full Credit Adjustment</p>
                  <p className="text-[10px] text-slate-600 font-bold mt-1 max-w-[200px]">This deposit will be paid entirely from your advance balance. No proof needed.</p>
                </div>
              ) : (
                <div className="relative group">
                  <div className="w-full aspect-video bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center group-hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <Camera className="w-8 h-8 text-slate-800 mb-2 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-slate-400">Capture Proof</p>
                    <p className="text-xs text-slate-600 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" required={!useCredit} />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start">
            <AlertCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
            <p className="text-xs text-emerald-400 leading-relaxed">
              Ensure the screenshot clearly shows the transaction ID and amount sent to the Laxmi Bank account.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit record"}
          </button>
        </form>
      </div>
    </div>
  );
}
