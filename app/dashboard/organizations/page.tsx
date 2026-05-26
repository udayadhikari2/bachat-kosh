"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Power, 
  Eye, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  KeyRound
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getOrganizations } from "@/lib/actions/organization";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";
import { toggleOrganizationStatus, deleteOrganization } from "@/lib/actions/organization";
import { getOfficialBankName } from "@/lib/utils/export-utils";
import OrgAdminCredentialsModal from "@/components/dashboard/OrgAdminCredentialsModal";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [adminOrg, setAdminOrg] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Filtering logic
  const filteredOrgs = useMemo(() => {
    let result = organizations;

    if (searchQuery) {
      result = result.filter((org: any) => 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.bankDetails.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.bankDetails.accountNo.includes(searchQuery)
      );
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((org: any) => org.isActive === isActive);
    }

    return result;
  }, [organizations, searchQuery, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrgs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrgs = filteredOrgs.slice(startIndex, startIndex + rowsPerPage);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, rowsPerPage]);

  const handleToggleStatus = async (org: any) => {
    if (!confirm(`Are you sure you want to ${org.isActive ? "disable" : "enable"} this organization?`)) return;
    const result = await toggleOrganizationStatus(org._id, org.isActive);
    if (result.success) fetchOrgs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) return;
    const result = await deleteOrganization(id);
    if (result.success) fetchOrgs();
  };

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

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === "all" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === "active" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-500 hover:text-slate-300"}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("disabled")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === "disabled" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-500 hover:text-slate-300"}`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <h2 className="text-xl font-bold text-white">System Organizations</h2>
          <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-bold ring-1 ring-slate-700">
            {filteredOrgs.length} Found
          </span>
        </div>

        {loading ? (
          <div className="p-24 flex justify-center">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Accessing Ledger...</p>
            </div>
          </div>
        ) : organizations.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                    <th className="px-8 py-5">Organization Name</th>
                    <th className="px-8 py-5">Bank Reference</th>
                    <th className="px-8 py-5">Financial Config</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedOrgs.map((org: any) => (
                    <tr key={org._id} className="group hover:bg-slate-800/20 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{org.name}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">{org._id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-slate-200 font-bold">{getOfficialBankName(org.bankDetails.bankName)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{org.bankDetails.accountNo}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-md ring-1 ring-blue-500/20">
                            {org.config.interestRate}% INT.
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-black rounded-md ring-1 ring-amber-500/20">
                            RS. {org.config.monthlyDepositAmount} UNITS
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
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAdminOrg(org)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${
                              org.adminId
                                ? "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            }`}
                            title={org.adminId ? "Update Admin Credentials" : "Assign Admin"}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrg(org);
                              setShowModal(true);
                            }}
                            className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all active:scale-95"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(org)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${
                              org.isActive ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={org.isActive ? "Disable" : "Enable"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(org._id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-8 py-5 bg-slate-950/50 border-t border-slate-800 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Per Page</label>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">
                  {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredOrgs.length)} of {filteredOrgs.length} Entities
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 hover:border-slate-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
                   <span className="text-[10px] font-black text-white">{currentPage}</span>
                   <span className="text-[10px] font-bold text-slate-600">/</span>
                   <span className="text-[10px] font-bold text-slate-600">{totalPages || 1}</span>
                </div>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 hover:border-slate-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-24 text-center">
            <div className="inline-flex p-8 bg-slate-950/50 rounded-[40px] mb-6 shadow-2xl shadow-emerald-500/5 ring-1 ring-white/5 border border-slate-800">
              <Building2 className="w-14 h-14 text-slate-800" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">No organizations detected</h4>
            <p className="text-slate-500 max-w-xs mx-auto">The ledger is empty. Click "New Organization" to initialize the first node.</p>
          </div>
        )}
      </div>

      {showModal && (
        <CreateOrganizationForm 
          onClose={() => {
            setShowModal(false);
            setEditingOrg(null);
            fetchOrgs();
          }} 
          initialData={editingOrg}
        />
      )}

      {adminOrg && (
        <OrgAdminCredentialsModal
          org={adminOrg}
          onClose={() => setAdminOrg(null)}
          onSuccess={() => { setAdminOrg(null); fetchOrgs(); }}
        />
      )}
    </div>
  );
}
