"use client";

import { useState } from "react";
import { Menu, X, Bell } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: any;
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Sidebar - Desktop (Static) and Mobile (Overlay) */}
      <div className={`
        fixed inset-0 z-50 lg:static lg:block
        ${sidebarOpen ? "block" : "hidden"}
      `}>
        {/* Mobile Backdrop */}
        <div 
          className="lg:hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Sidebar Container */}
        <div className="relative h-full w-64">
           {/* Close Button Mobile */}
           <button 
             onClick={() => setSidebarOpen(false)}
             className="lg:hidden absolute top-4 right-[-48px] p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"
           >
             <X className="w-6 h-6" />
           </button>
           <Sidebar role={user.role} />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 custom-scrollbar">
        {/* Header */}
        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-4 sm:px-8 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Financial Portal</h2>
              <p className="font-bold text-white text-sm">Welcome, <span className="text-emerald-400">{user.name}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access Level</span>
               <span className="text-xs font-bold text-slate-300">{user.role}</span>
            </div>
            
            <div className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-slate-800/50">
              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all relative group">
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950 group-hover:scale-125 transition-transform"></span>
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 p-[1px] shadow-lg shadow-emerald-500/10">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-white text-sm">
                   {user.name?.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
