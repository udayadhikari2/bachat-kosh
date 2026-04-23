"use client";

import { useState } from "react";
import { createOrganization, updateOrganization } from "@/lib/actions/organization";
import { Loader2, X, Building2, Landmark, Wallet, AlertCircle, QrCode, Upload } from "lucide-react";

interface CreateOrganizationFormProps {
  onClose: () => void;
  initialData?: any;
}

export default function CreateOrganizationForm({ onClose, initialData }: CreateOrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrPreview, setQrPreview] = useState<string | null>(initialData?.bankQr || null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = initialData 
      ? await updateOrganization(initialData._id, formData)
      : await createOrganization(formData);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Something went wrong");
    }
    setLoading(false);
  }

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto py-10">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-emerald-400" />
            {initialData ? "Edit Organization" : "Create New Organization"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Organization Name</label>
              <input
                name="name"
                required
                defaultValue={initialData?.name}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                placeholder="e.g. Sahabat Sahakari"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Bank Name</label>
              <div className="relative">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  name="bankName"
                  required
                  defaultValue={initialData?.bankDetails?.bankName}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="Laxmi Bank"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Account Number</label>
              <input
                name="accountNo"
                required
                defaultValue={initialData?.bankDetails?.accountNo}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                placeholder="11020015299"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Account Holder Name</label>
              <input
                name="accountName"
                required
                defaultValue={initialData?.bankDetails?.accountName}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                placeholder="Bibek Adhikari / Sajan Gurung"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center">
              <QrCode className="w-4 h-4 mr-2 text-emerald-400" />
              Bank QR Code (Scan to Pay)
            </label>
            <div className="flex items-center gap-6 p-4 bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
              <div className="w-24 h-24 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {qrPreview ? (
                  <img src={qrPreview} alt="QR Preview" className="w-full h-full object-cover" />
                ) : (
                  <QrCode className="w-8 h-8 text-slate-700" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-700">
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  Upload QR Image
                  <input
                    type="file"
                    name="bankQr"
                    accept="image/*"
                    onChange={handleQrChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-2">Recommended: Square image, PNG or JPG max 2MB.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                Financial Rules & Liquidity
              </h3>
              <div className="flex items-center gap-3 bg-slate-950 p-2 px-3 rounded-xl border border-slate-800">
                <input 
                  type="checkbox" 
                  name="showLiquidityWarning" 
                  id="showLiquidityWarning"
                  defaultChecked={initialData?.config?.showLiquidityWarning}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="showLiquidityWarning" className="text-[10px] font-black text-slate-400 uppercase cursor-pointer">
                  Liquidity Alert
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase">Monthly Deposit</label>
                <input
                  type="number"
                  name="depositAmount"
                  defaultValue={initialData?.config?.monthlyDepositAmount || 1000}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase">Late Fee</label>
                <input
                  type="number"
                  name="lateFee"
                  defaultValue={initialData?.config?.lateFee || 30}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase text-emerald-500">Liquidity Reserve %</label>
                <input
                  type="number"
                  name="liquidityReservePercentage"
                  defaultValue={initialData?.config?.liquidityReservePercentage || 10}
                  step="0.1"
                  className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2 text-emerald-400 font-bold outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase">Interest % (Daily)</label>
                <input
                  type="number"
                  name="interestRate"
                  defaultValue={initialData?.config?.interestRate || 12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase">Penalty %</label>
                <input
                  type="number"
                  name="penaltyRate"
                  defaultValue={initialData?.config?.penaltyRate || 20}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
