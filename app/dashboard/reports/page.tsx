"use client";

import { FileText, Download, TrendingUp, Calendar, Filter } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";

export default function ReportsPage() {
  const reports = [
    { title: "Monthly Deposit Summary", description: "Comprehensive breakdown of all member deposits for the current month.", icon: Calendar, type: "Excel" },
    { title: "Defaulters Report", description: "List of members with pending deposits or overdue loan payments.", icon: TrendingUp, type: "PDF" },
    { title: "Member Ledger", description: "Detailed multi-month financial history for an individual member.", icon: FileText, type: "Excel" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Financial Reports" 
        description="Generate and export financial insights for your organization. Automated reconciliations and ledger summaries."
        icon={FileText}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-all">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Quarterly Turnover</p>
          <div className="text-2xl font-bold text-white mb-1">Rs. 0.00</div>
          <div className="text-xs text-emerald-400 font-medium">+0% from last quarter</div>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Interest Collected</p>
          <div className="text-2xl font-bold text-white mb-1">Rs. 0.00</div>
          <div className="text-xs text-blue-400 font-medium tracking-wide">Target: Rs. 50,000</div>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending Penalties</p>
          <div className="text-2xl font-bold text-white mb-1">Rs. 0.00</div>
          <div className="text-xs text-red-500 font-medium tracking-wide">Across 0 members</div>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Loan Volume</p>
          <div className="text-2xl font-bold text-white mb-1">Rs. 0.00</div>
          <div className="text-xs text-slate-400 font-medium">0 Active Loans</div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <h2 className="text-xl font-bold text-white">Available Exports</h2>
          <button className="flex items-center text-xs text-slate-400 hover:text-emerald-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-lg ring-1 ring-slate-700">
            <Filter className="w-3.5 h-3.5 mr-2" />
            Advanced Filtering
          </button>
        </div>

        <div className="divide-y divide-slate-800/50">
          {reports.map((report, i) => {
            const Icon = report.icon;
            return (
              <div key={i} className="px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-slate-800/10 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 group-hover:border-emerald-500/20 group-hover:scale-105 transition-all shadow-inner shadow-white/5">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{report.title}</h4>
                    <p className="text-sm text-slate-400 mt-1 max-w-md">{report.description}</p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-md ring-1 ring-emerald-500/20 uppercase tracking-widest">
                        Available now
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                        Format: {report.type}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-xl transition-all font-bold shadow-xl active:scale-95 group/btn border border-slate-700 hover:border-emerald-500">
                  <Download className="w-4 h-4 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" />
                  Generate {report.type}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">Automated Monthly Recon</h3>
            <p className="text-slate-400 max-w-lg">
              Set up a scheduled report that gets sent to all board members every month-end (Nepali Calendar).
            </p>
          </div>
          <button className="px-8 py-4 bg-emerald-600/10 hover:bg-emerald-600 flex items-center text-emerald-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all ring-1 ring-emerald-500/20 active:scale-95">
            Configure Automation
          </button>
        </div>
      </div>
    </div>
  );
}
