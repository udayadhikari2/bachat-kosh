"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Bell, 
  Send, 
  Users, 
  Shield, 
  User, 
  AlertCircle, 
  MessageSquare,
  Search,
  CheckCircle2,
  Loader2,
  Building2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getAllUsers } from "@/lib/actions/user";
import { getOrganizations } from "@/lib/actions/organization";
import { sendNotification } from "@/lib/actions/notification";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [targetType, setTargetType] = useState<"ROLE" | "SINGLE">("ROLE");
  const [recipientRole, setRecipientRole] = useState<"ADMIN" | "USER" | "ALL">("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [orgFilter, setOrgFilter] = useState("all");
  const [subRoleFilter, setSubRoleFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"INFO" | "WARNING" | "SUCCESS">("INFO");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const searchParams = useSearchParams();
  const recipientParam = searchParams.get("recipient");

  useEffect(() => {
    async function fetchData() {
      const [usersRes, orgsRes] = await Promise.all([
        getAllUsers(),
        getOrganizations()
      ]);
      if (usersRes.success) {
        setUsers(usersRes.data);
        
        // Handle auto-selection from query params
        if (recipientParam) {
          setTargetType("SINGLE");
          setSelectedUserIds(new Set([recipientParam]));
        }
      }
      if (orgsRes.success) setOrganizations(orgsRes.data);
      setLoading(false);
    }
    fetchData();
  }, [recipientParam]);

  // Filtered logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role-based visibility isolation
      if (currentUser?.role === "ADMIN") {
        const isDeveloper = u.role === "DEVELOPER";
        const isInSameOrg = (u.organizationId?._id === currentUser.organizationId || u.organizationId === currentUser.organizationId);
        const isSecondaryAdmin = u.isSecondaryAdmin === true;
        const isMember = u.role === "USER";
        const isSelf = u._id === currentUser.id;

        // Admin Isolation Rules:
        // 1. Cannot message self
        // 2. Can message ALL Developers
        // 3. Can message OWN ORG Members
        // 4. Can message OWN ORG Secondary Admins
        // 5. CANNOT message other Primary Admins (own org or other)
        if (isSelf) return false;
        if (isDeveloper) return true;
        
        if (isInSameOrg && (isMember || isSecondaryAdmin)) return true;
        
        return false;
      }

      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Org filter logic (locked for Admin)
      const matchesOrg = (currentUser?.role === "ADMIN") 
        ? true // Admin's user list is already pre-filtered/restricted
        : (orgFilter === "all" || (u.organizationId?._id === orgFilter || u.organizationId === orgFilter));

      const matchesRole = subRoleFilter === "all" || u.role === subRoleFilter;
      return matchesSearch && matchesOrg && matchesRole;
    });
  }, [users, searchQuery, orgFilter, subRoleFilter, currentUser]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [orgFilter, subRoleFilter, searchQuery, rowsPerPage]);

  function toggleUserSelection(id: string) {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUserIds(newSelected);
  }

  function handleSelectAll() {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u._id)));
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !message) return;
    if (targetType === "SINGLE" && selectedUserIds.size === 0) return;

    setSending(true);
    setStatus(null);

    const result = await sendNotification({
      senderId: currentUser?.id,
      title,
      message,
      type,
      ...(targetType === "SINGLE" ? { recipientIds: Array.from(selectedUserIds) } : { targetRole: recipientRole })
    });

    if (result.success) {
      setStatus({ type: "success", msg: `Notification broadcasted to ${targetType === "SINGLE" ? selectedUserIds.size + " users" : "all " + recipientRole.toLowerCase() + "s" } successfully!` });
      setTitle("");
      setMessage("");
      setSelectedUserIds(new Set());
    } else {
      setStatus({ type: "error", msg: result.error || "Failed to send notification" });
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notification Center" 
        description="Broadcast messages to administrators and members across the system."
        icon={Bell}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Composer Form */}
        <div className="space-y-6">
          <form onSubmit={handleSend} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Send className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Compose Broadcast</h3>
            </div>

            {status && (
              <div className={`p-4 rounded-xl flex items-center gap-3 border ${
                status.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-medium text-sm">{status.msg}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Target Audience</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTargetType("ROLE")}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${targetType === "ROLE" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <Shield className="w-3.5 h-3.5 mr-2" />
                    By Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("SINGLE")}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${targetType === "SINGLE" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <User className="w-3.5 h-3.5 mr-2" />
                    Individually
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Priority Type</label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                >
                  <option value="INFO">Information (Blue)</option>
                  <option value="SUCCESS">Success (Green)</option>
                  <option value="WARNING">Warning (Amber)</option>
                </select>
              </div>
            </div>

            {targetType === "ROLE" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Select Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {["ALL", "ADMIN", "USER"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRecipientRole(role as any)}
                      className={`py-3 rounded-xl border text-xs font-black transition-all ${
                        recipientRole === role 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/5" 
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${currentUser?.role === "ADMIN" ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
                  {currentUser?.role !== "ADMIN" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Organization</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          value={orgFilter}
                          onChange={(e) => setOrgFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none font-bold"
                        >
                          <option value="all">All Organizations</option>
                          {organizations.map(org => (
                            <option key={org._id} value={org._id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Role Type</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={subRoleFilter}
                        onChange={(e) => setSubRoleFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none font-bold"
                      >
                        <option value="all">All Roles</option>
                        <option value="ADMIN">{currentUser?.role === "ADMIN" ? "Secondary Admins" : "Admins Only"}</option>
                        <option value="USER">Members Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recipients ({filteredUsers.length})</label>
                    <button 
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {selectedUserIds.size === filteredUsers.length ? "Deselect All" : "Select All Filtered"}
                    </button>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800/50 backdrop-blur-sm">
                    {loading ? (
                       <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
                    ) : filteredUsers.length > 0 ? (
                      <>
                        <div className="divide-y divide-slate-800/50">
                          {paginatedUsers.map(u => (
                            <div 
                              key={u._id}
                              onClick={() => toggleUserSelection(u._id)}
                              className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all group ${
                                selectedUserIds.has(u._id) ? "bg-emerald-500/5" : "hover:bg-slate-900/50"
                              }`}
                            >
                              <div className={`transition-all duration-300 ${selectedUserIds.has(u._id) ? "text-emerald-400 scale-110" : "text-slate-700 group-hover:text-slate-500"}`}>
                                {selectedUserIds.has(u._id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 transition-transform group-hover:scale-95" />}
                              </div>
                              <div className="flex-1">
                                <div className={`text-sm font-bold transition-colors ${selectedUserIds.has(u._id) ? "text-emerald-400" : "text-slate-200"}`}>
                                  {u.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{u.email}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ring-1 ${
                                  u.role === "ADMIN" ? "bg-purple-500/10 text-purple-400 ring-purple-500/20" : "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                                }`}>
                                   {u.role}
                                </span>
                                <span className="text-[8px] font-bold text-slate-600">
                                   {typeof u.organizationId === 'object' ? u.organizationId.name : u.organizationId}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-600">Rows:</label>
                               <select 
                                 value={rowsPerPage} 
                                 onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                 className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 outline-none"
                               >
                                 {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
                               </select>
                             </div>
                             <span className="text-[10px] font-bold text-slate-500">
                                {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
                             </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(p => p - 1)}
                              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-black text-white px-2">
                               {currentPage} / {totalPages || 1}
                            </span>
                            <button
                              type="button"
                              disabled={currentPage === totalPages || totalPages === 0}
                              onClick={() => setCurrentPage(p => p + 1)}
                              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-16 text-center">
                         <div className="p-4 bg-slate-900/50 rounded-full w-fit mx-auto mb-4 border border-slate-800">
                            <Search className="w-6 h-6 text-slate-700" />
                         </div>
                         <p className="text-sm font-bold text-slate-400">Match protocol failed</p>
                         <p className="text-[10px] text-slate-600 font-medium mt-1">
                           {currentUser?.role === "ADMIN" 
                             ? "You can only message members of your organization and system developers." 
                             : "Try adjusting your filters or search query."}
                         </p>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] px-1 pt-1">
                    {selectedUserIds.size} Target(s) Locked
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Subject</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., System Update, New Policy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Draft your detailed message here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all resize-none font-medium"
                />
              </div>
            </div>

            <button
              disabled={sending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Broadcast Notification
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info / Quick Tips */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
          <h4 className="text-white font-bold mb-6 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-emerald-400" />
            System Broadcast Protocol
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Real-time Delivery</div>
              <p className="text-xs text-slate-500 leading-relaxed">Notifications appear instantly in the sidebar of target users across all active sessions.</p>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Precision Filtering</div>
              <p className="text-xs text-slate-500 leading-relaxed">Filter by Organization and Role to build precise recipient lists without manual entry.</p>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pagination Control</div>
              <p className="text-xs text-slate-500 leading-relaxed">Use the navigation footer when dealing with large organizations to browse member lists efficiently.</p>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Bulk Selection</div>
              <p className="text-xs text-slate-500 leading-relaxed">"Select All" marks all currently filtered users, regardless of visible pagination state.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
