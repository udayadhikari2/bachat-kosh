"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getUsersByOrg } from "@/lib/actions/user";
import { 
  HandCoins, AlertCircle, Loader2, User as UserIcon, 
  Search, CheckCircle2, XCircle, Info, History, ShieldCheck,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { createLoanRequest, getUserLoanProfile } from "@/lib/actions/loan";
import { toast } from "react-hot-toast";
import { adToBs, bsToAd, NEPALI_MONTHS, NEPALI_WEEKDAYS, getStartDayOfMonth, getDaysInMonth, getNepaliYearRange } from "@/lib/utils/nepali-date";
import Image from "next/image";

interface LoanRequestFormProps {
  userId: string;
  organizationId: string;
  isAdmin?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LoanRequestForm({ 
  userId: currentUserId, 
  organizationId, 
  isAdmin,
  onSuccess, 
  onCancel 
}: LoanRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState(currentUserId);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [takeServiceCharge, setTakeServiceCharge] = useState(true);
  const [recordOutflow, setRecordOutflow] = useState(true);
  
  const [bsYear, setBsYear] = useState(() => adToBs(new Date()).year);
  const [bsMonth, setBsMonth] = useState(() => adToBs(new Date()).month);
  const [bsDay, setBsDay] = useState(() => adToBs(new Date()).day);

  useEffect(() => {
    if (isAdmin) {
      getUsersByOrg(organizationId).then(res => {
        if (res.success) {
          const memberUsers = res.data.filter((u: any) => u.role === "USER");
          setUsers(memberUsers);
        }
      });
    }
  }, [isAdmin, organizationId]);

  useEffect(() => {
    if (targetUserId) {
      setProfileLoading(true);
      getUserLoanProfile(targetUserId).then(res => {
        if (res.success) {
          setUserProfile(res.data);
        }
        setProfileLoading(false);
      });
    }
  }, [targetUserId]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      principalAmount: 10000,
      reason: "",
      activatedAt: new Date().toISOString().split('T')[0],
    }
  });

  // Keep AD date synced with BS selections when historical
  useEffect(() => {
    if (isHistorical) {
      try {
        // Cap bsDay if it exceeds the max days in current month
        const maxDays = getDaysInMonth(bsYear, bsMonth);
        let actualDay = bsDay;
        if (bsDay > maxDays) {
          actualDay = maxDays;
          setBsDay(maxDays);
        }

        const adDate = bsToAd(bsYear, bsMonth, actualDay);
        // Correct timezone offset manually before ISO extraction or just use local formatting
        const y = adDate.getFullYear();
        const m = String(adDate.getMonth() + 1).padStart(2, '0');
        const d = String(adDate.getDate()).padStart(2, '0');
        setValue("activatedAt", `${y}-${m}-${d}`);
      } catch (err) {
        // Fallback for an invalid date like 32nd of a 30 day month
      }
    }
  }, [bsYear, bsMonth, bsDay, isHistorical, setValue]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await createLoanRequest({
        userId: targetUserId,
        organizationId,
        principalAmount: Math.ceil(Number(data.principalAmount)),

        reason: data.reason,
        adminRequesterId: isAdmin ? currentUserId : undefined,
        activatedAt: isHistorical ? data.activatedAt : undefined,
        takeServiceCharge: isHistorical ? takeServiceCharge : true,
        recordOutflow: isHistorical ? recordOutflow : true,
      });

      if (res.success) {
        toast.success(isHistorical ? "Historical loan added automatically!" : "Loan request submitted successfully!");
        onSuccess();
      } else {
        toast.error(res.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-lg shadow-2xl ring-1 ring-white/10 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full"></div>
      
      <div className="flex items-center gap-5 mb-8 relative z-10">
        <div className="p-4 bg-emerald-500/20 rounded-3xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <HandCoins className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Loan Initiation</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            Professional Finance Management <ShieldCheck className="w-3 h-3" />
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
        {isAdmin && (
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
              Beneficiary Member
            </label>
            
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text"
                placeholder="Search member by name or account..."
                value={searchTerm}
                onFocus={() => setShowUserList(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-[20px] pl-12 pr-5 py-4 text-sm text-white font-bold outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />

              {/* Advanced Dropdown */}
              {showUserList && (
                <div className="absolute top-full left-0 w-full mt-3 bg-slate-900 border border-slate-800 rounded-[24px] shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto backdrop-blur-2xl ring-1 ring-white/5">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          setTargetUserId(u._id);
                          setSearchTerm(u.name);
                          setShowUserList(false);
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-emerald-500/10 transition-colors border-b border-slate-800/50 last:border-0 group/item"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-800 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative shadow-lg">
                            {u.profileImage ? (
                              <Image src={u.profileImage} alt={u.name} fill sizes="36px" className="object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400">{u.name[0]}</span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-white group-hover/item:text-emerald-400 transition-colors">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{u.accountNumber || 'Pending A/C'}</p>
                          </div>
                        </div>
                        <CheckCircle2 className={`w-4 h-4 ${targetUserId === u._id ? 'text-emerald-500' : 'text-slate-800 group-hover/item:text-emerald-800'}`} />
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <XCircle className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No regular members match your query</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {showUserList && <div className="fixed inset-0 z-40" onClick={() => setShowUserList(false)} />}
          </div>
        )}

        {isAdmin && targetUserId && (
          <div className="space-y-4 pt-4 border-t border-slate-800 border-dashed animate-in fade-in slide-in-from-top-4">
            <div className={`p-5 border rounded-2xl transition-all ${isHistorical ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className={`text-xs font-black uppercase tracking-widest ${isHistorical ? 'text-amber-500' : 'text-slate-400'}`}>Historical Record Mode</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Bypass approvals and manually set an old activation date.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isHistorical} onChange={(e) => setIsHistorical(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {isHistorical && (
                <div className="flex items-center justify-between py-3 border-t border-amber-500/10 mb-2">
                  <div>
                    <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest">Apply Service Charge</p>
                    <p className="text-[8px] text-slate-600 font-bold">Standard institutional fee for this loan principal.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={takeServiceCharge} onChange={(e) => setTakeServiceCharge(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {isHistorical && (
                <div className="flex items-center justify-between py-3 border-t border-amber-500/10 mb-2">
                  <div>
                    <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest">Record as Bank Outflow</p>
                    <p className="text-[8px] text-slate-600 font-bold">Record this principal as a new cash disbursement today.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={recordOutflow} onChange={(e) => setRecordOutflow(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {isHistorical && (() => {
                const startDay = getStartDayOfMonth(bsYear, bsMonth);
                const daysInMonth = getDaysInMonth(bsYear, bsMonth);
                
                return (
                  <div className="mt-4 pt-4 border-t border-amber-500/10 animate-in slide-in-from-top-2">
                    
                    <div className="flex flex-col items-center sm:items-start gap-4">
                      {/* BS Calendar UI */}
                      <div className="bg-slate-950/80 border border-amber-500/20 rounded-[20px] p-4 shadow-xl shadow-amber-500/5 w-full max-w-[260px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <button type="button" onClick={() => { if(bsMonth===1){setBsMonth(12);setBsYear(y=>y-1)}else{setBsMonth(m=>m-1)} }} className="p-1 hover:bg-white/10 rounded-lg transition-colors active:scale-95"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                          <div className="flex items-center">
                            <select value={bsMonth} onChange={e => setBsMonth(Number(e.target.value))} className="bg-transparent font-black text-amber-500 outline-none cursor-pointer text-xs text-right appearance-none pr-1 focus:text-white transition-colors">
                              {NEPALI_MONTHS.map((m, i) => <option key={i+1} value={i+1} className="bg-slate-900 text-amber-500">{m}</option>)}
                            </select>
                            <select value={bsYear} onChange={e => setBsYear(Number(e.target.value))} className="bg-transparent font-black text-amber-500/70 outline-none cursor-pointer text-xs text-left appearance-none focus:text-white transition-colors">
                              {getNepaliYearRange(adToBs(new Date()).year - 10).map((y: number) => <option key={y} value={y} className="bg-slate-900 text-amber-500/70">{y}</option>)}
                            </select>
                          </div>
                          <button type="button" onClick={() => { if(bsMonth===12){setBsMonth(1);setBsYear(y=>y+1)}else{setBsMonth(m=>m+1)} }} className="p-1 hover:bg-white/10 rounded-lg transition-colors active:scale-95"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center relative z-10">
                          {NEPALI_WEEKDAYS.map(wd => (
                            <div key={wd} className="text-[8px] font-black uppercase text-slate-500">{wd}</div>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center relative z-10">
                          {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                          ))}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isSelected = day === bsDay;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setBsDay(day)}
                                className={`aspect-square rounded-lg text-[11px] font-bold flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.15] z-10' 
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* AD Display */}
                      <div className="flex flex-col justify-center w-full max-w-[260px]">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2 flex items-center gap-2">
                          Mapped AD Date <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        </label>
                        <input 
                          type="date"
                          {...register("activatedAt")}
                          readOnly
                          className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-3 py-3 text-xs text-amber-500/70 font-bold outline-none cursor-not-allowed opacity-80 [&::-webkit-calendar-picker-indicator]:opacity-20 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Member Preview Card */}
        {targetUserId && (
          <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[28px] relative overflow-hidden ring-1 ring-white/5 animate-in fade-in slide-in-from-top-4">
            {profileLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            ) : userProfile && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl border border-emerald-500/20 p-1 relative shadow-2xl">
                      <div className="w-full h-full rounded-[14px] overflow-hidden relative bg-slate-800">
                        {userProfile.user.profileImage ? (
                          <Image 
                            src={userProfile.user.profileImage} 
                            alt={userProfile.user.name} 
                            fill 
                            sizes="48px"
                            className="object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-emerald-500/50" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Selected Principal</p>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{userProfile.user.name}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                     <p className="text-[9px] font-black text-emerald-500 uppercase">A/C: {userProfile.user.accountNumber || 'N/A'}</p>
                  </div>
                </div>

                {/* Loan Context */}
                <div className="pt-4 border-t border-slate-800/50">
                  {userProfile.activeLoan ? (
                    <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <History className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-amber-500 font-black uppercase mb-1">Active Loan Detected</p>
                        <p className="text-xs text-slate-300 font-bold">
                          Current Outstanding: <span className="text-white">Rs. {userProfile.activeLoan.principalAmount.toLocaleString()}</span>
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase font-black">Status: {userProfile.activeLoan.status}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="text-[10px] font-black uppercase">Credit Eligibility: OK (No active loans)</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
              Loan Amount (Principal)
            </label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600 group-focus-within:text-emerald-500 transition-colors">Rs.</span>
              <input
                {...register("principalAmount", { 
                  required: "Amount is required", 
                  min: { value: 1000, message: "Minimum Rs. 1,000" } 
                })}
                type="number"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-[24px] pl-16 pr-6 py-5 text-2xl font-black text-white placeholder:text-slate-800 focus:border-emerald-500/50 transition-all outline-none"
                placeholder="0.00"
              />
            </div>
            {errors.principalAmount && (
              <p className="text-rose-500 text-[11px] font-bold mt-3 px-2 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.principalAmount.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 flex justify-between">
              Purpose Statement
              <span className="text-[9px] text-slate-600 font-black">MIN 10 CHARS</span>
            </label>
            <textarea
              {...register("reason", { required: "Reason is required", minLength: 10 })}
              rows={3}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-[24px] px-6 py-5 text-sm font-bold text-white focus:border-emerald-500/50 transition-all outline-none resize-none placeholder:text-slate-800"
              placeholder="Provide a detailed justification for the credit request..."
            />
            {errors.reason && (
              <p className="text-rose-500 text-[11px] font-bold mt-3 px-2 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.reason.message as string}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || profileLoading}
            className="group py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                Initiate Request 
                <Info className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/5"
          >
            Abort
          </button>
        </div>
      </form>
    </div>
  );
}
