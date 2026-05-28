"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X as CloseIcon, 
  Send, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  ArrowRightLeft,
  User as UserIcon,
  Search
} from "lucide-react";
import { getUsersByOrg } from "@/lib/actions/user";
import { transferAggregationCredit } from "@/lib/actions/aggregation";
import toast from "react-hot-toast";

interface TransferCreditModalProps {
  aggregation: any;
  adminId: string;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferCreditModal({ 
  aggregation, 
  adminId, 
  orgId, 
  onClose, 
  onSuccess 
}: TransferCreditModalProps) {
  const sourceMember = aggregation.memberId;
  const creditAmount = aggregation.amount;
  const maxTransferable = Math.min(creditAmount, sourceMember?.advanceBalance || 0);

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [targetMemberId, setTargetMemberId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [transferAmount, setTransferAmount] = useState(maxTransferable.toString());

  useEffect(() => {
    async function fetchOrgUsers() {
      setLoadingUsers(true);
      try {
        const res = await getUsersByOrg(orgId);
        if (res.success && res.data) {
          // Filter to active members, excluding the source member
          const filtered = res.data.filter((u: any) => 
            u.isActive && u._id !== sourceMember?._id
          );
          setUsers(filtered);
        }
      } catch (err: any) {
        toast.error("Failed to load members list");
      } finally {
        setLoadingUsers(false);
      }
    }
    if (orgId) {
      fetchOrgUsers();
    }
  }, [orgId, sourceMember]);

  const handleTransfer = async () => {
    if (!targetMemberId) {
      setErrorMsg("Please select a destination member");
      return;
    }

    const parsedAmount = parseFloat(transferAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid transfer amount");
      return;
    }

    if (parsedAmount > maxTransferable) {
      setErrorMsg(`Transfer amount cannot exceed the maximum limit of Rs. ${maxTransferable.toLocaleString()}`);
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await transferAggregationCredit({
        aggregationId: aggregation._id,
        targetMemberId,
        adminId,
        amount: parsedAmount
      });

      if (res.success) {
        toast.success(`Successfully transferred Rs. ${parsedAmount.toLocaleString()} of credit`);
        onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to transfer credit");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((u: any) => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col max-h-[90vh] ring-1 ring-white/5"
      >
        {/* Top Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-md font-black text-white uppercase tracking-wider">Transfer Credit</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Asset Re-assignment Terminal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all active:scale-95"
          >
            <CloseIcon className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Transfer Info card */}
          <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Account</span>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Total Available Credit</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-sm font-black text-white">{sourceMember?.name || "Unknown"}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acc: #{sourceMember?.accountNumber || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-emerald-400 tracking-tight">Rs. {creditAmount.toLocaleString()}</div>
                <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Pool: {aggregation.month}</div>
              </div>
            </div>
          </div>

          {/* Custom Amount input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Transfer (Rs.)</label>
              <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">
                Max Limit: Rs. {maxTransferable.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">Rs.</div>
              <input
                type="number"
                max={maxTransferable}
                min={1}
                value={transferAmount}
                onChange={(e) => {
                  setTransferAmount(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Search & Select Target Member */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Destination Member</label>
              {loadingUsers && <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading active members...</span>}
            </div>

            {/* Member Search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search by name or account number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner"
              />
            </div>

            {/* Custom Dropdown/List of Members */}
            <div className="border border-white/5 bg-slate-900/50 rounded-2xl max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {loadingUsers ? (
                <div className="py-8 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Retrieving directory...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u: any) => (
                  <button
                    key={u._id}
                    onClick={() => {
                      setTargetMemberId(u._id);
                      setErrorMsg("");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      targetMemberId === u._id 
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                        : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-7 h-7 bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-white/10"
                        style={{ borderRadius: "10px" }}
                      >
                        {u.profileImage ? (
                          <img 
                            src={u.profileImage} 
                            alt={u.name} 
                            className="w-full h-full object-cover"
                            style={{ borderRadius: "10px" }}
                          />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold">{u.name}</div>
                        <div className="text-[8px] uppercase tracking-widest font-black text-slate-500 mt-0.5">Acc: #{u.accountNumber}</div>
                      </div>
                    </div>
                    {u.advanceBalance > 0 && (
                      <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                        Bal: Rs. {u.advanceBalance.toLocaleString()}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-[9px] text-slate-600 font-black uppercase tracking-widest">
                  No active members found
                </div>
              )}
            </div>
          </div>

          {/* Validation Error Alert */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="px-8 py-6 bg-slate-950 border-t border-white/5 flex flex-col gap-3">
          <button
            onClick={handleTransfer}
            disabled={isSubmitting || !targetMemberId}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Transfer Asset Ownership
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3.5 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all disabled:opacity-20"
          >
            Abort Transfer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
