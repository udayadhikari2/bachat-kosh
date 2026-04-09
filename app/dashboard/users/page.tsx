"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, ShieldCheck, Mail, Key } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getUsersByOrg } from "@/lib/actions/user";
import AddUserForm from "@/components/dashboard/AddUserForm";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const user = session?.user as any;
  const orgId = user?.organizationId;

  async function fetchUsers() {
    if (!orgId && user?.role !== "DEVELOPER") return;
    setLoading(true);
    // Note: Developer case might need a getAllUsers action eventually
    const result = await getUsersByOrg(orgId || ""); 
    if (result.success) setUsers(result.data);
    setLoading(false);
  }

  useEffect(() => {
    if (session) fetchUsers();
  }, [session, orgId]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users & Members" 
        description="Manage system administrators and organization members. Control access and roles."
        icon={Users}
        actions={
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New User
          </button>
        }
      />

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <div>
            <h2 className="text-xl font-bold text-white">System Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Showing all registered accounts for your organization.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold ring-1 ring-emerald-500/20">
            {users.length} Active Accounts
          </span>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                  <th className="px-8 py-5">Profile</th>
                  <th className="px-8 py-5">Accounting</th>
                  <th className="px-8 py-5">Security Role</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users.map((item: any) => (
                  <tr key={item._id} className="group hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-black shadow-inner shadow-white/5">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white leading-none">{item.name}</div>
                          <div className="flex items-center text-xs text-slate-500 mt-1.5 font-medium">
                            <Mail className="w-3 h-3 mr-1.5 opacity-50" />
                            {item.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm">
                      <div className="text-slate-300 font-mono font-bold tracking-wider">
                        {item.accountNumber || "—"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 opacity-60">
                        {item.committeeRole || "General Member"}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        item.role === "ADMIN" 
                          ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/5" 
                          : item.role === "DEVELOPER"
                          ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                          : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
                      }`}>
                        {item.role === "ADMIN" && <ShieldCheck className="w-3 h-3 mr-1.5" />}
                        {item.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                        <Key className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="inline-flex p-8 bg-slate-950/50 rounded-[40px] mb-6 shadow-2xl shadow-emerald-500/5 ring-1 ring-white/5">
              <Users className="w-14 h-14 text-slate-800" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">No users found</h4>
            <p className="text-slate-500 max-w-xs mx-auto">Start building your community by adding members to your organization.</p>
          </div>
        )}
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
