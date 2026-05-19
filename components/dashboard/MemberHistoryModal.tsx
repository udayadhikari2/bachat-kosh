"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Clock,
  X as CloseIcon,
  PiggyBank,
  HandCoins,
  CheckCircle2,
  Wallet,
  Edit3,
  Loader2,
  Trash2,
  FileClock,
  CreditCard,
  RotateCcw,
  Bell as BellIcon,
  Lock,
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { getMemberActivity, deleteTimelineEvents } from "@/lib/actions/member";
import { updateUserAdvanceBalance } from "@/lib/actions/user";
import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";

interface MemberHistoryModalProps {
  userId: string;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function MemberHistoryModal({ userId, onClose, isAdmin = false }: MemberHistoryModalProps) {
  const { data: session } = useSession();
  const [memberActivity, setMemberActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Advance Pool Edit states
  const [showAdvanceEdit, setShowAdvanceEdit] = useState(false);
  const [newAdvanceBalance, setNewAdvanceBalance] = useState<number | string>(0);
  const [advanceAdminPass, setAdvanceAdminPass] = useState("");
  const [isUpdatingAdvance, setIsUpdatingAdvance] = useState(false);
  const [advanceUpdateError, setAdvanceUpdateError] = useState("");

  // Timeline Deletion states
  const [isTimelineEditMode, setIsTimelineEditMode] = useState(false);
  const [selectedTimelineEvents, setSelectedTimelineEvents] = useState<string[]>([]);
  const [isDeletingTimeline, setIsDeletingTimeline] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true);
      const res = await getMemberActivity(userId);
      if (res.success) {
        setMemberActivity(res.data);
      } else {
        toast.error(res.error || "Failed to fetch activity");
        onClose();
      }
      setLoading(false);
    }
    if (userId) fetchActivity();
  }, [userId]);

  const handleUpdateAdvancePool = async () => {
    if (!advanceAdminPass) {
      setAdvanceUpdateError("Administrator password required");
      return;
    }
    setIsUpdatingAdvance(true);
    setAdvanceUpdateError("");
    
    try {
      const currentUser = session?.user as any;
      const res = await updateUserAdvanceBalance(
        memberActivity.user._id,
        Number(newAdvanceBalance),
        currentUser.id,
        advanceAdminPass
      );
      if (res.success) {
        toast.success("Advance pool updated securely");
        setShowAdvanceEdit(false);
        setAdvanceAdminPass("");
        
        // Refresh member report
        const refresh = await getMemberActivity(userId);
        if (refresh.success) setMemberActivity(refresh.data);
      } else {
        setAdvanceUpdateError(res.error || "Failed to update advance balance");
      }
    } catch (err: any) {
      setAdvanceUpdateError(err.message);
    } finally {
      setIsUpdatingAdvance(false);
    }
  };

  const handleDeleteTimelineEvents = async () => {
    if (!confirm("Are you sure you want to delete the selected timeline events? This action is permanent and cannot be undone.")) return;
    
    setIsDeletingTimeline(true);
    try {
      const eventsToDelete = selectedTimelineEvents.map(id => {
        const event = memberActivity.timeline.find((t: any) => t.id === id);
        return { id: event.id, type: event.type, loanId: event.loanId };
      });
      
      const res = await deleteTimelineEvents(userId, eventsToDelete);
      if (res.success) {
        toast.success(`Successfully deleted ${eventsToDelete.length} events`);
        setSelectedTimelineEvents([]);
        setIsTimelineEditMode(false);
        // Refresh member report
        const refresh = await getMemberActivity(userId);
        if (refresh.success) setMemberActivity(refresh.data);
      } else {
        toast.error(res.error || "Failed to delete timeline events");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsDeletingTimeline(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col max-h-[95vh] ring-1 ring-white/5"
      >
        {/* Ambient Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none" />

        <div className="px-10 pt-10 pb-6 flex items-start justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[28px] p-[1px] shadow-2xl group transition-all duration-700 hover:rotate-6 overflow-hidden">
              <div className="w-full h-full bg-slate-950 rounded-[27px] flex items-center justify-center text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 overflow-hidden relative">
                {memberActivity?.user?.profileImage ? (
                  <Image 
                    src={memberActivity.user.profileImage} 
                    alt={memberActivity.user.name} 
                    fill 
                    sizes="80px"
                    className="object-cover" 
                  />
                ) : (
                  memberActivity?.user?.name?.[0] || "?"
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                {memberActivity?.user?.name || "Loading..."}
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction History</span>
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">#{memberActivity?.user?.accountNumber || "—"}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Member since {memberActivity?.user?.createdAt ? new Date(memberActivity?.user?.createdAt).getFullYear() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl transition-all group active:scale-90"
          >
            <CloseIcon className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="px-10 pb-8 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
           {[
             { label: "Total Deposits", val: `Rs. ${memberActivity?.stats?.totalDeposits?.toLocaleString() || 0}`, icon: PiggyBank, color: "emerald" },
             { label: "Active Loans", val: memberActivity?.stats?.activeLoans || 0, icon: HandCoins, color: "amber" },
             { label: "Loan Repaid", val: `Rs. ${memberActivity?.stats?.totalLoanPaid?.toLocaleString() || 0}`, icon: CheckCircle2, color: "blue" },
             { label: "Advance Pool", val: `Rs. ${memberActivity?.stats?.currentAdvanceBalance?.toLocaleString() || 0}`, icon: Wallet, color: "indigo" },
           ].map((stat, i) => (
             <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-white/10 transition-all relative">
                <div className="flex items-center gap-3 mb-2">
                   <stat.icon className={`w-4 h-4 text-${stat.color}-500/60`} />
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className="text-xl font-black text-white tracking-tight">{stat.val}</div>
                
                {stat.label === "Advance Pool" && isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewAdvanceBalance(memberActivity?.stats?.currentAdvanceBalance || 0);
                      setShowAdvanceEdit(true);
                    }}
                    className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-indigo-400 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                    title="Modify Advance Pool"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
             </div>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-4 custom-scrollbar relative z-10">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Activity Feed</h3>
              {isAdmin && memberActivity?.timeline?.length > 0 && (
                <div className="flex items-center gap-4">
                   {isTimelineEditMode && selectedTimelineEvents.length > 0 && (
                     <button 
                       onClick={handleDeleteTimelineEvents}
                       disabled={isDeletingTimeline}
                       className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                     >
                       {isDeletingTimeline ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                       Delete ({selectedTimelineEvents.length})
                     </button>
                   )}
                   {isTimelineEditMode && (
                     <button
                       onClick={() => {
                         if (selectedTimelineEvents.length === memberActivity.timeline.length) {
                           setSelectedTimelineEvents([]);
                         } else {
                           setSelectedTimelineEvents(memberActivity.timeline.map((t: any) => t.id));
                         }
                       }}
                       className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                     >
                       {selectedTimelineEvents.length === memberActivity?.timeline?.length ? "Deselect All" : "Select All"}
                     </button>
                   )}
                   <button
                     onClick={() => {
                       setIsTimelineEditMode(!isTimelineEditMode);
                       if (isTimelineEditMode) setSelectedTimelineEvents([]);
                     }}
                     className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${isTimelineEditMode ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"}`}
                   >
                     {isTimelineEditMode ? "Cancel Editing" : "Edit Timeline"}
                   </button>
                </div>
              )}
           </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-6">
               <div className="relative">
                  <div className="w-16 h-16 rounded-full border-t-2 border-emerald-500 animate-spin" />
                  <div className="w-16 h-16 rounded-full border-r-2 border-blue-500 animate-spin absolute top-0 left-0 [animation-delay:0.2s]" />
               </div>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Assembling Member Timeline...</p>
            </div>
          ) : memberActivity?.timeline?.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
               <FileClock className="w-12 h-12 text-slate-800" />
               <p className="text-xs text-slate-600 font-bold uppercase tracking-[0.2em]">No activities recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-10">
               {memberActivity?.timeline?.map((item: any, idx: number) => {
                 const bDate = adToBs(new Date(item.date));
                 return (
                   <div key={item.id} className="relative group/item">
                      {/* Vertical Connector */}
                      {idx !== memberActivity.timeline.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-px bg-white/5 group-hover/item:bg-white/10 transition-colors" />
                      )}

                      <div className="flex gap-6 items-center">
                         {/* Checkbox (if editing) */}
                         {isTimelineEditMode && (
                            <div className="relative z-10 flex items-center pr-2">
                              <input 
                                type="checkbox"
                                checked={selectedTimelineEvents.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTimelineEvents(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedTimelineEvents(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="w-5 h-5 rounded border-white/20 bg-slate-900/50 text-rose-500 focus:ring-rose-500/50 focus:ring-offset-slate-950 cursor-pointer transition-colors"
                              />
                            </div>
                         )}

                         {/* Icon & Date Marker */}
                         <div className="relative z-10">
                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-2xl transition-all duration-500 group-hover/item:scale-110 ${
                              item.type === "DEPOSIT" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                              item.type === "LOAN_REQUEST" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                              item.type === "LOAN_PAYMENT" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                              item.type === "NOTIFICATION" ? "bg-slate-500/10 border-slate-500/20 text-slate-400" :
                              "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            }`}>
                               {item.type === "DEPOSIT" ? <PiggyBank className="w-5 h-5" /> :
                                item.type === "LOAN_REQUEST" ? <HandCoins className="w-5 h-5" /> :
                                item.type === "LOAN_PAYMENT" ? <CreditCard className="w-5 h-5" /> :
                                item.type === "NOTIFICATION" ? <BellIcon className="w-5 h-5" /> :
                                <RotateCcw className="w-5 h-5" />}
                            </div>
                         </div>

                         {/* Content Card */}
                         <div className="flex-1 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] hover:bg-white/[0.04] hover:border-white/10 transition-all group-hover/item:translate-x-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                     <h4 className="text-sm font-black text-white tracking-tight uppercase">{item.title}</h4>
                                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter ${
                                       item.status === "APPROVED" || item.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" :
                                       item.status === "PENDING" || item.status === "INFO" ? "bg-amber-500/10 text-amber-500" :
                                       "bg-rose-500/10 text-rose-500"
                                     }`}>{item.status}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                       {bDate.day} {NEPALI_MONTHS[bDate.month-1]} {bDate.year}
                                     </span>
                                     <div className="w-1 h-1 rounded-full bg-slate-800" />
                                     <span className="text-[10px] text-slate-600 font-medium italic">
                                       {new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                     </span>
                                  </div>
                               </div>

                               <div className="text-right">
                                  <div className="text-lg font-black text-white tracking-tighter tabular-nums">
                                     {item.amount > 0 && "Rs. "}
                                     {item.amount?.toLocaleString()}
                                  </div>
                                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                     {item.type === "DEPOSIT" ? `For ${item.month}` : item.details || "Processed"}
                                  </p>
                               </div>
                            </div>

                            {/* Bonus Credit Info */}
                            {(item.advancedPayment > 0 || item.creditUsed > 0) && (
                              <div className="mt-4 pt-4 border-t border-white/5 flex gap-4">
                                 {item.advancedPayment > 0 && (
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">+Rs. {item.advancedPayment} Added to Credit</span>
                                   </div>
                                 )}
                                 {item.creditUsed > 0 && (
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">-Rs. {item.creditUsed} Paid via Credit</span>
                                   </div>
                                 )}
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                 );
               })}

               {/* Modal Footer (Injected into Flow) */}
               <div className="pt-10 pb-6 border-t border-white/5 flex items-center justify-between mt-10">
                  <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Report Generated By</span>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px] text-white font-black uppercase tracking-widest">Hamro Bachat System</span>
                        </div>
                      </div>
                  </div>
                  <button 
                      onClick={onClose}
                      className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all border border-white/5 active:scale-95 shadow-2xl"
                  >
                      Close Report
                  </button>
                </div>
            </div>
          )}
        </div>

        {/* Advance Pool Secure Edit Overlay */}
        <AnimatePresence>
          {showAdvanceEdit && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center p-8"
            >
              <div className="w-full max-w-md space-y-8 text-center bg-slate-950 border border-white/10 p-8 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                 <div className="inline-flex p-6 bg-indigo-500/10 rounded-[32px] border border-indigo-500/20 mb-2">
                    <Wallet className="w-10 h-10 text-indigo-500" />
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Modify Advance Pool</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                      Modifying the advance pool directly requires administrator authorization.
                    </p>
                 </div>

                 <div className="space-y-4 pt-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">New Balance (Rs)</label>
                      <input
                        type="number"
                        value={newAdvanceBalance}
                        onChange={(e) => setNewAdvanceBalance(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all font-mono font-black text-xl text-center"
                      />
                    </div>
                    <div className="relative group mt-4">
                       <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                       <input
                         type="password"
                         placeholder="Administrator Password"
                         value={advanceAdminPass}
                         onChange={(e) => setAdvanceAdminPass(e.target.value)}
                         className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all font-mono tracking-[0.3em]"
                       />
                    </div>

                    {advanceUpdateError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                         <AlertCircle className="w-3.5 h-3.5" />
                         {advanceUpdateError}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 pt-4">
                       <button
                         onClick={handleUpdateAdvancePool}
                         disabled={isUpdatingAdvance}
                         className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                       >
                          {isUpdatingAdvance ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              Authorize Update
                            </>
                          )}
                       </button>
                       <button
                         onClick={() => {
                           setShowAdvanceEdit(false);
                           setAdvanceAdminPass("");
                           setAdvanceUpdateError("");
                         }}
                         disabled={isUpdatingAdvance}
                         className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all"
                       >
                          Cancel Operation
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
