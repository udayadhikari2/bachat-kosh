"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Users, 
  PiggyBank, 
  HandCoins, 
  ArrowUpRight,
  Plus,
  MoreVertical,
  Circle,
  Shield,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  RefreshCcw,
  Info
} from "lucide-react";
import AddUserForm from "./AddUserForm";
import { getCurrentNepaliDate, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import { getUsersByOrg, verifyAdminPassword } from "@/lib/actions/user";
import { getAdminDepositStats, updateOrganizationFinancials } from "@/lib/actions/deposit";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  accountNumber?: string;
  isLoanApprover: boolean;
  isSecondaryAdmin: boolean;
  isActive: boolean;
}

export default function AdminView() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lifetimeStats, setLifetimeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Financial Ledger State
  const current = getCurrentNepaliDate();
  const [targetMonth, setTargetMonth] = useState(current.monthName);
  const [targetYear, setTargetYear] = useState(current.year);
  const orgId = (session?.user as any)?.organizationId;

  async function fetchData(month = targetMonth, year = targetYear) {
    if (!orgId) return;
    setLoading(true);
    
    // Combine month and year for backend query if both are selected
    const queryMonth = (month && year) ? `${month} ${year}` : (month || "all");

    try {
      const [uResult, sResult, lifetimeResult] = await Promise.all([
        getUsersByOrg(orgId).catch(err => ({ success: false, error: err.message })),
        getAdminDepositStats(orgId, queryMonth).catch(err => ({ success: false, error: err.message })),
        getAdminDepositStats(orgId, "all").catch(err => ({ success: false, error: err.message }))
      ]);
      
      if (uResult.success) setUsers((uResult as any).data);
      if (sResult.success) {
        setStats((sResult as any).data);
      } else {
        console.error("[DEBUG] sResult failure:", (sResult as any).error);
      }
      if (lifetimeResult.success) {
        setLifetimeStats((lifetimeResult as any).data);
      } else {
        console.error("[DEBUG] lifetimeResult failure:", (lifetimeResult as any).error);
      }
    } catch (globalError) {
      console.error("[DEBUG] Global Fetch Error:", globalError);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData(targetMonth, targetYear);
  }, [orgId, targetMonth, targetYear]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header with Monthly Controller */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-slate-900/50 p-6 sm:p-8 rounded-[40px] border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">Admin Terminal</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Financial Oversight & Ledger Status</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 relative z-50">
           {(targetMonth !== current.monthName || targetYear !== current.year) && (
             <button 
               onClick={() => {
                 setTargetMonth(current.monthName);
                 setTargetYear(current.year);
               }} 
               className="text-[10px] uppercase font-black text-rose-500 hover:text-white transition-all bg-rose-500/10 px-3 py-2 rounded-xl"
             >
               Back to Current
             </button>
           )}
           
           <button 
              onClick={() => fetchData()}
              disabled={loading}
              className="group flex items-center gap-2 text-[10px] uppercase font-black text-emerald-400 hover:text-white transition-all bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 hover:border-emerald-500"
            >
              <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
              Sync Ledger
            </button>

            <div className="flex items-center gap-2">
             <div className="relative">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest absolute -top-5 left-2">Year</label>
               <select 
                 value={targetYear} 
                 onChange={(e) => setTargetYear(Number(e.target.value))}
                 className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-10 py-2.5 text-sm font-black text-blue-400 outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-500/50 cursor-pointer transition-all shadow-inner block w-32"
               >
                 {[2079, 2080, 2081, 2082, 2083].map(y => (
                   <option key={y} value={y} className="bg-slate-900 text-slate-300">{y}</option>
                 ))}
               </select>
               <ChevronDown className="w-4 h-4 text-blue-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>

             <div className="relative">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest absolute -top-5 left-2">Month</label>
               <select 
                 value={targetMonth} 
                 onChange={(e) => setTargetMonth(e.target.value)}
                 className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 pl-5 pr-10 py-2.5 text-sm font-black text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-500/50 cursor-pointer transition-all shadow-inner block w-40"
               >
                 <option value="" className="text-slate-500">All Months</option>
                 {NEPALI_MONTHS.map((m) => (
                   <option key={m} value={m} className="text-slate-300 bg-slate-900">{m}</option>
                 ))}
               </select>
               <ChevronDown className="w-4 h-4 text-emerald-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
           </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>
      ) : stats && (
        <>
          {/* Advanced Compact Stats Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              { 
                label: "Aggregate Transactions", 
                val: stats.totalTransaction, 
                color: "text-blue-400", 
                bg: "from-blue-600/20 to-indigo-600/5", 
                icon: ArrowUpRight,
                glow: "bg-blue-500/20",
                description: "Volume of transmissions processed in current ledger"
              },
              { 
                label: "Grand Total Collection", 
                val: `Rs. ${(lifetimeStats?.grandTotalCollection || 0).toLocaleString('en-IN')}`, 
                color: "text-emerald-400", 
                bg: "from-emerald-600/20 to-teal-600/5", 
                icon: PiggyBank,
                glow: "bg-emerald-500/20",
                description: "Life-time assets accumulated across all periods"
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`relative bg-gradient-to-br ${s.bg} border border-slate-800 rounded-[32px] p-6 shadow-xl hover:border-slate-700 transition-all group overflow-hidden`}>
                  <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] ${s.glow} opacity-20 group-hover:opacity-40 transition-opacity duration-1000`}></div>
                  
                  <div className="relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${s.glow.replace('bg-', 'bg-').replace('/20', '/10')} border border-white/5`}>
                        <Icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{s.label}</p>
                        <p className={`${s.color} text-2xl font-black tracking-tighter mt-0.5`}>
                          {s.val}
                        </p>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block"></div>
                    <div className="hidden sm:block text-right">
                       <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5">Focus Area</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.description.split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comprehensive Financial Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 overflow-hidden relative group shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shadow-sm">
              <h3 className="text-[14px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                 <Building2 className="w-6 h-6 text-emerald-500 p-1.5 bg-emerald-500/10 rounded-lg" />
                 Total Collection Ledger
                 <div className="group/info relative">
                    <Info className="w-3.5 h-3.5 text-slate-600 hover:text-emerald-400 transition-colors cursor-help" />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-950 border border-slate-800 p-4 rounded-2xl shadow-2xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all z-[100] backdrop-blur-xl">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">DB Baseline Audit</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                          <span>Historical Monthly:</span>
                          <span className="text-white">Rs. {lifetimeStats?.financials?.initialMonthlyCollection?.toLocaleString('en-IN') || 0}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                          <span>Bank Interest:</span>
                          <span className="text-white">Rs. {lifetimeStats?.financials?.initialBankInterest?.toLocaleString('en-IN') || 0}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                          <span>Loan Interest:</span>
                          <span className="text-white">Rs. {lifetimeStats?.financials?.initialLoanInterest?.toLocaleString('en-IN') || 0}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase pt-2 border-t border-slate-800">
                          <span>Audit ID:</span>
                          <span className="text-slate-600 truncate ml-2">{lifetimeStats?.latestAudit?.id || 'NO_AUDIT'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
              </h3>
              {lifetimeStats?.fetchedAt && (
                 <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   Last Synced: {new Date(lifetimeStats.fetchedAt).toLocaleTimeString()}
                 </div>
               )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-slate-800">
                     <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50">Category Name</th>
                     <th className="py-4 px-6 text-right text-[10px] font-black text-blue-400 uppercase tracking-widest bg-slate-900/50">Month Wise Collection ({targetMonth ? `${targetMonth} ${targetYear}` : `All Months`})</th>
                     <th className="py-4 px-6 text-right text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-slate-900/50">Total Collection (life time)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[
                     { label: "Monthly Deposit Collection", val: stats.totalApprovedAmount, lifetime: lifetimeStats?.totalApprovedAmount },
                     { label: "Delayed Late Fines", val: stats.totalDelayedFinePaid, lifetime: lifetimeStats?.totalDelayedFinePaid },
                     { label: "System Service Charges", val: stats.totalServiceChargePaid || 0, lifetime: lifetimeStats?.totalServiceChargePaid || 0 },
                     { label: "Loan Interest Realized", val: stats.totalLoanInterestPaid || 0, lifetime: lifetimeStats?.totalLoanInterestPaid || 0 },
                     { label: "Bank Account Interest", val: stats.bankInterest || 0, lifetime: lifetimeStats?.bankInterest || 0 },
                     { label: "NAV Asset Collection", val: stats.navCollection || 0, lifetime: lifetimeStats?.navCollection || 0 },
                     { label: "Miscellaneous Income", val: stats.miscellaneous || 0, lifetime: lifetimeStats?.miscellaneous || 0 },
                   ].map((row: any, i) => (
                      <tr key={i} className={`transition-all ${row.accent ? 'bg-blue-950/10 hover:bg-blue-950/20' : 'hover:bg-slate-800/20'}`}>
                        <td className={`py-5 px-6 text-xs font-bold uppercase tracking-widest border-l-2 border-transparent ${row.accent ? 'text-blue-400 hover:border-blue-500' : 'text-slate-400 hover:border-emerald-500'}`}>
                          {row.label}
                          {row.accent && <span className="ml-2 text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest">Manual</span>}
                        </td>
                        <td className="py-5 px-6 text-right text-sm font-black text-blue-400 tracking-tight">Rs. {row.val?.toLocaleString('en-IN') || 0}</td>
                        <td className={`py-5 px-6 text-right text-sm font-black tracking-tight ${row.accent ? 'text-blue-300' : 'text-emerald-400'}`}>Rs. {row.lifetime?.toLocaleString('en-IN') || 0}</td>
                      </tr>
                   ))}
                </tbody>
                <tfoot>
                   <tr className="bg-emerald-950/20 shadow-inner">
                       <td className="py-6 px-6 text-sm font-black text-white uppercase tracking-[0.3em]">Grand Total Collection</td>
                       <td className="py-6 px-6 text-right text-xl font-black text-blue-400 tracking-tight drop-shadow-md">Rs. {stats.grandTotalCollection?.toLocaleString('en-IN') || 0}</td>
                       <td className="py-6 px-6 text-right text-2xl font-black text-emerald-400 tracking-tight drop-shadow-md">Rs. {lifetimeStats?.grandTotalCollection?.toLocaleString('en-IN') || 0}</td>
                   </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Verification Clusters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] p-8 backdrop-blur-sm shadow-lg">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" /> Pending Queue
                </h3>
                <Link href="/dashboard/deposits?status=PENDING" className="text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300">Process All</Link>
              </div>
              <div className="text-center py-20 text-slate-700 border-2 border-dashed border-slate-800 rounded-[30px] font-black uppercase tracking-widest text-[10px]">
                {stats.pendingCount > 0 ? `${stats.pendingCount} Pending Transmissions Logs` : `Empty Stack`}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] p-8 backdrop-blur-sm shadow-lg">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <HandCoins className="w-5 h-5 text-blue-500" /> Loan Verifications
                </h3>
                <Link href="/dashboard/loans" className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300">View History</Link>
              </div>
              <div className="text-center py-20 text-slate-700 border-2 border-dashed border-slate-800 rounded-[30px] font-black uppercase tracking-widest text-[10px]">
                Zero Active Requests
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <AddUserForm 
          onClose={() => {
            setShowModal(false);
            fetchData();
          }}
          fixedOrgId={orgId}
        />
      )}
    </div>
  );
}
