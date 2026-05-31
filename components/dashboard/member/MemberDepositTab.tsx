"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PiggyBank, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  UploadCloud, 
  ArrowRightLeft,
  Search,
  User as UserIcon,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { getUsersByOrg } from "@/lib/actions/user";
import { transferMemberCreditDirect } from "@/lib/actions/aggregation";
import toast from "react-hot-toast";

interface MemberDepositTabProps {
  memberData: any;
  orgConfig: any;
  currentNepaliMonth: string;
  onOpenDepositForm: () => void;
  onRefresh: () => void;
}

export default function MemberDepositTab({
  memberData,
  orgConfig,
  currentNepaliMonth,
  onOpenDepositForm,
  onRefresh
}: MemberDepositTabProps) {
  const user = memberData?.user || {};
  const stats = memberData?.stats || { totalDeposits: 0, activeLoans: 0, totalLoanPaid: 0, currentAdvanceBalance: 0 };
  const deposits = (memberData?.timeline || []).filter((item: any) => item.type === "DEPOSIT");

  // Transfer Credit State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferRemarks, setTransferRemarks] = useState("");

  // Confirmation overlay state
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  // Filter history month
  const [historySearch, setHistorySearch] = useState("");

  const currentMonthDeposit = deposits.find((d: any) => d.month === currentNepaliMonth);
  const depositStatus = currentMonthDeposit?.status || "UNPAID";

  useEffect(() => {
    if (showTransferModal && user.organizationId) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await getUsersByOrg(user.organizationId);
          if (res.success && res.data) {
            // Active members, excluding self
            const filtered = res.data.filter((u: any) => u.isActive && u._id !== user._id && u.role === "USER");
            setOrgUsers(filtered);
          }
        } catch {
          toast.error("Failed to load organization members");
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [showTransferModal, user.organizationId, user._id]);

  const selectedTarget = orgUsers.find((u) => u._id === targetMemberId);

  const handleOpenTransfer = () => {
    if (stats.currentAdvanceBalance <= 0) {
      toast.error("You do not have any advance credit balance to transfer");
      return;
    }
    setShowTransferModal(true);
    setTargetMemberId("");
    setTransferAmount("");
    setTransferRemarks("");
    setSearchQuery("");
    setShowConfirmStep(false);
  };

  const handleTransferSubmit = async () => {
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid transfer amount");
      return;
    }
    if (amt > stats.currentAdvanceBalance) {
      toast.error(`Transfer amount exceeds your advance balance of Rs. ${stats.currentAdvanceBalance}`);
      return;
    }
    if (!targetMemberId) {
      toast.error("Please select a destination member");
      return;
    }

    if (!showConfirmStep) {
      setShowConfirmStep(true);
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const res = await transferMemberCreditDirect({
        senderId: user._id,
        targetMemberId,
        amount: amt,
        remarks: transferRemarks.trim() || undefined
      });

      if (res.success) {
        toast.success(`Successfully transferred Rs. ${amt.toLocaleString()} to ${selectedTarget.name}`);
        setShowTransferModal(false);
        onRefresh();
      } else {
        toast.error(res.error || "Transfer failed");
      }
    } catch (e: any) {
      toast.error(e.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const filteredTimeline = deposits.filter((d: any) => 
    !historySearch || 
    d.month?.toLowerCase().includes(historySearch.toLowerCase()) || 
    d.details?.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Month Status Card */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">Deposit Period</h2>
              <h1 className="text-base font-black text-white tracking-tight leading-none mt-1">{currentNepaliMonth}</h1>
            </div>
          </div>

          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
            depositStatus === "APPROVED"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : depositStatus === "PENDING"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : depositStatus === "REJECTED"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}>
            {depositStatus === "UNPAID" ? "UNPAID" : depositStatus}
          </span>
        </div>

        {depositStatus !== "APPROVED" && (
          <div className="mt-6 pt-5 border-t border-slate-800/60 space-y-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Required saving: <span className="font-bold text-white">Rs. {orgConfig?.monthlyDepositAmount || 1000}</span>.
              </span>
            </div>
            <button
              onClick={onOpenDepositForm}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Register Deposit Request
            </button>
          </div>
        )}

        {depositStatus === "APPROVED" && (
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-500/5 px-4 py-3 rounded-2xl border border-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Monthly savings obligation completed for this period.</span>
          </div>
        )}
      </div>

      {/* Advance Credit Transfer Card */}
      <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-950 border border-indigo-500/20 p-5 rounded-[28px] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Credit Transfers</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">Available Credits: Rs. {stats.currentAdvanceBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
          Advanced payments can be transferred directly to other active members. Sent credits are deducted from your balance immediately.
        </p>

        <button
          onClick={handleOpenTransfer}
          disabled={stats.currentAdvanceBalance <= 0}
          className="w-full py-3.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
        >
          Transfer Credit
        </button>
      </div>

      {/* Timeline List of Deposits */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Savings History</h3>
          <div className="relative w-28 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search month"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-2 py-1 text-[8px] font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
            No savings records matching filter
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimeline.map((item: any) => (
              <div key={item.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-white">{item.title}</span>
                    <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{item.month}</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    item.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : item.status === "PENDING"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {item.status}
                  </span>
                </div>
                
                <div className="flex justify-between text-[10px] pt-1.5 border-t border-white/[0.03]">
                  <span className="text-slate-500">Submitted Amount</span>
                  <span className="font-black text-white">Rs. {item.amount.toLocaleString()}</span>
                </div>

                {item.advancedPayment > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Advance Credit Generated</span>
                    <span className="font-bold text-emerald-400">+ Rs. {item.advancedPayment.toLocaleString()}</span>
                  </div>
                )}
                {item.advancedPayment < 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Credit Transferred Out</span>
                    <span className="font-bold text-rose-400">- Rs. {Math.abs(item.advancedPayment).toLocaleString()}</span>
                  </div>
                )}

                {item.creditUsed > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Advance Credits Applied</span>
                    <span className="font-bold text-blue-400">- Rs. {item.creditUsed.toLocaleString()}</span>
                  </div>
                )}

                {item.details && (
                  <p className="text-[9px] text-slate-600 bg-white/[0.01] px-2.5 py-1.5 rounded-lg border border-white/[0.03] mt-1.5 leading-normal">
                    {item.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Transfer Drawer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-slate-950 border border-white/10 rounded-[36px] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/10">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Transfer Credit</h3>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Available credits card */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Your Credit Pool</span>
                  <span className="text-base font-black text-white">Rs. {stats.currentAdvanceBalance.toLocaleString()}</span>
                </div>

                {!showConfirmStep ? (
                  <>
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Transfer Amount (Rs.)</label>
                      <input 
                        type="number"
                        max={stats.currentAdvanceBalance}
                        min={1}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Transaction remarks (Optional)</label>
                      <input 
                        type="text"
                        value={transferRemarks}
                        onChange={(e) => setTransferRemarks(e.target.value)}
                        placeholder="Gift, payment support, etc."
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    {/* Member Directory search */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Destination Member</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input 
                          type="text"
                          placeholder="Search member name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
                        />
                      </div>

                      <div className="bg-slate-900/50 border border-white/5 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {loadingUsers ? (
                          <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Loading Directory...
                          </div>
                        ) : orgUsers.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                          orgUsers
                            .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((u) => (
                              <button
                                key={u._id}
                                onClick={() => setTargetMemberId(u._id)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                                  targetMemberId === u._id 
                                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                                    : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <span>{u.name} (Acc: #{u.accountNumber})</span>
                              </button>
                            ))
                        ) : (
                          <div className="py-6 text-center text-[9px] text-slate-600 font-black uppercase tracking-widest">
                            No active members found
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Confirmation details step */
                  <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-4 text-center">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Confirm Transfer Action</h4>
                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                        Are you sure you want to transfer <span className="font-bold text-white">Rs. {parseFloat(transferAmount).toLocaleString()}</span> from your advance balance directly to <span className="font-bold text-white">{selectedTarget?.name}</span>?
                      </p>
                      <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest mt-3">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-900 flex flex-col gap-2 bg-slate-900/10">
                <button
                  onClick={handleTransferSubmit}
                  disabled={isSubmittingTransfer || (!showConfirmStep && (!targetMemberId || !transferAmount))}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                >
                  {isSubmittingTransfer ? <Loader2 className="w-4 h-4 animate-spin" /> : showConfirmStep ? "Confirm Credit Transfer" : "Continue"}
                </button>
                {showConfirmStep && (
                  <button
                    onClick={() => setShowConfirmStep(false)}
                    className="w-full py-3 text-[9px] text-slate-500 hover:text-white font-black uppercase tracking-widest"
                  >
                    Go Back
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
