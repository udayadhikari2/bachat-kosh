"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  PiggyBank, 
  HandCoins, 
  ArrowUpRight,
  Plus,
  MoreVertical,
  Circle,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import AddUserForm from "./AddUserForm";
import { getUsersByOrg } from "@/lib/actions/user";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  accountNumber?: string;
  isLoanApprover: boolean;
}

export default function AdminView() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = (session?.user as any)?.organizationId;

  async function fetchUsers() {
    if (!orgId) return;
    setLoading(true);
    const result = await getUsersByOrg(orgId);
    if (result.success) {
      setUsers(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, [orgId]);
  const stats = [
    { label: "Total Members", value: "0", icon: Users, color: "text-blue-500" },
    { label: "Pending Deposits", value: "0", icon: PiggyBank, color: "text-amber-500" },
    { label: "Active Loans", value: "0", icon: HandCoins, color: "text-emerald-500" },
    { label: "Total Fund", value: "Rs. 0", icon: ArrowUpRight, color: "text-cyan-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Financial Manager Dashboard</h1>
          <p className="text-slate-400 mt-1">Monitor deposits, approve loans, and manage your organization&apos;s members.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const value = i === 0 ? users.length : stat.value;
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-6">Organization Members</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="pb-4 font-semibold">Member</th>
                    <th className="pb-4 font-semibold">Account #</th>
                    <th className="pb-4 font-semibold">Role</th>
                    <th className="pb-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((user) => (
                    <tr key={user._id} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-xs font-bold text-emerald-400">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-300">{user.accountNumber || "N/A"}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "ADMIN" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {user.role}
                          {user.isLoanApprover && <ShieldCheck className="w-3 h-3 ml-1" />}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button className="text-slate-400 hover:text-white transition-colors">
                          <MoreVertical className="w-5 h-5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl font-medium">
              No members added yet.
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Pending Verifications</h3>
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl font-medium">
              No pending deposits.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Active Loan Status</h3>
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl font-medium">
              No active loans.
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AddUserForm 
          onClose={() => {
            setShowModal(false);
            fetchUsers();
          }}
          fixedOrgId={orgId}
        />
      )}
    </div>
  );
}
