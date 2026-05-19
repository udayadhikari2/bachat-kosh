"use client";

import { useState, useEffect } from "react";
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  RefreshCcw, 
  Loader2, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Wallet,
  Receipt,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBankLedger, reconcileMonthlyTotals, getOrganizationBaseline } from "@/lib/actions/bank-ledger";
import { NEPALI_MONTHS, getCurrentNepaliDate, getNepaliYearRange } from "@/lib/utils/nepali-date";
import { useSession } from "next-auth/react";
import UpdateLedgerModal from "@/components/dashboard/UpdateLedgerModal";

export default function BankLedgerPage() {
  const { data: session } = useSession();
  const current = getCurrentNepaliDate();
  
  const [targetMonth, setTargetMonth] = useState(current.monthName);
  const [targetYear, setTargetYear] = useState(current.year);
  const [ledger, setLedger] = useState<any>(null);
  const [baseline, setBaseline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const fetchData = async () => {
    if (!(session?.user as any)?.organizationId) return;
    setLoading(true);
    const monthStr = `${targetMonth} ${targetYear}`;
    const res = await getBankLedger((session?.user as any).organizationId as string, monthStr);
    if (res.success) {
      setLedger(res.data);
    }
    setLoading(false);
  };

  const handleReconcile = async () => {
    if (!(session?.user as any)?.organizationId) return;
    setReconciling(true);
    const monthStr = `${targetMonth} ${targetYear}`;
    await reconcileMonthlyTotals((session?.user as any).organizationId as string, monthStr);
    await fetchData();
    setReconciling(false);
  };

  const isMonthBeforeBaseline = (mIdx: number, year: number) => {
    if (!baseline || !baseline.baselineMonth || !baseline.baselineYear) return false;
    const startM = NEPALI_MONTHS.indexOf(baseline.baselineMonth) + 1;
    const startY = baseline.baselineYear;
    if (year < startY) return true;
    if (year === startY && mIdx < startM) return true;
    return false;
  };

  const handlePrevMonth = () => {
    const mIdx = NEPALI_MONTHS.indexOf(targetMonth);
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
    if ((session?.user as any)?.organizationId) {
      getOrganizationBaseline((session?.user as any).organizationId as string).then(res => {
        if (res.success && res.baselineYear) {
          setBaseline(res);
          // If current selection is before baseline, push it forward
          const currentMonthIdx = NEPALI_MONTHS.indexOf(targetMonth);
          const baselineMonthIdx = NEPALI_MONTHS.indexOf(res.baselineMonth);
          if (targetYear < res.baselineYear || (targetYear === res.baselineYear && currentMonthIdx < baselineMonthIdx)) {
            setTargetYear(res.baselineYear);
            setTargetMonth(res.baselineMonth);
          }
        }
      });
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [session, targetMonth, targetYear]);

  if (loading && !ledger) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-slate-900/50 p-8 rounded-[40px] border border-slate-800 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Bank Ledger</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] ml-1">Monthly Financial Reconciliation Terminal</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[32px] backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Opening Balance</p>
          <p className="text-2xl font-black text-white tracking-tight">Rs. {ledger?.openingBalance?.toLocaleString() || 0}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Previous Month Carryover</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[32px] backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-emerald-500">Net Credit</p>
          <p className="text-2xl font-black text-white tracking-tight">Rs. {(ledger?.totalDeposits + ledger?.totalLoanRepaid + ledger?.bankInterest).toLocaleString() || 0}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500/60">
            <ArrowUpRight className="w-3 h-3" />
            <p className="text-[8px] font-bold uppercase tracking-widest">Total Inflow</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[32px] backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <TrendingDown className="w-24 h-24 text-rose-500" />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-rose-500">Net Debit</p>
          <p className="text-2xl font-black text-white tracking-tight">Rs. {(ledger?.totalLoanDisbursed + ledger?.bankCharges + ledger?.totalExpenditure).toLocaleString() || 0}</p>
          <div className="mt-4 flex items-center gap-2 text-rose-500/60">
            <ArrowDownRight className="w-3 h-3" />
            <p className="text-[8px] font-bold uppercase tracking-widest">Total Outflow</p>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px] backdrop-blur-sm relative overflow-hidden group shadow-[0_20px_50px_rgba(16,185,129,0.1)]">
          <div className="absolute top-0 right-0 p-8 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity">
            <ShieldCheck className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Closing Balance</p>
          <p className="text-2xl font-black text-white tracking-tight">Rs. {ledger?.closingBalance?.toLocaleString() || 0}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500">
            <Calendar className="w-3 h-3" />
            <p className="text-[8px] font-bold uppercase tracking-widest">Monthly Snapshot</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Ledger Details */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] overflow-hidden backdrop-blur-sm flex flex-col">
          <div className="px-8 py-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Transaction Summary</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                <button
                  onClick={handlePrevMonth}
                  disabled={isMonthBeforeBaseline(NEPALI_MONTHS.indexOf(targetMonth), targetYear)}
                  className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select 
                      value={targetYear} 
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-8 py-2.5 text-[11px] font-black text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-500/50 cursor-pointer transition-all shadow-inner block w-28 text-center"
                    >
                      {getNepaliYearRange(baseline?.baselineYear || current.year).map((year: number) => (
                        <option key={year} value={year} className="bg-slate-900 text-slate-300">{year}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select 
                      value={targetMonth} 
                      onChange={(e) => setTargetMonth(e.target.value)}
                      className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-8 py-2.5 text-[11px] font-black text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500 hover:border-emerald-500/50 cursor-pointer transition-all shadow-inner block w-32 text-center"
                    >
                      {NEPALI_MONTHS.map((m, idx) => {
                        const isDisabled = isMonthBeforeBaseline(idx + 1, targetYear);
                        return (
                          <option key={m} value={m} disabled={isDisabled} className={`${isDisabled ? 'text-slate-700' : 'text-slate-300'} bg-slate-900`}>{m}</option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-3 h-3 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-slate-950 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleReconcile}
                  disabled={reconciling}
                  className="group flex items-center gap-2 text-[10px] uppercase font-black text-emerald-400 hover:text-white transition-all bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500"
                >
                  <RefreshCcw className={`w-3 h-3 ${reconciling ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                  Reconcile
                </button>
                <div className="w-px h-6 bg-slate-800" />
                <button 
                  onClick={() => setShowUpdateModal(true)}
                  className="px-6 py-2.5 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-white/5"
                >
                  Update Ledger
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-800">
            {/* Credit Column */}
            <div className="flex flex-col">
              <div className="px-8 py-4 bg-emerald-500/5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Credits (Inflow)</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-8 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                      <th className="px-8 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                            <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Monthly Deposits</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Member Savings</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.totalDeposits?.toLocaleString() || 0}
                      </td>
                    </tr>
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Loan Repayments</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Principal + Interest</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.totalLoanRepaid?.toLocaleString() || 0}
                      </td>
                    </tr>
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Bank Interest</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Manual Entry</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.bankInterest?.toLocaleString() || 0}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-500/[0.02] border-t border-slate-800">
                      <td className="px-8 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-widest">Total Credit</td>
                      <td className="px-8 py-4 text-right font-black text-emerald-400 text-sm">
                        Rs. {(ledger?.totalDeposits + ledger?.totalLoanRepaid + ledger?.bankInterest).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Debit Column */}
            <div className="flex flex-col">
              <div className="px-8 py-4 bg-rose-500/5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Debits (Outflow)</span>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-8 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                      <th className="px-8 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                            <Receipt className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Loan Disbursements</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Capital Outflow</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.totalLoanDisbursed?.toLocaleString() || 0}
                      </td>
                    </tr>
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Bank Charges</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Fees & Penalties</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.bankCharges?.toLocaleString() || 0}
                      </td>
                    </tr>
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">Expenditures</div>
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight">Operating Expenses</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-200 text-xs">
                        Rs. {ledger?.totalExpenditure?.toLocaleString() || 0}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-500/[0.02] border-t border-slate-800">
                      <td className="px-8 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest">Total Debit</td>
                      <td className="px-8 py-4 text-right font-black text-rose-400 text-sm">
                        Rs. {(ledger?.totalLoanDisbursed + ledger?.bankCharges + ledger?.totalExpenditure).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Info & Remarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] p-8 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <AlertCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Reconciliation Note
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                The Monthly Bank Ledger aggregates all <span className="text-emerald-400 font-bold">Approved</span> deposits and <span className="text-rose-400 font-bold">Activated</span> loans for the selected period. Use the 'Reconcile' button if totals seem out of sync with recent activity.
              </p>
           </div>

           <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 backdrop-blur-sm">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Audit Remarks
              </h4>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl min-h-[80px] text-xs text-slate-400 italic">
                {ledger?.remarks || "No remarks provided for this month's ledger."}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showUpdateModal && (
          <UpdateLedgerModal 
            ledger={ledger}
            onClose={() => setShowUpdateModal(false)}
            onUpdate={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
