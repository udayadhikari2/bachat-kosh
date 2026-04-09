"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { HandCoins, Plus, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";

export default function LoansPage() {
  const { data: session } = useSession();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  // Mock data for UI demonstration
  const mockLoans = [
    { _id: "1", userName: "Member One", amount: 50000, interestRate: 12, status: "ACTIVE", nextPayment: "2081-01-15", progress: 45 },
    { _id: "2", userName: "Recent Applicant", amount: 25000, interestRate: 12, status: "PENDING_APPROVAL", progress: 0 },
  ];

  useEffect(() => {
    setTimeout(() => {
      setLoans(isAdmin ? mockLoans : [mockLoans[0]]);
      setLoading(false);
    }, 500);
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Loan Management" 
        description={isAdmin ? "Oversee loan applications, monitor active credit, and verify dual-approvals." : "Apply for financial assistance and track your active loan repayment progress."}
        icon={HandCoins}
        actions={!isAdmin && (
          <button className="flex items-center px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-emerald-500/20 active:scale-95">
            <Plus className="w-5 h-5 mr-2" />
            Apply for Loan
          </button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-white">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm shadow-2xl ring-1 ring-white/5">
          <TrendingUp className="w-8 h-8 text-emerald-400 mb-4" />
          <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter mb-1">Total Credit Issued</div>
          <div className="text-2xl font-black">Rs. 1,25,000</div>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm shadow-2xl ring-1 ring-white/5">
          <ShieldCheck className="w-8 h-8 text-blue-400 mb-4" />
          <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter mb-1">Monthly Interest</div>
          <div className="text-2xl font-black">Rs. 1,500</div>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm shadow-2xl ring-1 ring-white/5">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-4" />
          <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter mb-1">Pending Approvals</div>
          <div className="text-2xl font-black">1</div>
        </div>
        <div className="p-6 bg-emerald-600/10 border border-emerald-500/20 rounded-3xl backdrop-blur-sm shadow-2xl ring-1 ring-emerald-500/10">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
          <div className="text-sm font-bold text-emerald-500 uppercase tracking-tighter mb-1">Eligibility Status</div>
          <div className="text-2xl font-black text-white">VERIFIED</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
            <div className="px-8 py-6 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white tracking-tight">Active Portfolio</h2>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950/50 px-2.5 py-1 rounded-lg">
                Showing {loans.length} Accounts
              </span>
            </div>

            {loading ? (
              <div className="p-20 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : loans.length > 0 ? (
              <div className="divide-y divide-slate-800/50">
                {loans.map((loan: any) => (
                  <div key={loan._id} className="p-8 group hover:bg-slate-800/10 transition-all duration-300 relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800 group-hover:border-emerald-500/20 transition-all">
                            <HandCoins className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg tracking-tight">{loan.userName}</h4>
                            <p className="text-xs text-slate-500 font-medium">Agreement Date: 2080-11-20</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Principal</p>
                            <p className="text-sm text-slate-300 font-bold tracking-wider">Rs. {loan.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Interest Rate</p>
                            <p className="text-sm text-blue-400 font-bold">{loan.interestRate}% P.A.</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                              loan.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                            }`}>
                              {loan.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 min-w-[140px]">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Next Payment</p>
                          <p className="text-xs text-white font-bold">{loan.nextPayment || "Pending Approval"}</p>
                        </div>
                        <button className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group/link pt-2">
                          View Details
                          <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-8 h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${loan.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                 <p className="text-slate-500">No loan records found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
           <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[32px] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000"></div>
              <h3 className="text-lg font-bold text-white mb-4">Financial Health</h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase mb-2">
                       <span>Total Deposits</span>
                       <span className="text-emerald-400">Rs. 15,000</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[75%]"></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase mb-2">
                       <span>Active Loans</span>
                       <span className="text-amber-500">Rs. 50,000</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-500 w-[30%]"></div>
                    </div>
                 </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-6 leading-relaxed italic">
                * Eligibility is calculated based on 3x your total monthly savings and consistency.
              </p>
           </div>

           <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[32px] backdrop-blur-sm ring-1 ring-white/5">
              <h3 className="text-lg font-bold text-white mb-4">Loan Calculator</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Principal Amount</p>
                    <p className="text-lg font-black text-white tracking-widest">Rs. 10,000</p>
                 </div>
                 <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Interest (12%)</p>
                    <p className="text-lg font-black text-blue-400 tracking-widest">Rs. 100 / Month</p>
                 </div>
                 <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
                    Launch Full Calculator
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
