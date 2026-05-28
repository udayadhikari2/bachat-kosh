"use client";

import { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { createLoanRequest, submitLoanRepaymentRequest } from "@/lib/actions/loan";
import toast from "react-hot-toast";

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
  const stats = memberData?.stats || { totalDeposits: 0, activeLoans: 0, totalLoanPaid: 0, currentAdvanceBalance: 0 };
  const activities = memberData?.timeline || [];

  // Filter activities to loans
  const loanRequests = activities.filter((a: any) => a.type === "LOAN_REQUEST");
  const activeLoanTimeline = loanRequests.find((l: any) => l.status === "ACTIVE" || l.status === "OVERDUE");
  
  // Re-calculate basic interest stats virtually for user visibility
  // To avoid complex replication of Mongoose models, we fallback to user timeline details or calculate based on baseline rates
  const hasActiveLoan = stats.activeLoans > 0;

  // Active Loan Details Drawer
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayProof, setRepayProof] = useState("");
  const [repayRemarks, setRepayRemarks] = useState("");
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

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
    if (!activeLoanTimeline) {
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
        loanId: activeLoanTimeline.id,
        userId: user._id,
        amount: amt,
        proof: proofUrl,
        remarks: repayRemarks.trim() || undefined
      });

      if (res.success) {
        toast.success("Repayment proof submitted. Pending verification!");
        setShowRepayModal(false);
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
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-8 text-center backdrop-blur-sm space-y-6">
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
              // Virtual breakdown fallbacks for user timeline (actual calculations handled by admin on settlement)
              const remainingPayable = loan.amount; // fallback
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
                          <span>Virtual Progress</span>
                        </div>
                        <div className="h-2 bg-slate-850 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 w-[20%]" />
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Interest Rate</span>
                          <span className="text-white font-black block mt-1">{orgConfig?.interestRate || 12}% per Annum</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Penalty Rate</span>
                          <span className="text-rose-400 font-black block mt-1">{orgConfig?.penaltyRate || 20}% Overdue</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowRepayModal(true)}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                      >
                        Submit Repayment Request
                      </button>
                    </div>
                  </div>

                  {/* Repayment Timeline History on this loan */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md">
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
                              <span className="text-[9px] text-slate-500 mt-0.5 block">{new Date(pmt.date).toLocaleDateString()}</span>
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
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-4">Pending Requests</h3>
              <div className="space-y-3">
                {pendingLoans.map((l: any) => (
                  <div key={l.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-white">Rs. {l.amount.toLocaleString()}</span>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                          Submitted: {new Date(l.date).toLocaleDateString()}
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
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md">
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
                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{new Date(item.date).toLocaleDateString()}</span>
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
                  onClick={() => setShowRepayModal(false)}
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
                    onClick={() => setShowRepayModal(false)}
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
