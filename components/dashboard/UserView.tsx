"use client";

import { useState } from "react";
import { 
  Wallet, 
  History, 
  HelpCircle, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import SubmitDepositForm from "./SubmitDepositForm";

export default function UserView() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  const currentMonthBS = "Chaitra 2080"; 
  const currentMonthEN = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const stats = [
    { label: "My Total Deposit", value: "Rs. 0", icon: Wallet, color: "text-emerald-500" },
    { label: "Active Loan", value: "Rs. 0", icon: AlertCircle, color: "text-red-500" },
    { label: "Deposit Month", value: currentMonthEN, icon: Calendar, color: "text-blue-500" },
    { label: "Status", value: "Pending", icon: History, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <h1 className="text-3xl font-black text-white tracking-tight">Member Portal</h1>
          <p className="text-slate-400 mt-1 font-medium">Track your savings, apply for loans, and manage your monthly deposits.</p>
        </motion.div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDepositModal(true)}
          className="flex items-center px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
        >
          Submit Monthly Deposit
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const value = i === 2 ? currentMonthEN : i === 0 ? `Rs. 0` : stat.value;
          return (
            <motion.div 
              key={i} 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 group cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className={`p-4 rounded-2xl bg-slate-800 ${stat.color} group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-white mt-1 tracking-tight">{value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <History className="w-5 h-5 mr-2 text-emerald-400" />
              Recent Activity
            </h3>
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl font-medium">
              No recent transactions found.
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-emerald-400 mb-2 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Quick Info
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Remember to deposit Rs. 1,000 before the end of this month to avoid a Rs. 30 late fee.
            </p>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Loan Eligibility</h3>
            <div className="space-y-4">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[60%]"></div>
              </div>
              <p className="text-xs text-slate-400">
                You are 60% eligible for your next loan application based on your deposit history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDepositModal && (
        <SubmitDepositForm 
          onClose={() => setShowDepositModal(false)}
        />
      )}
    </div>
  );
}
