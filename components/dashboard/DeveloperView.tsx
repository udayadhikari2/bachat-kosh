"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  TrendingUp,
  Plus,
  ShieldCheck,
  MoreVertical,
  Circle
} from "lucide-react";
import CreateOrganizationForm from "./CreateOrganizationForm";
import AddUserForm from "./AddUserForm";
import { getOrganizations } from "@/lib/actions/organization";

interface OrganizationData {
  _id: string;
  name: string;
  bankDetails: {
    bankName: string;
    accountNo: string;
  };
  config: {
    monthlyDepositAmount: number;
    interestRate: number;
  };
  isActive: boolean;
}

export default function DeveloperView() {
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrgs() {
    setLoading(true);
    const result = await getOrganizations();
    if (result.success) {
      setOrganizations(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrgs();
  }, []);
  const stats = [
    { label: "Total Organizations", value: "0", icon: Building2, color: "text-blue-500" },
    { label: "Total Users", value: "0", icon: Users, color: "text-emerald-500" },
    { label: "Active Admins", value: "0", icon: ShieldCheck, color: "text-purple-500" },
    { label: "Global Liquidity", value: "Rs. 0", icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Developer Overview</h1>
          <p className="text-slate-400 mt-1">Manage global organizations and top-level settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const value = i === 0 ? organizations.length : stat.value;
          return (
            <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-700 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-slate-800 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white mb-6">Organizations</h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : organizations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="pb-4 font-semibold">Name</th>
                  <th className="pb-4 font-semibold">Bank Details</th>
                  <th className="pb-4 font-semibold">Rules</th>
                  <th className="pb-4 font-semibold">Status</th>
                  <th className="pb-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {organizations.map((org) => (
                  <tr key={org._id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-white">{org.name}</div>
                      <div className="text-xs text-slate-500">ID: {org._id.slice(-6)}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-slate-300">{org.bankDetails.bankName}</div>
                      <div className="text-xs text-slate-500">{org.bankDetails.accountNo}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-xs text-slate-300">Deposit: Rs. {org.config.monthlyDepositAmount}</div>
                      <div className="text-xs text-slate-500">Interest: {org.config.interestRate}%</div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}>
                        <Circle className="w-2 h-2 mr-1.5 fill-current" />
                        {org.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-slate-400 hover:text-white transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
            No organizations created yet. Start by creating one.
          </div>
        )}
      </div>

      {showModal && (
        <CreateOrganizationForm
          onClose={() => {
            setShowModal(false);
            fetchOrgs();
          }}
        />
      )}
      {showUserModal && (
        <AddUserForm
          onClose={() => setShowUserModal(false)}
          organizations={organizations}
        />
      )}
    </div>
  );
}
