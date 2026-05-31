"use client";

import { useState } from "react";
import { Menu, X, Bell, Home, PiggyBank, HandCoins, Settings as SettingsIcon } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import NotificationDrawer from "@/components/dashboard/NotificationDrawer";

interface DashboardShellProps {
  children: React.ReactNode;
  user: any;
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // If role is USER (Member), render the mobile-first bottom-navigation shell
  if (user?.role === "USER") {
    return (
      <MemberShell user={user} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen}>
        {children}
      </MemberShell>
    );
  }

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
              <button 
                onClick={() => setNotificationsOpen(true)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all relative group"
              >
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

      <NotificationDrawer 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        userId={user.id}
        role={user.role}
      />
    </div>
  );
}

// ── Member Mobile Shell ───────────────────────────────────────────────────────

interface MemberShellProps {
  children: React.ReactNode;
  user: any;
  notificationsOpen: boolean;
  setNotificationsOpen: (val: boolean) => void;
}

function MemberShell({ children, user, notificationsOpen, setNotificationsOpen }: MemberShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
      {/* Centered mobile-first canvas on desktop viewports */}
      <div className="flex-1 w-full max-w-md mx-auto bg-slate-950 md:border-x md:border-slate-900 flex flex-col pb-20 shadow-[0_0_80px_rgba(0,0,0,0.8)] min-h-screen relative">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-900/60 flex items-center justify-between px-6 bg-slate-950 md:bg-slate-950/80 md:backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 p-[1px] shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center font-black text-white text-xs">
                {user.name?.charAt(0)}
              </div>
            </div>
            <div>
              <h2 className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Hamro Bachhat</h2>
              <p className="font-bold text-white text-xs leading-none mt-0.5">
                Hi, <span className="text-emerald-400">{user.nickname || user.name.split(" ")[0]}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900 rounded-xl transition-all relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav />
      </div>

      <NotificationDrawer 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        userId={user.id}
        role={user.role}
      />
    </div>
  );
}

function BottomNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "home";

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "deposit", label: "Deposit", icon: PiggyBank },
    { id: "loans", label: "Loans", icon: HandCoins },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-slate-950 md:bg-slate-950/90 md:backdrop-blur-xl border-t border-slate-900/80 py-2.5 px-6 rounded-t-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.5)] overflow-visible">
      <div className="flex items-center justify-between w-full overflow-visible">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/dashboard?tab=${tab.id}`)}
              className="flex-1 flex flex-col items-center justify-center relative py-1.5 px-1 group active:scale-95 transition-transform overflow-visible"
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-slate-800/40 border border-slate-700/50 rounded-xl mx-0.5"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {isActive && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4.5 h-4.5 transition-all duration-300 relative z-10 ${isActive ? "text-emerald-400 -translate-y-1 scale-110 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span className={`text-[8px] font-black uppercase mt-1.5 transition-all duration-300 tracking-wider relative z-10 ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
