"use client";

import { 
  X, User, Calendar, CreditCard, History, Info, 
  ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2, 
  AlertCircle, Clock, ShieldCheck, TrendingUp, HandCoins
} from "lucide-react";
import Image from "next/image";
import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";

interface LoanDetailsModalProps {
  loan: any;
  onClose: () => void;
}

export default function LoanDetailsModal({ loan, onClose }: LoanDetailsModalProps) {
  const stats = loan.stats;
  const activatedDate = loan.activatedAt ? new Date(loan.activatedAt) : null;
  const lastRenewal = loan.renewalHistory?.length > 0 
    ? new Date(loan.renewalHistory[loan.renewalHistory.length - 1].date)
    : null;
  
  const lastEventDate = lastRenewal || activatedDate;
  
  const now = new Date();
  const totalDays = activatedDate 
    ? Math.ceil(Math.abs(now.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const daysSinceLastEvent = lastEventDate
    ? Math.ceil(Math.abs(now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const bsActivated = activatedDate ? adToBs(activatedDate) : null;
  const nepaliActivated = bsActivated ? `${bsActivated.year} ${NEPALI_MONTHS[bsActivated.month - 1]} ${bsActivated.day}` : "N/A";

  const bsLastEvent = lastEventDate ? adToBs(lastEventDate) : null;
  const nepaliLastEvent = bsLastEvent ? `${bsLastEvent.year} ${NEPALI_MONTHS[bsLastEvent.month - 1]} ${bsLastEvent.day}` : "N/A";

  const effectiveDueDate = loan.dueDate ? new Date(loan.dueDate) : (activatedDate ? new Date(activatedDate.getTime() + 180 * 24 * 60 * 60 * 1000) : null);
  const bsDueDate = effectiveDueDate ? adToBs(effectiveDueDate) : null;
  const nepaliDueDate = bsDueDate ? `${bsDueDate.year} ${NEPALI_MONTHS[bsDueDate.month - 1]} ${bsDueDate.day}` : "Maturity Date";

  const formatPaymentType = (type: string) => {
    const types: Record<string, string> = {
      SERVICE_CHARGE: "Service Fee",
      INTEREST: "Interest",
      PENALTY: "Penalty",
      RENEWAL: "Renewal Fee",
      PRINCIPAL: "Principal Payment",
      ADVANCE: "Advance Payment",
      ORGANIZATION: "Organization Deduction"
    };
    return types[type] || type;
  };

  // Group payments with exact same date and note into single events for multi-allocation clarity
  const processedPayments = (loan.payments || []).reduce((acc: any[], p: any) => {
    const pDate = new Date(p.date).getTime();
    const existing = acc.find(item => 
      new Date(item.date).getTime() === pDate && 
      item.proof === p.proof
    );

    if (existing) {
      existing.allocations = [...(existing.allocations || []), { type: p.type, amount: p.amount }];
      existing.amount += p.amount;
    } else {
      acc.push({ ...p, allocations: [{ type: p.type, amount: p.amount }] });
    }
    return acc;
  }, []);

  // Combine segments into a unified timeline
  const timelineEvents = [
    ...(activatedDate ? [{
      date: activatedDate,
      type: "ACTIVATION",
      title: "Loan Disbursed & Activated",
      description: `Principal amount of Rs. ${loan.principalAmount?.toLocaleString()} released.`,
      amount: loan.principalAmount,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10"
    }] : []),
    ...processedPayments.map((p: any) => ({
      date: new Date(p.date),
      type: "PAYMENT",
      title: p.allocations.length > 1 ? "Batch Settlement" : `Payment Received: ${formatPaymentType(p.type)}`,
      description: p.proof ? `Audit Note: ${p.proof}` : (p.allocations.length > 1 ? "Distributed across multiple categories." : "Manual payment settlement record."),
      amount: p.amount,
      allocations: p.allocations,
      icon: ArrowDownRight,
      color: p.allocations.some((a:any) => a.type === 'PRINCIPAL') ? "text-emerald-400" : "text-blue-400",
      bgColor: p.allocations.some((a:any) => a.type === 'PRINCIPAL') ? "bg-emerald-500/10" : "bg-blue-500/10"
    })),
    ...(loan.renewalHistory || []).map((r: any) => ({
      date: new Date(r.date),
      type: "RENEWAL",
      title: `Term Extension (Renewal)`,
      description: `New deadline: ${new Date(r.newDueDate).toLocaleDateString()}. Extension: ${r.extensionDays} days.`,
      amount: r.renewalAmount,
      icon: RefreshCw,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10"
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-500 relative flex flex-col max-h-[94vh]">
      {/* Decorative Glows */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      
      {/* Header */}
      <div className="px-10 pt-10 pb-8 flex items-end justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl shrink-0 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl border border-white/10 flex items-center justify-center shadow-lg shadow-black/20 overflow-hidden relative">
            {loan.userId?.profileImage ? (
              <Image 
                src={loan.userId.profileImage} 
                alt={loan.userId.name} 
                fill 
                sizes="64px"
                className="object-cover" 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center">
                 <User className="w-6 h-6 text-emerald-400" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">{loan.userId?.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{loan.userId?.email}</span>
              <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                 <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Active Member</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-10">
           <div className="text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Current Status</p>
              <div className={`px-4 py-1.5 rounded-xl border font-black text-xs uppercase tracking-tighter ${
                loan.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                loan.status === 'OVERDUE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-800 border-white/5 text-slate-400'
              }`}>
                {loan.status}
              </div>
           </div>
           <button 
             onClick={onClose} 
             className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group active:scale-90 flex items-center justify-center"
           >
             <X className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="p-10 space-y-12">
          
          {/* Main Visual KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPIItem 
              label="Remaining Debt" 
              value={`Rs. ${Math.ceil(stats.outstandingAmount).toLocaleString()}`} 
              sub="Net Outstanding" 
              icon={TrendingUp} 
              theme="emerald" 
              featured 
            />
            <KPIItem 
              label="Principal" 
              value={`Rs. ${Math.ceil(loan.principalAmount || 0).toLocaleString()}`} 
              sub="Disbursed Amount" 
              icon={HandCoins} 
              theme="blue" 
            />
            <KPIItem 
              label="Accrued Interest" 
              value={`Rs. ${Math.ceil(stats.totalInterest).toLocaleString()}`} 
              sub={`Rate: ${loan.interestRate}% P.A.`} 
              icon={ArrowUpRight} 
              theme="amber" 
            />
            <KPIItem 
              label="Total Repaid" 
              value={`Rs. ${Math.ceil(loan.totalPaid || 0).toLocaleString()}`} 
              sub={`${loan.payments?.length || 0} Settlements`} 
              icon={History} 
              theme="indigo" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Lifecycle & Compliance (Lg-5) */}
            <div className="lg:col-span-5 space-y-10">
              
              {/* Critical Dates & Days */}
              <section className="space-y-5">
                <HeaderLabel icon={Clock} text="Loan Lifecycle Timeline" />
                <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                     <Calendar className="w-32 h-32" />
                  </div>
                  
                   <div className="grid grid-cols-2 gap-8 relative z-10">
                    <DateBox label="Initial Activation" date={activatedDate?.toLocaleDateString()} nepali={nepaliActivated} />
                    <DateBox label="Total Tenor (Lifetime)" date={`${totalDays} Days`} nepali="Accumulated" highlight />
                    <DateBox label="Last Renewal / Event" date={lastEventDate?.toLocaleDateString()} nepali={nepaliLastEvent} />
                    <DateBox 
                      label="Current Deadline" 
                      date={effectiveDueDate ? effectiveDueDate.toLocaleDateString() : "Pending Activation"} 
                      nepali={nepaliDueDate} 
                      warning={effectiveDueDate ? new Date() > effectiveDueDate : false} 
                    />
                  </div>
 
                  <div className="pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                     <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Interest Running Status</p>
                        <p className="text-sm font-black text-white">{daysSinceLastEvent} Days <span className="text-slate-500 font-medium">{lastRenewal ? "Since Last Renewal" : "Since Activation"}</span></p>
                     </div>
                     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Clock className="w-5 h-5 text-slate-600" />
                     </div>
                  </div>
                </div>
              </section>

              {/* Charge Status & Audit */}
              <section className="space-y-5">
                 <HeaderLabel icon={ShieldCheck} text="Financial Compliance" />
                 <div className="grid grid-cols-2 gap-4">
                    <StatusCard 
                       label="Service Charge" 
                       status={stats.isServiceChargePaid ? "PAID" : "UNPAID"} 
                       amount={`Rs. ${Math.ceil(loan.serviceChargeAmount || 0).toLocaleString()}`}
                       isPaid={stats.isServiceChargePaid}
                    />
                    <StatusCard 
                       label="Renewal Fees" 
                       status={loan.renewalCount === 0 ? "N/A" : (stats.isRenewalChargePaid ? "PAID" : "UNPAID")} 
                       amount={`Rs. ${Math.ceil(loan.renewalAmount || 0).toLocaleString()}`}
                       isPaid={loan.renewalCount === 0 || stats.isRenewalChargePaid}
                       isNeutral={loan.renewalCount === 0}
                    />
                 </div>
                 
                 <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-4">
                    <DetailRow label="Approved By" value={`${loan.approvedByIds?.length || 0} Board Members`} />
                    <DetailRow label="Verification ID" value={loan.verifiedById ? `USR-${loan.verifiedById.slice(-6)}` : "Pending"} />
                    {loan.bankCharge > 0 && (
                      <DetailRow label="Bank Charge (Expense)" value={`Rs. ${loan.bankCharge.toLocaleString()}`} />
                    )}
                    <DetailRow label="Loan Intent" value={loan.reason} isDescription />
                 </div>
              </section>
            </div>

            {/* Right Column: Unified Ledger (Lg-7) */}
            <div className="lg:col-span-7 space-y-5">
              <HeaderLabel icon={History} text="Unified Audit Ledger" />
              <div className="relative space-y-4 px-2">
                <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-emerald-500/20 via-white/5 to-transparent" />
                
                {timelineEvents.length > 0 ? timelineEvents.map((event, idx) => {
                  const Icon = event.icon;
                  return (
                    <div key={idx} className="relative pl-14 group transition-all duration-300">
                      <div className={`absolute left-0 top-0 w-12 h-12 rounded-[20px] ${event.bgColor} border border-white/10 flex items-center justify-center z-10 group-hover:scale-110 shadow-xl transition-all`}>
                        <Icon className={`w-6 h-6 ${event.color}`} />
                      </div>
                      
                      <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{event.type}</span>
                            <h4 className="text-base font-black text-white tracking-tight mt-0.5">{event.title}</h4>
                          </div>
                          <div className="text-right">
                             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">
                                {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                             </p>
                             {event.amount > 0 && (
                               <div className={`text-lg font-black mt-0.5 ${event.color}`}>
                                 {event.type === 'PAYMENT' ? '-' : '+'} Rs. {Math.ceil(event.amount).toLocaleString()}
                               </div>
                             )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 py-3 px-4 bg-slate-950/50 rounded-xl border border-white/5">
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                              <p className="text-xs text-slate-400 font-medium italic">
                                {event.description}
                              </p>
                           </div>
                           {event.allocations && event.allocations.length > 1 && (
                             <div className="pl-4 border-l border-white/10 space-y-1 mt-1">
                               {event.allocations.map((alloc: any, i: number) => (
                                 <div key={i} className="flex justify-between items-center text-[10px]">
                                   <span className="text-slate-500 font-bold uppercase tracking-widest">{formatPaymentType(alloc.type)}</span>
                                   <span className="text-white font-black">Rs. {Math.ceil(alloc.amount).toLocaleString()}</span>
                                 </div>
                               ))}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[32px]">
                     <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                     <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No activity recorded yet</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="px-10 py-8 border-t border-white/5 bg-slate-950/90 backdrop-blur-2xl shrink-0 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-600" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Administrative Audit View only</span>
         </div>
         <button
           onClick={onClose}
           className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] rounded-[22px] transition-all text-xs shadow-lg shadow-emerald-600/20 active:scale-95"
         >
           Dismiss Details
         </button>
      </div>
    </div>
  );
}

function KPIItem({ label, value, sub, icon: Icon, theme, featured = false }: any) {
  const themes: any = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <div className={`p-8 rounded-[36px] border transition-all hover:scale-[1.02] ${featured ? 'bg-slate-900 shadow-2xl shadow-emerald-500/10 border-white/10 ring-1 ring-white/5' : 'bg-white/[0.02] border-white/5'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${themes[theme]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-2xl font-black text-white tracking-tighter mb-1.5">{value}</p>
      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">{sub}</p>
    </div>
  );
}

function HeaderLabel({ icon: Icon, text }: any) {
  return (
    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
      <div className="w-8 h-[1px] bg-slate-800" />
      <Icon className="w-4 h-4" />
      {text}
    </h3>
  );
}

function DateBox({ label, date, nepali, highlight = false, warning = false }: any) {
  return (
    <div>
      <p className={`text-[9px] font-black uppercase tracking-tighter mb-2 ${highlight ? 'text-emerald-500' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-base font-black ${warning ? 'text-rose-400' : 'text-white'}`}>{date || 'N/A'}</p>
      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{nepali}</p>
    </div>
  );
}

function StatusCard({ label, status, amount, isPaid, isNeutral = false }: any) {
  return (
    <div className={`p-5 rounded-[24px] border transition-all ${
      isNeutral ? 'bg-white/[0.02] border-white/5 opacity-50' :
      isPaid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</p>
        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
           isNeutral ? 'bg-slate-800 text-slate-500' :
           isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          {status}
        </div>
      </div>
      <p className="text-sm font-black text-white">{amount}</p>
    </div>
  );
}

function DetailRow({ label, value, isDescription = false }: any) {
  return (
    <div className={`flex ${isDescription ? 'flex-col gap-2' : 'justify-between items-center'}`}>
      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{label}</span>
      <span className={`text-white font-bold ${isDescription ? 'text-xs text-slate-400 leading-relaxed italic' : 'text-sm font-black'}`}>
         {value}
      </span>
    </div>
  );
}
