"use client";

import { useSession } from "next-auth/react";
import { Settings, Shield, User, Lock, Bell, Moon, Globe } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader 
        title="Settings" 
        description="Manage your account preferences, security settings, and organization profile."
        icon={Settings}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-1">
          {[
            { label: "Profile", icon: User, active: true },
            { label: "Security", icon: Lock },
            { label: "Organization", icon: Globe, adminOnly: true },
            { label: "Notifications", icon: Bell },
            { label: "Appearance", icon: Moon },
          ].map((item, i) => (
             (!item.adminOnly || (user?.role === "ADMIN" || user?.role === "DEVELOPER")) && (
              <button 
                key={i} 
                className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  item.active ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5" : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
                }`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </button>
            )
          ))}
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
              <User className="w-5 h-5 mr-3 text-emerald-400" />
              Profile Information
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
                  <input 
                    type="text" 
                    defaultValue={user?.name}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Email address</label>
                  <input 
                    type="email" 
                    defaultValue={user?.email}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Role & Access</label>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold ring-1 ring-slate-700">
                    {user?.role} Portal
                  </span>
                  {user?.isLoanApprover && (
                    <span className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-bold ring-1 ring-purple-500/20">
                      Loan Approver
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-800 flex justify-end">
              <button className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                Save Profile Updates
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center text-red-400">
              <Shield className="w-5 h-5 mr-3" />
              Security Settings
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Session Security</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">You are currently logged in via email/password authentication.</p>
                <button className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all ring-1 ring-slate-700">
                  <Lock className="w-3.5 h-3.5 mr-2" />
                  Request Password Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
