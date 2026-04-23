"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, HandCoins, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateOrganizationFinancials, getAdminDepositStats } from "@/lib/actions/deposit";
import { verifyAdminPassword } from "@/lib/actions/user";

export default function ExternalFundsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = (session?.user as any)?.organizationId;
  const adminId = (session?.user as any)?.id;

  const [loading, setLoading] = useState(true);
  const [savingFin, setSavingFin] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [finForm, setFinForm] = useState({
    initialMonthlyCollection: 0,
    initialDelayedFine: 0,
    initialServiceCharge: 0,
    initialBankInterest: 0,
    initialLoanInterest: 0,
    initialNav: 0,
    initialMiscellaneous: 0,
  });

  const [unlockInitial, setUnlockInitial] = useState(false);
  const [unlockPrompt, setUnlockPrompt] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [lifetimeData, setLifetimeData] = useState<any>(null);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await getAdminDepositStats(orgId, "all");
    if (res.success && res.data) {
      setLifetimeData(res.data);
      if (res.data.financials) {
        setFinForm({
          initialMonthlyCollection: res.data.financials.initialMonthlyCollection || 0,
          initialDelayedFine: res.data.financials.initialDelayedFine || 0,
          initialServiceCharge: res.data.financials.initialServiceCharge || 0,
          initialBankInterest: res.data.financials.initialBankInterest || 0,
          initialLoanInterest: res.data.financials.initialLoanInterest || 0,
          initialNav: res.data.financials.initialNav || 0,
          initialMiscellaneous: res.data.financials.initialMiscellaneous || 0,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const handleFinanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('idle');
    setSaveError('');

    if (!orgId) {
      setSaveError('Organization identity missing. Please refresh the page.');
      setSaveStatus('error');
      return;
    }

    setSavingFin(true);
    try {
      // Use server action directly — most reliable path, no HTTP layer issues
      const result = await updateOrganizationFinancials(orgId, finForm, adminId || 'admin');

      if (result.success) {
        setSaveStatus('success');
        setSavingFin(false);
        // Small delay so user can see the success banner, then go to dashboard
        setTimeout(() => {
          window.location.href = `/dashboard?sync=${Date.now()}`;
        }, 1500);
      } else {
        setSavingFin(false);
        setSaveStatus('error');
        setSaveError((result as any).details || (result as any).error || 'Save failed. Check the terminal.');
      }
    } catch (err: any) {
      setSavingFin(false);
      setSaveStatus('error');
      setSaveError(`Exception: ${err.message}`);
    }
  };


  const handleUnlockAttempt = async () => {
    if (!adminId) return;
    const res = await verifyAdminPassword(adminId, unlockPass);
    if (res.success) {
      setUnlockInitial(true);
      setUnlockPrompt(false);
      setUnlockPass("");
    } else {
      alert("Invalid Admin Password! Access Denied.");
    }
  };

  const isLocked = !unlockInitial;

  return (
    <div className="space-y-6">


      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>
      ) : (
        <div className="w-full">
          {isLocked ? (
            <div className="w-full max-w-xl mx-auto bg-slate-900 border border-amber-500/20 rounded-[40px] p-10 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
              <div className="flex justify-center mb-8">
                <ShieldCheck className="w-16 h-16 text-amber-500 opacity-80" />
              </div>
              <h3 className="text-center text-2xl font-black text-white uppercase tracking-widest mb-3">Vault Locked</h3>
              <p className="text-center text-xs text-slate-400 font-bold tracking-widest uppercase mb-10">Administrative Password Required to access external synchronization interfaces.</p>

              <div className="space-y-4 max-w-sm mx-auto">
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={unlockPass}
                  onChange={(e) => setUnlockPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-center tracking-widest text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black shadow-inner"
                />
                <div className="flex gap-2">
                  <button type="button" disabled={!unlockPass} onClick={handleUnlockAttempt} className="w-full py-4 bg-amber-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 transition-colors shadow-lg shadow-amber-500/20">Verify Identity</button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFinanceUpdate} className="w-full bg-slate-900 border border-emerald-500/20 rounded-[40px] p-6 sm:p-10 shadow-2xl animate-in fade-in duration-500">
              <h3 className="text-xl sm:text-2xl font-black text-white mb-6 sm:mb-8 uppercase tracking-widest flex items-center gap-4">
                <HandCoins className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" /> External Funds Config
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-8 sm:mb-10 tracking-wide leading-relaxed">System vault unlocked. These changes will permanently structure the historic initial collections framework globally.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {[
                  { key: 'initialMonthlyCollection', label: 'Monthly Collection', lifetimeKey: 'totalApprovedAmount' },
                  { key: 'initialDelayedFine', label: 'Delayed Fines', lifetimeKey: 'totalDelayedFinePaid' },
                  { key: 'initialServiceCharge', label: 'Service Charges', lifetimeKey: 'totalServiceChargePaid' },
                  { key: 'initialBankInterest', label: 'Bank Interest', lifetimeKey: 'bankInterest' },
                  { key: 'initialLoanInterest', label: 'Loan Interest', lifetimeKey: 'totalLoanInterestPaid' },
                  { key: 'initialNav', label: 'NAV Collection', lifetimeKey: 'navCollection' },
                  { key: 'initialMiscellaneous', label: 'Miscellaneous', lifetimeKey: 'miscellaneous' },
                ].map(f => (
                  <div key={f.key} className="flex flex-col bg-slate-950/40 border border-slate-800/60 p-6 rounded-3xl transition-all hover:bg-slate-950/60 hover:border-emerald-500/30 group">
                    <label className="text-sm font-black text-emerald-500 block">{f.label}</label>
                    <div className="mb-3">
                      <p className="text-xs font-black text-red-500 tracking-[0.1em] truncate">
                        Rs. {lifetimeData?.[f.lifetimeKey]?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="relative group/input">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-600 group-focus-within/input:text-emerald-500 transition-colors">Rs.</span>
                        <input
                          type="number"
                          value={(finForm as any)[f.key] === 0 ? "" : (finForm as any)[f.key]}
                          placeholder="0"
                          onChange={(e) => setFinForm({ ...finForm, [f.key]: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none transition-all font-black text-emerald-400 placeholder-slate-800 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                ))}

              </div>

              {/* Status Banners */}
              {saveStatus === 'success' && (
                <div className="mt-6 flex items-start gap-4 bg-emerald-950/80 border border-emerald-500 p-5 rounded-2xl animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Ledger Committed Successfully</p>
                    <p className="text-xs text-emerald-600 mt-1">Redirecting to dashboard to verify changes...</p>
                  </div>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="mt-6 flex items-start gap-4 bg-red-950/80 border border-red-500 p-5 rounded-2xl animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-red-400 uppercase tracking-widest">Commit Failed</p>
                    <p className="text-xs text-red-600 mt-1 break-all">{saveError}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex pt-6">
                <button
                  type="submit"
                  disabled={savingFin || saveStatus === 'success'}
                  className="w-full py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex justify-center items-center gap-3"
                >
                  {savingFin
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Committing...</>
                    : saveStatus === 'success'
                    ? 'Redirecting to Dashboard...'
                    : 'Commit Ledger'}
                </button>
              </div>
            </form>

          )}
        </div>
      )}
    </div>
  );
}
