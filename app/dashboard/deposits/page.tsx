"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PiggyBank, Plus, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import SubmitDepositForm from "@/components/dashboard/SubmitDepositForm";

export default function DepositsPage() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  // Mock data for UI demonstration until backend actions are fully wired
  const mockDeposits = [
    { _id: "1", userName: "Member One", amount: 1000, month: "Chaitra 2080", status: "PENDING", date: "2080-12-05" },
    { _id: "2", userName: "Member Two", amount: 1000, month: "Chaitra 2080", status: "APPROVED", date: "2080-12-04" },
  ];

  useEffect(() => {
    // Simulate fetching
    setTimeout(() => {
      setDeposits(isAdmin ? mockDeposits : [mockDeposits[0]]);
      setLoading(false);
    }, 500);
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Deposits" 
        description={isAdmin ? "Review and approve monthly deposits from organization members." : "Track your monthly savings and submission history."}
        icon={PiggyBank}
        actions={!isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Submit Deposit
          </button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-white">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm ring-1 ring-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending</span>
          </div>
          <div className="text-3xl font-black tracking-tight">{isAdmin ? "12" : "1"}</div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Monthly Verifications</p>
        </div>
        
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm ring-1 ring-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Collected</span>
          </div>
          <div className="text-3xl font-black tracking-tight">Rs. 45,000</div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Organization Fund</p>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm ring-1 ring-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Late</span>
          </div>
          <div className="text-3xl font-black tracking-tight">3</div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Delayed Submissions</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <h2 className="text-xl font-bold text-white tracking-tight">Transmission Entry</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-widest ring-1 ring-slate-700">
              Month: Chaitra
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : deposits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                  <th className="px-8 py-5">Source Member</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Target Month</th>
                  <th className="px-8 py-5">Verification</th>
                  <th className="px-8 py-5 text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {deposits.map((dep: any) => (
                  <tr key={dep._id} className="group hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                        {dep.userName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 opacity-60 italic">{dep.date}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm text-slate-200 font-black tracking-wider">Rs. {dep.amount}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs text-slate-400 font-bold">{dep.month}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        dep.status === "PENDING" 
                          ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/5" 
                          : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                      }`}>
                        {dep.status === "PENDING" && <Clock className="w-3 h-3 mr-2 animate-pulse" />}
                        {dep.status === "APPROVED" && <CheckCircle2 className="w-3 h-3 mr-2" />}
                        {dep.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       {isAdmin && dep.status === "PENDING" ? (
                         <div className="flex justify-end gap-2">
                            <button className="p-2 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition-all">
                              <XCircle className="w-4 h-4" />
                            </button>
                         </div>
                       ) : (
                        <button className="p-2 text-slate-500 hover:text-white bg-slate-950/50 rounded-xl transition-all hover:ring-1 ring-white/10">
                          <FileText className="w-4 h-4" />
                        </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <PiggyBank className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-50" />
            <p className="text-slate-500 font-bold tracking-tight">No deposits recorded for this period.</p>
          </div>
        )}
      </div>

      {showModal && (
        <SubmitDepositForm 
          onClose={() => setShowModal(false)}
          currentMonth="Chaitra 2080"
          defaultAmount={1000}
        />
      )}
    </div>
  );
}
