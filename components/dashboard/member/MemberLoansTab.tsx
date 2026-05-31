"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HandCoins, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  UploadCloud,
  FileText,
  ChevronDown,
  Wallet
} from "lucide-react";
import { createLoanRequest, submitLoanRepaymentRequest } from "@/lib/actions/loan";
import toast from "react-hot-toast";
import { calculateLoanStats } from "@/lib/utils/loan-calculations";
import { adToBs } from "@/lib/utils/nepali-date";

interface MemberLoansTabProps {
  memberData: any;
  orgConfig: any;
  onRefresh: () => void;
}

export default function MemberLoansTab({
  memberData,
  orgConfig,
  onRefresh
}: MemberLoansTabProps) {
  const user = memberData?.user || {};
  const formatNepaliDate = (dateVal: string | Date) => {
    const bs = adToBs(dateVal);
    if (bs.year === 0) return "N/A";
    return `${bs.monthName} ${bs.day}, ${bs.year}`;
  };
  const stats = memberData?.stats || { totalDeposits: 0, activeLoans: 0, totalLoanPaid: 0, currentAdvanceBalance: 0 };
  const activities = memberData?.timeline || [];

  const searchParams = useSearchParams();
  const router = useRouter();
  const queryLoanId = searchParams.get("loanId");

  // Filter activities to loans
  const loanRequests = activities.filter((a: any) => a.type === "LOAN_REQUEST");
  const activeLoanTimeline = loanRequests.find((l: any) => l.status === "ACTIVE" || l.status === "OVERDUE");
  
  // Re-calculate basic interest stats virtually for user visibility
  // To avoid complex replication of Mongoose models, we fallback to user timeline details or calculate based on baseline rates
  const hasActiveLoan = stats.activeLoans > 0;

  // Active Loan Details Drawer
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoanId, setDetailsLoanId] = useState<string | null>(null);

  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayLoanId, setRepayLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayProof, setRepayProof] = useState("");
  const [repayRemarks, setRepayRemarks] = useState("");
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

  useEffect(() => {
    if (queryLoanId) {
      // Find if this loan exists
      const rawLoan = (memberData?.loans || []).find(
        (l: any) => l._id.toString() === queryLoanId
      );
      if (rawLoan) {
        setDetailsLoanId(queryLoanId);
        setShowDetailsModal(true);
      }
    }
  }, [queryLoanId, memberData?.loans]);

  const handleCloseRepayModal = () => {
    setShowRepayModal(false);
    setRepayLoanId(null);
    if (queryLoanId) {
      const params = new URLSearchParams(window.location.search);
      params.delete("loanId");
      router.replace(`/dashboard?${params.toString()}`);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsLoanId(null);
    if (queryLoanId) {
      const params = new URLSearchParams(window.location.search);
      params.delete("loanId");
      router.replace(`/dashboard?${params.toString()}`);
    }
  };

  const handleOpenRepayFromDetails = (loanId: string) => {
    setShowDetailsModal(false);
    setDetailsLoanId(null);
    setRepayLoanId(loanId);
    setShowRepayModal(true);
  };

  // Apply Loan Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyAmount, setApplyAmount] = useState("");
  const [applyReason, setApplyReason] = useState("Personal Emergency");
  const [applyRemarks, setApplyRemarks] = useState("");
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  const [activeSegment, setActiveSegment] = useState<"active" | "history">("active");

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(applyAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid loan amount");
      return;
    }
    if (!applyRemarks.trim()) {
      toast.error("Please enter remarks/reason details for the loan");
      return;
    }

    setIsSubmittingApply(true);
    try {
      const res = await createLoanRequest({
        userId: user._id,
        organizationId: user.organizationId,
        principalAmount: amt,
        reason: `${applyReason}: ${applyRemarks}`
      });

      if (res.success) {
        toast.success("Loan application submitted successfully!");
        setShowApplyModal(false);
        onRefresh();
      } else {
        toast.error(res.error || "Failed to submit loan request");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetLoanId = repayLoanId || activeLoanTimeline?.id;
    if (!targetLoanId) {
      toast.error("No active loan found to repay");
      return;
    }

    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid repayment amount");
      return;
    }

    setIsSubmittingRepay(true);
    try {
      // For proof, we submit a dummy placeholder or string URL
      const proofUrl = repayProof || "https://placehold.co/600x400/000000/FFFFFF/png?text=Loan+Repayment+Proof";
      const res = await submitLoanRepaymentRequest({
        loanId: targetLoanId,
        userId: user._id,
        amount: amt,
        proof: proofUrl,
        remarks: repayRemarks.trim() || undefined
      });

      if (res.success) {
        toast.success("Repayment proof submitted. Pending verification!");
        handleCloseRepayModal();
        setRepayAmount("");
        setRepayRemarks("");
        setRepayProof("");
        onRefresh();
      } else {
        toast.error(res.error || "Failed to submit repayment");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  // Filter completed/settled or rejected loans
  const loanHistory = loanRequests.filter((l: any) => l.status === "COMPLETED" || l.status === "REJECTED" || l.status === "DELETED");
  const pendingLoans = loanRequests.filter((l: any) => l.status === "PENDING" || l.status === "APPROVED");
  const activeLoans = loanRequests.filter((l: any) => l.status === "ACTIVE" || l.status === "OVERDUE");

  // Get active repayments (repayments made on active loans)
  const repayments = activities.filter((a: any) => a.type === "LOAN_PAYMENT");

  return (
    <div className="space-y-6">
      {/* Header segments */}
      <div className="flex border-b border-slate-900 px-1">
        <button
          onClick={() => setActiveSegment("active")}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
            activeSegment === "active" 
              ? "border-emerald-500 text-white" 
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Active Loans
        </button>
        <button
          onClick={() => setActiveSegment("history")}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
            activeSegment === "history" 
              ? "border-emerald-500 text-white" 
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Applications & History
        </button>
      </div>

      {activeSegment === "active" ? (
        /* Active Loans Section */
        <div className="space-y-6">
          {activeLoans.length === 0 ? (
            /* Empty state for active loans */
            <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-8 text-center md:backdrop-blur-sm space-y-6">
              <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 mx-auto">
                <HandCoins className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">No Active Credit Obligations</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                  Apply for a cooperative loan or check your historical applications in the next tab.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mx-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Request New Loan
              </button>
            </div>
          ) : (
            /* Display active loans */
            activeLoans.map((loan: any) => {
              const rawLoan = (memberData?.loans || []).find((l: any) => l._id.toString() === loan.id);
              const loanStats = rawLoan ? calculateLoanStats(rawLoan) : null;
              
              const principalPaid = rawLoan?.principalPaid || 0;
              const principalAmount = rawLoan?.principalAmount || loan.amount;
              const percentPaid = principalAmount > 0 ? Math.min(100, Math.max(0, Math.round((principalPaid / principalAmount) * 100))) : 0;
              
              return (
                <div key={loan.id} className="space-y-6">
                  {/* Visual Progress Dashboard */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-[32px] relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cooperative Credit Pool</h4>
                        <h2 className="text-xl font-black text-white mt-1.5 tracking-tight">Rs. {loan.amount.toLocaleString()}</h2>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-2 inline-block font-black uppercase tracking-widest">
                          {loan.status}
                        </span>
                      </div>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
 
                    <div className="mt-8 pt-5 border-t border-slate-850/60 space-y-4">
                      {/* Repayment Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 px-1">
                          <span>Principal Debt Repaid</span>
                          <span>{percentPaid}% Progress</span>
                        </div>
                        <div className="h-2 bg-slate-850 rounded-full overflow-hidden shadow-inner border border-white/5 p-[1px]">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-455 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }} />
                        </div>
                      </div>
 
                      {/* Outstanding Breakdown sub-panel */}
                      {loanStats && (
                        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Outstanding Breakdown</span>
                            <span className="text-xs font-black text-emerald-400">Rs. {(loanStats.outstandingAmount || 0).toLocaleString()}</span>
                          </div>
                          
                          <div className="space-y-2 text-[10px] uppercase font-bold tracking-wide">
                            <div className="flex justify-between text-slate-500">
                              <span>Outstanding Principal</span>
                              <span className="text-slate-200">Rs. {(loanStats.principalOutstanding || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Interest (Base)</span>
                              <span className="text-slate-200">Rs. {(loanStats.unpaidBaseInterest || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Interest (Penalty)</span>
                              <span className={(loanStats.unpaidPenaltyInterest || 0) > 0 ? "text-rose-400" : "text-slate-200"}>
                                Rs. {(loanStats.unpaidPenaltyInterest || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Service/Renewal Charge</span>
                              <span className="text-slate-200">Rs. {((loanStats.unpaidSC || 0) + (loanStats.unpaidRenewal || 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
 
                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Interest Rate</span>
                          <span className="text-white font-black block mt-1">{rawLoan?.interestRate || orgConfig?.interestRate || 12}% per Annum</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Penalty Rate</span>
                          <span className="text-rose-400 font-black block mt-1">{rawLoan?.penaltyRate || orgConfig?.penaltyRate || 20}% Overdue</span>
                        </div>
                      </div>
 
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => {
                            setDetailsLoanId(loan.id);
                            setShowDetailsModal(true);
                          }}
                          className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setRepayLoanId(loan.id);
                            setShowRepayModal(true);
                          }}
                          className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                          Submit Repayment
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Repayment Timeline History on this loan */}
                  <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest mb-6">Repayments timeline</h3>
                    
                    {repayments.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        No repayments submitted yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {repayments.map((pmt: any) => (
                          <div key={pmt.id} className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-white block">Rs. {pmt.amount.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 block">{formatNepaliDate(pmt.date)}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              pmt.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {pmt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Applications & History Section */
        <div className="space-y-6">
          {/* Action button */}
          <button
            onClick={() => setShowApplyModal(true)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Apply for Loan
          </button>

          {/* Pending Applications list */}
          {pendingLoans.length > 0 && (
            <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-4">Pending Requests</h3>
              <div className="space-y-3">
                {pendingLoans.map((l: any) => (
                  <div key={l.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-white">Rs. {l.amount.toLocaleString()}</span>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                          Submitted: {formatNepaliDate(l.date)}
                        </p>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-md">
                        {l.status}
                      </span>
                    </div>
                    {l.details && (
                      <p className="text-[10px] text-slate-400 bg-white/[0.01] border border-white/[0.03] p-2 rounded-xl mt-3 leading-normal">
                        Reason: {l.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Loans archive */}
          <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
            <h3 className="text-xs font-black uppercase text-white tracking-widest mb-6">Historical Loans</h3>
            
            {loanHistory.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                No past loan history found
              </div>
            ) : (
              <div className="space-y-4">
                {loanHistory.map((item: any) => (
                  <div key={item.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-white">Rs. {item.amount.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{formatNepaliDate(item.date)}</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-[9px] text-slate-500 italic mt-1.5">{item.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repay Obligation Modal Drawer */}
      <AnimatePresence>
        {showRepayModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-slate-950 border border-white/10 rounded-[36px] shadow-2xl overflow-hidden relative"
            >
              <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/10">
                <div className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Submit Repayment Proof</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRepayModal}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRepaySubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Repayment Amount (Rs.)</label>
                  <input 
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    required
                    placeholder="Enter payment amount..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proof screenshot url (optional)</label>
                  <input 
                    type="text"
                    value={repayProof}
                    onChange={(e) => setRepayProof(e.target.value)}
                    placeholder="Proof image link/reference..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Notes / Remarks</label>
                  <textarea 
                    value={repayRemarks}
                    onChange={(e) => setRepayRemarks(e.target.value)}
                    placeholder="Reference notes about bank transfer..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50 min-h-[80px]"
                  />
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRepay}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingRepay ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Repayment Proof"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseRepayModal}
                    className="w-full py-3 text-[9px] text-slate-500 hover:text-white font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loan Details Modal Drawer */}
      <AnimatePresence>
        {showDetailsModal && detailsLoanId && (() => {
          const rawLoan = (memberData?.loans || []).find((l: any) => l._id.toString() === detailsLoanId);
          if (!rawLoan) return null;

          const loanStats = calculateLoanStats(rawLoan);

          const activatedDate = rawLoan.activatedAt ? new Date(rawLoan.activatedAt) : new Date(rawLoan.createdAt);
          const dueDate = rawLoan.dueDate ? new Date(rawLoan.dueDate) : new Date();
          const elapsedDays = Math.max(0, Math.ceil((new Date().getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)));
          const totalDays = loanStats?.totalDays || Math.max(1, Math.ceil((dueDate.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          const runningInterestDays = loanStats ? (loanStats.totalDays || 0) : elapsedDays;
          const principalOutstanding = loanStats ? (loanStats.principalOutstanding || 0) : rawLoan.principalAmount;
          const outstandingInterest = loanStats ? ((loanStats.unpaidBaseInterest || 0) + (loanStats.unpaidPenaltyInterest || 0)) : 0;
          const unpaidSC = loanStats ? (loanStats.unpaidSC || 0) : (rawLoan.serviceChargeAmount || 0);
          const unpaidRenewal = loanStats ? (loanStats.unpaidRenewal || 0) : (rawLoan.renewalAmount || 0);
          const balanceAmount = loanStats ? (loanStats.outstandingAmount || 0) : (rawLoan.balanceAmount || 0);

          const loanRepayments = repayments.filter((pmt: any) => pmt.loanId === detailsLoanId || (rawLoan.payments || []).some((rp: any) => rp._id?.toString() === pmt.id));

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[36px] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Loan Details</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">ID: {detailsLoanId}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseDetailsModal}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  {/* Status & Type Info Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Original Loan Principal</span>
                        <h2 className="text-2xl font-black text-white mt-1">Rs. {rawLoan.principalAmount.toLocaleString()}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            rawLoan.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : rawLoan.status === "OVERDUE"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {rawLoan.status}
                          </span>
                          <span className="text-[8.5px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                            {rawLoan.type || "Standard"} Loan
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Remaining Balance</span>
                        <h2 className="text-xl font-black text-emerald-400 mt-1">Rs. {balanceAmount.toLocaleString()}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Loan Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Interest Rate</span>
                      <span className="text-white font-black text-xs block mt-1">{rawLoan.interestRate || 12}% p.a.</span>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Penalty Rate</span>
                      <span className="text-rose-400 font-black text-xs block mt-1">{rawLoan.penaltyRate || 20}% overdue</span>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Activated At</span>
                      <span className="text-white font-black text-xs block mt-1">
                        {rawLoan.activatedAt ? formatNepaliDate(rawLoan.activatedAt) : "Pending"}
                      </span>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Due Date</span>
                      <span className="text-white font-black text-xs block mt-1">
                        {rawLoan.dueDate ? formatNepaliDate(rawLoan.dueDate) : "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Interest Days and Term Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-3xl p-4">
                    <div>
                      <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Interest Running Period</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-black text-white">{runningInterestDays} Days</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Running</span>
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 block">Interest calculation days since activation/renewal.</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Contractual Loan Term</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-black text-white">{totalDays} Days</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Term</span>
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 block">Total contractual term length of current cycle.</span>
                    </div>
                  </div>

                  {/* Financial Breakdown (Separated & Styled) */}
                  <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-5 space-y-4 shadow-inner">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Financial Outstanding Status</h4>
                    
                    <div className="space-y-2.5 bg-black/40 border border-white/5 rounded-2xl p-4 shadow-inner">
                      {/* 1. Principal O/S Row */}
                      <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] px-1 hover:bg-white/[0.01] rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <Wallet className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Principal Outstanding</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Remaining principal debt</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-white font-mono">
                          Rs. {principalOutstanding.toLocaleString()}
                        </span>
                      </div>

                      {/* 2. Interest O/S Row */}
                      <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] px-1 hover:bg-white/[0.01] rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                            <TrendingUp className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Interest Outstanding</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Accumulated interest due</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-white font-mono">
                          Rs. {outstandingInterest.toLocaleString()}
                        </span>
                      </div>

                      {/* 3. Service Charge Row */}
                      <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] px-1 hover:bg-white/[0.01] rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                            <HandCoins className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Service Charge (SC)</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Unpaid administration & service fee</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-white font-mono">
                          Rs. {unpaidSC.toLocaleString()}
                        </span>
                      </div>

                      {/* 4. Renewal Charge Row */}
                      <div className="flex items-center justify-between py-2.5 px-1 hover:bg-white/[0.01] rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                            <Clock className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Renewal Charge (RC)</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Unpaid renewal & extension fee</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-white font-mono">
                          Rs. {unpaidRenewal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {loanStats && ((loanStats.unpaidBaseInterest || 0) > 0 || (loanStats.unpaidPenaltyInterest || 0) > 0) && (
                      <div className="text-[8.5px] text-slate-500 bg-white/[0.02] border border-white/5 rounded-xl p-3 leading-relaxed mt-2">
                        <span className="font-black text-slate-400 block mb-1">INTEREST ACCRUAL DETAILS:</span>
                        Base Interest: Rs. {(loanStats.unpaidBaseInterest || 0).toLocaleString()} (for {loanStats.baseDays} days)<br />
                        Penalty Interest: Rs. {(loanStats.unpaidPenaltyInterest || 0).toLocaleString()} (for {loanStats.exceedDays} days overdue)
                      </div>
                    )}
                  </div>

                  {/* Payment History for this Loan */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Loan Payment Ledger</h4>
                    {loanRepayments.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-slate-800 rounded-2xl text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        No payments found for this loan
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                        {loanRepayments.map((pmt: any) => (
                          <div key={pmt.id} className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-white block">Rs. {pmt.amount.toLocaleString()}</span>
                              <span className="text-[8.5px] text-slate-500 mt-0.5 block">
                                {formatNepaliDate(pmt.date)} {pmt.title ? `• ${pmt.title}` : ""}
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                              pmt.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {pmt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-900 bg-slate-900/10 flex gap-3 shrink-0">
                  {["ACTIVE", "OVERDUE"].includes(rawLoan.status) && (
                    <button
                      type="button"
                      onClick={() => handleOpenRepayFromDetails(rawLoan._id.toString())}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Submit Repayment Request
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseDetailsModal}
                    className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Apply Loan Modal Drawer */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-slate-950 border border-white/10 rounded-[36px] shadow-2xl overflow-hidden relative"
            >
              <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/10">
                <div className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Request Cooperative Loan</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplyLoan} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Request Amount (Rs.)</label>
                  <input 
                    type="number"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                    required
                    placeholder="Enter loan principal amount..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Loan Category / Reason</label>
                  <select
                    value={applyReason}
                    onChange={(e) => setApplyReason(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="Personal Emergency">Personal Emergency</option>
                    <option value="Medical Expenses">Medical Expenses</option>
                    <option value="Education Assistance">Education Assistance</option>
                    <option value="Agriculture & Farming">Agriculture & Farming</option>
                    <option value="Business Expansion">Business Expansion</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Remarks & Details</label>
                  <textarea 
                    value={applyRemarks}
                    onChange={(e) => setApplyRemarks(e.target.value)}
                    required
                    placeholder="Provide details for review committee..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50 min-h-[80px]"
                  />
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingApply}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingApply ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Loan Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="w-full py-3 text-[9px] text-slate-500 hover:text-white font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
