"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Globe, Shield, Activity } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getOrganizations } from "@/lib/actions/organization";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchOrgs() {
    setLoading(true);
    const result = await getOrganizations();
    if (result.success) setOrganizations(result.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrgs();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Organizations" 
        description="Manage financial organizations, their bank details, and monthly rules."
        icon={Building2}
        actions={
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Organization
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <Globe className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="text-lg font-bold text-white">Multi-Tenant</h3>
          <p className="text-sm text-slate-400 mt-1">Each organization operates as its own secure entity with isolated data.</p>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <Shield className="w-8 h-8 text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold text-white">Bank-Grade Config</h3>
          <p className="text-sm text-slate-400 mt-1">Define custom interest rates and late fee penalties per organization.</p>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm">
          <Activity className="w-8 h-8 text-purple-400 mb-4" />
          <h3 className="text-lg font-bold text-white">Real-time Pulse</h3>
          <p className="text-sm text-slate-400 mt-1">Monitor the financial health and active status of all managed funds.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Active Organizations</h2>
          <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-bold ring-1 ring-slate-700">
            {organizations.length} Total
          </span>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : organizations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                  <th className="px-8 py-5">Organization Name</th>
                  <th className="px-8 py-5">Bank Reference</th>
                  <th className="px-8 py-5">Financial Config</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {organizations.map((org: any) => (
                  <tr key={org._id} className="group hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{org.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">{org._id}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm text-slate-200 font-medium">{org.bankDetails.bankName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{org.bankDetails.accountNo}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-md ring-1 ring-blue-500/20">
                          {org.config.interestRate}% Int.
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-md ring-1 ring-amber-500/20">
                          Rs. {org.config.monthlyDepositAmount} Deposit
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        org.isActive ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${org.isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></span>
                        {org.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="inline-flex p-6 bg-slate-950/50 rounded-full mb-4">
              <Building2 className="w-12 h-12 text-slate-700" />
            </div>
            <p className="text-slate-500 font-medium">No organizations found. Let&apos;s build one.</p>
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
    </div>
  );
}
