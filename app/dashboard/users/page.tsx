"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Mail, 
  Key, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Power, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Building2,
  Send,
  Bell
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { getUsersByOrg, getAllUsers, toggleUserStatus, deleteUser, updateUserAdvanceBalance } from "@/lib/actions/user";
import { getOrganizations } from "@/lib/actions/organization";
import { getMemberActivity, deleteTimelineEvents } from "@/lib/actions/member";
import AddUserForm from "@/components/dashboard/AddUserForm";
import MemberProfileView from "@/components/dashboard/MemberProfileView";
import MemberHistoryModal from "@/components/dashboard/MemberHistoryModal";
import Image from "next/image";
import ImportUserModal from "@/components/dashboard/ImportUserModal";
import { exportToCSV, exportToXLSX, formatUserDataForExport } from "@/lib/utils/export-utils";
import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import { toast } from "react-hot-toast";
import { 
  PiggyBank, 
  HandCoins, 
  CheckCircle2, 
  Wallet, 
  Clock, 
  FileClock, 
  CreditCard, 
  RotateCcw, 
  Bell as BellIcon, 
  X as CloseIcon,
  Eye,
  Edit3,
  Lock,
  AlertCircle
} from "lucide-react";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection-First Filters
  const [roleFilter, setRoleFilter] = useState("USER");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  // Timeline & Report state
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const user = session?.user as any;
  const orgId = user?.organizationId;

  async function fetchUsers() {
    setLoading(true);
    let result;
    if (user?.role === "DEVELOPER") {
      result = await getAllUsers();
      const orgsResult = await getOrganizations();
      if (orgsResult.success) setOrganizations(orgsResult.data);
    } else {
      result = await getUsersByOrg(orgId || "");
    }
    
    if (result?.success) {
      setUsers(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (session) fetchUsers();
  }, [session, orgId]);

  // Is any filter active?
  const isFilterActive = useMemo(() => {
    return searchQuery !== "" || roleFilter !== "" || statusFilter !== "" || orgFilter !== "";
  }, [searchQuery, roleFilter, statusFilter, orgFilter]);

  // Filtering logic
  const filteredUsers = useMemo(() => {
    if (!isFilterActive) return [];

    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u: any) => 
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.accountNumber && u.accountNumber.toLowerCase().includes(q))
      );
    }

    if (roleFilter && roleFilter !== "all") {
      result = result.filter((u: any) => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((u: any) => u.isActive === isActive);
    }

    if (orgFilter && orgFilter !== "all") {
      result = result.filter((u: any) => u.organizationId?._id === orgFilter || u.organizationId === orgFilter);
    }

    return result;
  }, [users, searchQuery, roleFilter, statusFilter, orgFilter, isFilterActive]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, orgFilter, rowsPerPage]);

  const handleToggleStatus = async (targetUser: any) => {
    // No confirmation needed for a toggle if the UI is clear
    const result = await toggleUserStatus(targetUser._id, targetUser.isActive);
    if (result.success) {
      toast.success(`Member ${targetUser.isActive ? "deactivated" : "activated"} successfully`);
      fetchUsers();
    } else {
      toast.error(result.error || "Failed to update status");
    }
  };

  const handleOpenMemberReport = async (userId: string) => {
    setReportUserId(userId);
    setShowReport(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    const result = await deleteUser(id);
    if (result.success) {
      toast.success("User deleted successfully");
      fetchUsers();
    } else {
      toast.error(result.error || "Failed to delete user");
    }
  };

  // handleUpdateAdvancePool and handleDeleteTimelineEvents removed (moved to MemberHistoryModal)

  const handleExport = (type: 'csv' | 'xlsx') => {
    const dataToExport = formatUserDataForExport(filteredUsers);
    const fileName = `Users_Export_${new Date().toISOString().split('T')[0]}`;
    if (type === 'csv') exportToCSV(dataToExport, fileName);
    else exportToXLSX(dataToExport, fileName);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users & Members" 
        description="Manage system administrators and organization members. Control access and roles."
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                console.log("Import button clicked");
                setShowImportModal(true);
              }}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all font-semibold border border-slate-700 active:scale-95 text-xs uppercase tracking-widest"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
              Import Members
            </button>
            <button 
              onClick={() => {
                setEditingUser(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 text-xs uppercase tracking-widest"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New User
            </button>
          </div>
        }
      />

      {showImportModal && (
        <ImportUserModal 
          organizationId={orgId || ""}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => fetchUsers()}
        />
      )}

      <div className="flex flex-col space-y-4">
        {/* Search and Export Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                CSV
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                onClick={() => handleExport('xlsx')}
                className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                XLSX
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-emerald-500" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer hover:text-emerald-400 transition-colors uppercase tracking-widest"
            >
              <option value="" className="bg-slate-900">Select Role</option>
              <option value="all" className="bg-slate-900">All Roles</option>
              <option value="DEVELOPER" className="bg-slate-900">Developers</option>
              <option value="ADMIN" className="bg-slate-900">Admins</option>
              <option value="USER" className="bg-slate-900">Members</option>
            </select>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer hover:text-emerald-400 transition-colors uppercase tracking-widest"
          >
            <option value="" className="bg-slate-900">Select Status</option>
            <option value="all" className="bg-slate-900">All Status</option>
            <option value="active" className="bg-slate-900">Active Only</option>
            <option value="disabled" className="bg-slate-900">Disabled Only</option>
          </select>

          {user?.role === "DEVELOPER" && organizations.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-800" />
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <select 
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer hover:text-emerald-400 transition-colors max-w-[180px] uppercase tracking-widest"
                >
                  <option value="" className="bg-slate-900">Select Organization</option>
                  <option value="all" className="bg-slate-900">All Organizations</option>
                  {organizations.map((org: any) => (
                    <option key={org._id} value={org._id} className="bg-slate-900">{org.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <div>
            <h2 className="text-xl font-bold text-white">System Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Global registry of all verified system participants.</p>
          </div>
          {isFilterActive && (
             <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black ring-1 ring-emerald-500/20">
               {filteredUsers.length} Results
             </span>
          )}
        </div>

        {loading ? (
          <div className="p-24 flex justify-center">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
               <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Synchronizing Records...</p>
            </div>
          </div>
        ) : !isFilterActive ? (
          <div className="py-32 text-center">
            <div className="inline-flex p-10 bg-slate-950/50 rounded-[50px] mb-8 shadow-inner shadow-emerald-500/5 ring-1 ring-white/5 border border-slate-800/50">
              <MousePointer2 className="w-16 h-16 text-slate-800 animate-bounce" />
            </div>
            <h4 className="text-xl font-black text-white mb-3 uppercase tracking-wider">Browsing Protocol Locked</h4>
            <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
              To browse the system directory, please explicitly select an **Organization**, **Role**, or **Status** filter from the console above.
            </p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800 bg-slate-950/30">
                    <th className="px-8 py-5">Profile Entity</th>
                    <th className="px-8 py-5">Accounting Ref</th>
                    <th className="px-8 py-5">Access Rank</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedUsers.map((item: any) => (
                    <tr key={item._id} className="group hover:bg-slate-800/20 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-black shadow-xl group-hover:scale-105 transition-transform overflow-hidden relative">
                            {item.profileImage ? (
                              <Image 
                                src={item.profileImage} 
                                alt={item.name} 
                                fill 
                                sizes="48px"
                                className="object-cover" 
                              />
                            ) : (
                              item.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white leading-none flex items-center gap-2 text-base">
                              {item.name}
                            </div>
                            <div className="flex items-center text-xs text-slate-500 mt-2 font-bold tracking-tight">
                              <Mail className="w-3.5 h-3.5 mr-2 opacity-50" />
                              {item.email}
                            </div>
                            {user?.role === "DEVELOPER" && item.organizationId && (
                              <div className="text-[10px] text-emerald-500/60 font-black mt-1.5 uppercase tracking-widest flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" />
                                {typeof item.organizationId === 'object' ? item.organizationId.name : 'Org Link Active'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm">
                        <div className="text-slate-200 font-mono font-black tracking-widest text-base">
                          {item.accountNumber || "—"}
                        </div>
                        <div className="text-[10px] text-slate-600 font-black uppercase mt-1 tracking-widest">
                          {item.committeeRole || "General Member"}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            item.role === "ADMIN" 
                              ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/5" 
                              : item.role === "DEVELOPER"
                              ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/5"
                              : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
                          }`}>
                            {item.role === "ADMIN" && <ShieldCheck className="w-3.5 h-3.5 mr-2" />}
                            {item.role}
                          </span>
                          {item.isLoanApprover && (
                            <span className="bg-amber-500/10 text-amber-400 text-[8px] font-black px-3 py-1.5 rounded-full ring-1 ring-amber-500/20 uppercase tracking-widest">Approver</span>
                          )}
                          {item.isSecondaryAdmin && (
                            <span className="bg-indigo-500/10 text-indigo-400 text-[8px] font-black px-3 py-1.5 rounded-full ring-1 ring-indigo-500/20 uppercase tracking-widest">Sec. Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <button
                            onClick={() => item.role !== "DEVELOPER" && handleToggleStatus(item)}
                            disabled={item.role === "DEVELOPER"}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              item.isActive ? 'bg-emerald-600' : 'bg-slate-700'
                            } ${item.role === "DEVELOPER" ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                item.isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setViewingUser(item);
                              setShowViewModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          
                          <button
                            onClick={() => handleOpenMemberReport(item._id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg border border-blue-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                            title="Transaction History"
                          >
                            <FileClock className="w-3.5 h-3.5" />
                            History
                          </button>

                          <Link
                            href={`/dashboard/notifications?recipient=${item._id}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg border border-emerald-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                            title="Send Notification"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Notify
                          </Link>

                          {user?.role === "DEVELOPER" && item.role !== "DEVELOPER" && (
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                              title="Delete (Dev Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-8 py-6 bg-slate-950/50 border-t border-slate-800 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Page Size</label>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                  >
                    {[5, 10, 20, 50, 100].map(v => <option key={v} value={v}>{v} ENTRIES</option>)}
                  </select>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Users className="w-3.5 h-3.5 opacity-30" />
                   INDEX {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredUsers.length)} / {filteredUsers.length} DATA_NODES
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:border-slate-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-2.5 flex items-center gap-3 font-mono shadow-inner">
                   <span className="text-sm font-black text-emerald-400">{currentPage}</span>
                   <span className="text-xs font-bold text-slate-700">OF</span>
                   <span className="text-xs font-black text-slate-500">{totalPages || 1}</span>
                </div>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:border-slate-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-32 text-center">
            <div className="inline-flex p-10 bg-slate-950/50 rounded-[50px] mb-8 ring-1 ring-white/5 border border-slate-800">
              <Search className="w-16 h-16 text-slate-800" />
            </div>
            <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Query Result Negative</h4>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">No records matched the current search criteria. Try broadening your selection filters.</p>
          </div>
        )}
      </div>

      {showModal && (
        <AddUserForm 
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
          }} 
          fixedOrgId={orgId}
          organizations={organizations}
          users={users}
          isDeveloperMode={user?.role === "DEVELOPER"}
          initialData={editingUser}
        />
      )}

      {showViewModal && viewingUser && (
        <MemberProfileView
          member={viewingUser}
          onClose={() => {
            setShowViewModal(false);
            setViewingUser(null);
          }}
          onEdit={() => {
            setEditingUser(viewingUser);
            setShowViewModal(false);
            setViewingUser(null);
            setShowModal(true);
          }}
        />
      )}



      {/* Member History Modal */}
      <AnimatePresence>
        {showReport && reportUserId && (
          <MemberHistoryModal
            userId={reportUserId}
            onClose={() => {
              setShowReport(false);
              setReportUserId(null);
            }}
            isAdmin={user?.role === "ADMIN" || user?.role === "DEVELOPER"}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
