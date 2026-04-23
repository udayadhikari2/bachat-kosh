"use client";

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
  ShieldCheck
} from "lucide-react";
import { signOut } from "next-auth/react";
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
    },
    {
      title: "Loans",
      icon: HandCoins,
      href: "/dashboard/loans",
      roles: ["ADMIN", "USER"],
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

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Hamro Bachat
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          {role} Portal
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

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
