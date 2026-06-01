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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { getUsersByOrg } from "@/lib/actions/user";
import { transferMemberCreditDirect } from "@/lib/actions/aggregation";
import { cancelPendingDeposit } from "@/lib/actions/deposit";
import { getNepaliMonthRange, getPreviousNepaliMonth, getNextNepaliMonth, compareNepaliMonths, adToBs } from "@/lib/utils/nepali-date";
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

  // Expanded History Item State
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  // View proof modal state
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [cancelingDepositId, setCancelingDepositId] = useState<string | null>(null);

  const handleCancelDeposit = (depositId: string) => {
    setCancelingDepositId(depositId);
    setShowCancelConfirmModal(true);
  };

  const confirmCancelDeposit = async (depositId: string) => {
    setCancelingId(depositId);
    try {
      const res = await cancelPendingDeposit(depositId);
      if (res.success) {
        toast.success("Deposit cancelled successfully.");
        setShowCancelConfirmModal(false);
        setCancelingDepositId(null);
        onRefresh();
      } else {
        toast.error(res.error || "Failed to cancel deposit.");
      }
    } catch (err) {
      toast.error("Failed to cancel deposit.");
    } finally {
      setCancelingId(null);
    }
  };

  // Unpaid months calculations
  const unpaidMonths = (() => {
    if (!currentNepaliMonth || !orgConfig) return [];
    const initialMonth = orgConfig.financials?.initialOpeningMonth;
    const initialYear = orgConfig.financials?.initialOpeningYear;
    if (!initialMonth || !initialYear) return [];
    
    const startMonthStr = getNextNepaliMonth(`${initialMonth} ${initialYear}`);
    const monthsRange = getNepaliMonthRange(startMonthStr, currentNepaliMonth);
    
    const timeline = memberData?.timeline || [];
    return monthsRange.filter(mStr => {
      const hasDeposit = timeline.some(
        (item: any) => 
          item.type === "DEPOSIT" && 
          item.month === mStr && 
          (item.status === "APPROVED" || item.status === "PENDING")
      );
      return !hasDeposit;
    });
  })();

  const previousUnpaidMonths = unpaidMonths.filter(m => m !== currentNepaliMonth);

  const formatNepaliDate = (dateVal: string | Date) => {
    const bs = adToBs(dateVal);
    if (bs.year === 0) return "N/A";
    return `${bs.monthName} ${bs.day}, ${bs.year}`;
  };

  const formatADDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const getDisplayDetails = (item: any) => {
    const titleLower = item.title?.toLowerCase() || "";
    const detailsLower = item.details?.toLowerCase() || "";
    const depType = item.depositType || "";

    if (depType === "MONTHLY" || titleLower.includes("monthly")) {
      return {
        title: "Monthly Savings",
        subtitle: `${item.month || "Obligation"}`,
        icon: PiggyBank,
        colorClass: "text-emerald-400",
        bgClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        leftBorder: "border-l-emerald-500",
        typeLabel: "Obligation Deposit"
      };
    }

    if (titleLower.includes("transfer") || detailsLower.includes("transfer") || item.advancedPayment < 0) {
      const isSent = item.advancedPayment < 0 || detailsLower.includes("transfer to") || detailsLower.includes("sent");
      
      let summary = item.month || "Credit Transfer";
      if (detailsLower.includes("transferred") && detailsLower.includes("credit to")) {
        const matches = item.details.match(/to\s+([^\(]+)/i);
        if (matches && matches[1]) summary = `To ${matches[1].trim()}`;
      } else if (detailsLower.includes("received") && detailsLower.includes("credit from")) {
        const matches = item.details.match(/from\s+([^\(]+)/i);
        if (matches && matches[1]) summary = `From ${matches[1].trim()}`;
      }

      return {
        title: isSent ? "Sent Credit" : "Received Credit",
        subtitle: summary,
        icon: ArrowRightLeft,
        colorClass: isSent ? "text-rose-400" : "text-indigo-400",
        bgClass: isSent ? "bg-rose-500/10 border-rose-500/20 text-rose-455" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
        leftBorder: isSent ? "border-l-rose-500" : "border-l-indigo-500",
        typeLabel: isSent ? "Transfer (Out)" : "Transfer (In)"
      };
    }

    if (depType === "ADVANCE" || titleLower.includes("advance") || detailsLower.includes("aggregation")) {
      return {
        title: "Credit Added",
        subtitle: item.month || "Advance Funding",
        icon: TrendingUp,
        colorClass: "text-blue-400",
        bgClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        leftBorder: "border-l-blue-500",
        typeLabel: "Cooperative Credit"
      };
    }

    return {
      title: item.title || "Savings Deposit",
      subtitle: item.month || "Adjustment",
      icon: PiggyBank,
      colorClass: "text-slate-400",
      bgClass: "bg-slate-800 border-slate-700 text-slate-400",
      leftBorder: "border-l-slate-700",
      typeLabel: "Adjustment"
    };
  };

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
      {/* Unpaid Month Reminder Banner */}
      {previousUnpaidMonths.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-5 flex items-start gap-4 shadow-lg shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Unpaid Deposits Reminder</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              You have unpaid monthly deposits for the following previous month(s):{" "}
              <span className="font-bold text-amber-400">
                {previousUnpaidMonths.join(", ")}
              </span>.
              Please register deposit requests for these periods first.
            </p>
          </div>
        </div>
      )}

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

        {(depositStatus !== "APPROVED" || previousUnpaidMonths.length > 0) && (
          <div className="mt-6 pt-5 border-t border-slate-800/60 space-y-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {previousUnpaidMonths.length > 0 
                  ? `You have ${previousUnpaidMonths.length} unpaid previous month(s). Required saving: `
                  : "Required saving: "}
                <span className="font-bold text-white">Rs. {orgConfig?.monthlyDepositAmount || 1000}</span>.
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

        {depositStatus === "APPROVED" && previousUnpaidMonths.length === 0 && (
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
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase text-white tracking-widest">Savings History</h3>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Obligations and transfers logs</p>
          </div>
          <div className="relative w-32 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search by month..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-3 py-1.5 text-[9px] font-bold text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
            />
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
            No savings records matching filter
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimeline.map((item: any) => {
              const isExpanded = expandedItemId === item.id;
              const ui = getDisplayDetails(item);
              
              // Status Styling
              let statusColor = "bg-slate-800 text-slate-400 border-slate-700";
              if (item.status === "APPROVED") {
                statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              } else if (item.status === "PENDING") {
                statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              } else if (item.status === "REJECTED") {
                statusColor = "bg-rose-500/10 text-rose-455 border-rose-500/20";
              }

              const DisplayIcon = ui.icon;

              return (
                <div 
                  key={item.id} 
                  className={`bg-slate-950/40 border border-white/5 rounded-[24px] overflow-hidden transition-all duration-300 ${isExpanded ? "ring-2 ring-emerald-500/20 shadow-lg" : "hover:bg-slate-950/60"}`}
                >
                  {/* Row Header */}
                  <div 
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className={`p-5 md:p-6 flex items-start gap-4 cursor-pointer border-l-4 ${ui.leftBorder} transition-colors`}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${ui.bgClass}`}>
                      <DisplayIcon className="w-5 h-5" />
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top Row: Title & Amount */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-tight truncate">
                            {ui.title}
                          </h4>
                          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                            {ui.subtitle}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs md:text-base font-black block ${item.advancedPayment < 0 ? "text-rose-400" : "text-white"}`}>
                            {item.advancedPayment < 0 ? "-" : ""} Rs. {Math.abs(item.amount || item.advancedPayment).toLocaleString()}
                          </span>
                          <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 block">
                            {ui.typeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Dates & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-white/[0.03]">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-xs text-slate-400 font-medium">
                          <span className="font-bold text-slate-300">{formatNepaliDate(item.date)} BS</span>
                          <span className="text-slate-600">•</span>
                          <span>{formatADDate(item.date)} AD</span>
                        </div>

                        <div className="flex items-center gap-3.5">
                          <span className={`text-[8.5px] md:text-[10px] font-black uppercase tracking-widest py-0.5 px-2.5 rounded border text-center ${statusColor}`}>
                            {item.status}
                          </span>
                          <div className="text-slate-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Details Panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-4 border-t border-white/[0.03] bg-black/20 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                              <span className="text-slate-500 block text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Submitted Date</span>
                              <span className="text-xs md:text-sm font-black text-white uppercase">{formatNepaliDate(item.date)}</span>
                            </div>

                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                              <span className="text-slate-500 block text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Cash Paid</span>
                              <span className="text-xs md:text-sm font-black text-white">Rs. {item.amount.toLocaleString()}</span>
                            </div>

                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                              <span className="text-slate-500 block text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Credits Applied</span>
                              <span className={`text-xs md:text-sm font-black ${item.creditUsed > 0 ? "text-blue-400" : "text-slate-500"}`}>
                                Rs. {(item.creditUsed || 0).toLocaleString()}
                              </span>
                            </div>

                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                              <span className="text-slate-500 block text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Net Credit Impact</span>
                              {item.advancedPayment > 0 ? (
                                <span className="text-xs md:text-sm font-black text-emerald-400">+ Rs. {item.advancedPayment.toLocaleString()}</span>
                              ) : item.advancedPayment < 0 ? (
                                <span className="text-xs md:text-sm font-black text-rose-400">- Rs. {Math.abs(item.advancedPayment).toLocaleString()}</span>
                              ) : (
                                <span className="text-xs md:text-sm font-bold text-slate-500">Rs. 0</span>
                              )}
                            </div>
                          </div>

                          {/* Notes/Remarks */}
                          {item.details && (
                            <div className="bg-slate-900/30 border border-white/5 p-4 rounded-2xl">
                              <span className="text-slate-500 block text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1.5">Transaction remarks</span>
                              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">{item.details}</p>
                            </div>
                          )}

                          {/* Cancel submission action */}
                          {item.status === "PENDING" && (
                            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <div>
                                  <span className="text-xs text-rose-400 font-black uppercase tracking-wider block">Cancel Transaction</span>
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 block">Withdraw this pending submission before admin review</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={cancelingId === item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelDeposit(item.id);
                                }}
                                className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-30"
                              >
                                {cancelingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Cancel Submission
                              </button>
                            </div>
                          )}

                          {/* Proof Evidence Preview button */}
                          {item.proof && (
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-emerald-450" />
                                <span className="text-xs text-slate-350 font-black uppercase tracking-wider">Verification Evidence Attached</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveProofUrl(item.proof);
                                }}
                                className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                              >
                                <Eye className="w-4 h-4" />
                                View Evidence
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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

      {/* Proof Viewer Modal */}
      <AnimatePresence>
        {activeProofUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[32px] p-2 overflow-hidden flex flex-col items-center shadow-2xl"
            >
              <button 
                type="button"
                onClick={() => setActiveProofUrl(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-xl text-slate-400 hover:text-white transition-all border border-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
              
              <div className="relative w-full overflow-auto max-h-[80vh] flex items-center justify-center p-4">
                {activeProofUrl.startsWith("data:") || activeProofUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={activeProofUrl} 
                    alt="Transaction Evidence Slip" 
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl border border-white/5 shadow-2xl"
                  />
                ) : (
                  <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <span>Evidence Text Reference:</span>
                    <p className="mt-2 text-white font-mono bg-black/30 p-4 rounded-xl border border-white/5">{activeProofUrl}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] p-8 text-center shadow-[0_0_100px_rgba(239,68,68,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
              
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center mx-auto mb-6 relative">
                <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>

              <h2 className="text-xl font-black text-white mb-3 tracking-tight uppercase">Cancel Transaction?</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                Are you sure you want to cancel this pending deposit? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  disabled={cancelingId !== null}
                  onClick={() => {
                    setShowCancelConfirmModal(false);
                    setCancelingDepositId(null);
                  }}
                  className="py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  disabled={cancelingId !== null}
                  onClick={async () => {
                    if (cancelingDepositId) {
                      await confirmCancelDeposit(cancelingDepositId);
                    }
                  }}
                  className="py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20 disabled:opacity-30 active:scale-95 flex items-center justify-center gap-2"
                >
                  {cancelingId !== null ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Yes, Cancel It</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
