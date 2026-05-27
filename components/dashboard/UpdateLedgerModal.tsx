"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Save,
  Calendar,
  ChevronDown,
  AlertCircle,
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { updateBankLedger, getBankLedger, getOrganizationBaseline } from "@/lib/actions/bank-ledger";
import { NEPALI_MONTHS, getCurrentNepaliDate } from "@/lib/utils/nepali-date";
import { useSession } from "next-auth/react";

interface UpdateLedgerModalProps {
  ledger: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UpdateLedgerModal({ ledger: initialLedger, onClose, onUpdate }: UpdateLedgerModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [currentLedger, setCurrentLedger] = useState(initialLedger);
  
  const [targetMonth, setTargetMonth] = useState(initialLedger.month.split(" ")[0]);
  const [targetYear, setTargetYear] = useState(parseInt(initialLedger.month.split(" ")[1]));
  const [baseline, setBaseline] = useState<any>(null);
  const current = getCurrentNepaliDate();
  const isBaseline = !!(baseline && baseline.baselineMonth === targetMonth && baseline.baselineYear === targetYear);

  const [formData, setFormData] = useState({
    bankInterest: initialLedger.bankInterest || 0,
    bankCharges: initialLedger.manualBankCharges !== undefined ? initialLedger.manualBankCharges : (initialLedger.bankCharges || 0),
    totalExpenditure: initialLedger.totalExpenditure || 0,
    remarks: initialLedger.remarks || ""
  });

  useEffect(() => {
    if ((session?.user as any)?.organizationId) {
      getOrganizationBaseline((session?.user as any).organizationId as string).then(res => {
        if (res.success && res.baselineYear) {
          setBaseline(res);
        }
      });
    }
  }, [session]);

  // Fetch ledger data when month/year changes
  useEffect(() => {
    const fetchSelectedLedger = async () => {
      if (!(session?.user as any)?.organizationId) return;
      const monthStr = `${targetMonth} ${targetYear}`;
      if (monthStr === initialLedger.month) {
        setFormData({
          bankInterest: initialLedger.bankInterest || 0,
          bankCharges: initialLedger.manualBankCharges !== undefined ? initialLedger.manualBankCharges : (initialLedger.bankCharges || 0),
          totalExpenditure: initialLedger.totalExpenditure || 0,
          remarks: initialLedger.remarks || ""
        });
        setCurrentLedger(initialLedger);
        return;
      }

      setFetching(true);
      const res = await getBankLedger((session?.user as any).organizationId as string, monthStr);
      if (res.success) {
        setCurrentLedger(res.data);
        setFormData({
          bankInterest: res.data.bankInterest || 0,
          bankCharges: res.data.manualBankCharges !== undefined ? res.data.manualBankCharges : (res.data.bankCharges || 0),
          totalExpenditure: res.data.totalExpenditure || 0,
          remarks: res.data.remarks || ""
        });
      }
      setFetching(false);
    };

    fetchSelectedLedger();
  }, [targetMonth, targetYear, session, initialLedger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLedger?._id) return;
    setLoading(true);
    const res = await updateBankLedger(currentLedger._id, formData);
    if (res.success) {
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Adjust Monthly Ledger</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Manual Transaction Entries</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Month & Year Selection */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-blue-400" /> Select Period
                </span>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select 
                    value={targetYear} 
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="appearance-none w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-blue-400 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    {Array.from({ length: 10 }, (_, i) => current.year - 5 + i)
                      .filter(y => !baseline || y >= baseline.baselineYear)
                      .map(y => (
                        <option key={y} value={y} className="bg-slate-900 text-slate-300">{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-blue-500 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select 
                    value={targetMonth} 
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="appearance-none w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-emerald-400 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                  >
                    {NEPALI_MONTHS.filter(m => {
                      if (!baseline) return true;
                      if (targetYear > baseline.baselineYear) return true;
                      if (targetYear === baseline.baselineYear) {
                        return NEPALI_MONTHS.indexOf(m) >= NEPALI_MONTHS.indexOf(baseline.baselineMonth);
                      }
                      return false;
                    }).map((m) => (
                      <option key={m} value={m} className="text-slate-300 bg-slate-900">{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-emerald-500 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className={`space-y-8 transition-all duration-300 ${fetching ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            {isBaseline && (
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex gap-4 items-start animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Baseline Month Settings Locked</p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-1 leading-relaxed">
                    Notice: This month is the configured baseline month. Bank Charges and Expenditures are locked here and synchronized from the External Funds configuration.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Interest */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Monthly Credit</span>
                  </div>
                  <div className="relative group">
                     <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                     <input 
                       type="number" 
                       step="0.01"
                       placeholder="Bank Interest"
                       value={formData.bankInterest}
                       onChange={(e) => setFormData({ ...formData, bankInterest: Number(e.target.value) })}
                       className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all font-mono"
                     />
                  </div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Bank Interest Accrued</label>
               </div>

               {/* Charges */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                     <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Monthly Debit</span>
                  </div>
                  <div className="relative group">
                     <TrendingDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Bank Charges"
                        disabled={isBaseline}
                        value={formData.bankCharges}
                        onChange={(e) => setFormData({ ...formData, bankCharges: Number(e.target.value) })}
                        className={`w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none focus:border-rose-500/50 transition-all font-mono ${isBaseline ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                   </div>
                   <div className="flex flex-col gap-1 mt-1 pl-1">
                     <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Fees & Transaction Charges (Manual)</label>
                     {isBaseline ? (
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-relaxed flex items-center gap-1.5 mt-1">
                         <Lock className="w-2.5 h-2.5" /> Synchronized from External Funds Config
                       </span>
                     ) : (
                       currentLedger && (currentLedger.bankCharges - (currentLedger.manualBankCharges || 0)) > 0 && (
                         <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-relaxed">
                           Total Bank Charges: Rs. {currentLedger.bankCharges.toLocaleString()} (incl. Rs. {(currentLedger.bankCharges - (currentLedger.manualBankCharges || 0)).toLocaleString()} from Loan disbursements)
                         </span>
                       )
                     )}
                   </div>
               </div>
            </div>

            {/* Expenditure */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Miscellaneous Outflow</span>
               </div>
               <div className="relative group">
                  <Save className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                   <input 
                     type="number" 
                     step="0.01"
                     placeholder="Total Expenditure"
                     disabled={isBaseline}
                     value={formData.totalExpenditure}
                     onChange={(e) => setFormData({ ...formData, totalExpenditure: Number(e.target.value) })}
                     className={`w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none focus:border-rose-500/50 transition-all font-mono ${isBaseline ? 'opacity-50 cursor-not-allowed' : ''}`}
                   />
                </div>
                <div className="flex flex-col gap-1 mt-1 pl-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Combined Monthly Expenses</label>
                  {isBaseline && (
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-relaxed flex items-center gap-1.5 mt-1">
                      <Lock className="w-2.5 h-2.5" /> Synchronized from External Funds Config
                    </span>
                  )}
                </div>
            </div>

            {/* Remarks */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Remarks</span>
               </div>
               <div className="relative group">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <textarea 
                    placeholder="Reason for adjustments or expense breakdown..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-xs outline-none focus:border-emerald-500/50 transition-all min-h-[100px] resize-none"
                  />
               </div>
            </div>
          </div>

          <div className="pt-4 relative">
            {fetching && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl z-10">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading || fetching || !currentLedger}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save {targetMonth} Reconciliation
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
