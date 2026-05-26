"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  PiggyBank, 
  HandCoins, 
  Settings, 
  LogOut,
  Bell,
  FileText,
  ShieldCheck,
  ChevronDown,
  Circle
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { getPendingDepositCount } from "@/lib/actions/deposit";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  role: "DEVELOPER" | "ADMIN" | "USER";
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState(0);

  const organizationName = (session?.user as any)?.organizationName as string | undefined;
  // DEVELOPER sees system name "Bachat"; ADMIN/USER see their org name
  const brandName = role === "DEVELOPER" ? "Bachat" : (organizationName || "Bachat");

  useEffect(() => {
    const fetchPending = async () => {
      const orgId = (session?.user as any)?.organizationId;
      if (orgId && role === "ADMIN") {
        const res = await getPendingDepositCount(orgId);
        if (res.success) setPendingCount(res.count);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [session, role]);

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      roles: ["DEVELOPER", "ADMIN", "USER"],
    },
    {
      title: "Organizations",
      icon: Building2,
      href: "/dashboard/organizations",
      roles: ["DEVELOPER"],
    },
    {
      title: "Users",
      icon: Users,
      href: "/dashboard/users",
      roles: ["DEVELOPER", "ADMIN"],
    },
    {
      title: "Deposits",
      icon: PiggyBank,
      href: "/dashboard/deposits",
      roles: ["ADMIN", "USER"],
      subItems: [
        { title: "Monthly Deposit", href: "/dashboard/deposits" },
        { title: "Aggregation", href: "/dashboard/deposits/aggregation" },
      ]
    },
    {
      title: "Loans",
      icon: HandCoins,
      href: "/dashboard/loans",
      roles: ["ADMIN", "USER"],
    },
    {
      title: "Bank Ledger",
      icon: ShieldCheck,
      href: "/dashboard/bank-ledger",
      roles: ["DEVELOPER", "ADMIN"],
    },
    {
      title: "Reports",
      icon: FileText,
      href: "/dashboard/reports",
      roles: ["DEVELOPER", "ADMIN"],
    },
    {
      title: "Notifications",
      icon: Bell,
      href: "/dashboard/notifications",
      roles: ["DEVELOPER", "ADMIN"],
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      roles: ["DEVELOPER", "ADMIN", "USER"],
    },
    {
      title: "Vault Sync",
      icon: ShieldCheck,
      href: "/dashboard/external-funds",
      roles: ["ADMIN"],
    },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(role));

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-open menu containing the active sub-item
    const initialOpen: Record<string, boolean> = {};
    filteredItems.forEach(item => {
      if (item.subItems && item.subItems.some(sub => pathname === sub.href)) {
        initialOpen[item.title] = true;
      }
    });
    setOpenMenus(initialOpen);
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          {brandName}
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          {role === "DEVELOPER" ? "System" : role} Portal
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isActive = pathname === item.href || (hasSubItems && item.subItems?.some(sub => pathname === sub.href));
          
          const isOpen = openMenus[item.title];

          if (hasSubItems) {
            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center">
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5 transition-colors",
                        isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    {item.title}
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen ? "rotate-180" : ""
                  )} />
                </button>
                
                {isOpen && (
                  <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 mt-1">
                    {item.subItems?.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "flex items-center px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200",
                            isSubActive
                              ? "text-emerald-400 bg-emerald-500/5"
                              : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
                          )}
                        >
                          <Circle className={cn(
                            "mr-2 h-1.5 w-1.5",
                            isSubActive ? "fill-emerald-400" : "fill-slate-600"
                          )} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-widest">{sub.title}</span>
                            {sub.title === "Monthly Deposit" && role === "ADMIN" && pendingCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-rose-500 text-[8px] font-black text-white flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/20">
                                {pendingCount}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                )}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => signOut()}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
