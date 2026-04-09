"use client";

import { useState } from "react";
import { 
  Loader2, 
  X, 
  PiggyBank, 
  Camera, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface SubmitDepositFormProps {
  onClose: () => void;
  currentMonth: string;
  defaultAmount: number;
}

export default function SubmitDepositForm({ 
  onClose, 
  currentMonth,
  defaultAmount 
}: SubmitDepositFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate API call for now since DB is blocked
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
      setTimeout(onClose, 2000);
    }, 1500);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Submission Received!</h2>
          <p className="text-slate-400">Your deposit record has been submitted for verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center">
            <PiggyBank className="w-5 h-5 mr-2 text-emerald-400" />
            Monthly Deposit
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Month</p>
              <p className="text-white font-semibold">{currentMonth}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Default Amount</p>
              <p className="text-emerald-400 font-bold">Rs. {defaultAmount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Amount Paid</label>
              <input
                type="number"
                name="amount"
                defaultValue={defaultAmount}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Transaction Proof (Screenshot)</label>
              <div className="relative group">
                <div className="w-full aspect-video bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center group-hover:border-emerald-500/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 text-slate-600 mb-2 group-hover:text-emerald-500 transition-colors" />
                  <p className="text-sm text-slate-500 font-medium group-hover:text-slate-400">Click to upload screenshot</p>
                  <p className="text-xs text-slate-600 mt-1">PNG, JPG up to 5MB</p>
                </div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start">
            <AlertCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
            <p className="text-xs text-emerald-400 leading-relaxed">
              Ensure the screenshot clearly shows the transaction ID and amount sent to the Laxmi Bank account.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit record"}
          </button>
        </form>
      </div>
    </div>
  );
}
