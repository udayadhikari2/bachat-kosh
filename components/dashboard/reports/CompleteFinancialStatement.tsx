import React from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
  Info,
  Clock,
  TrendingDown,
  ChevronRight,
  User,
  HandCoins,
  Globe
} from "lucide-react";
import { adToBs } from "@/lib/utils/nepali-date";
import { getOfficialBankName } from "@/lib/utils/export-utils";

interface CompleteFinancialStatementProps {
  data: {
    orgName: string;
    bankDetails: {
      accountNo: string;
      accountName: string;
      bankName: string;
    };
    targetMonth: string;
    targetYear: number;
    ledgerData: any;
    stats: any;
    lifetimeStats: any;
    healthData: any;
    usersCount: number;
    generatedAt: Date;
  };
}

const CompleteFinancialStatement: React.FC<CompleteFinancialStatementProps> = ({ data }) => {
  const {
    orgName,
    bankDetails,
    targetMonth,
    targetYear,
    ledgerData,
    stats,
    lifetimeStats,
    healthData,
    usersCount,
    generatedAt
  } = data;

  const bsDate = adToBs(generatedAt);

  // Monthly Period Metrics
  const monthlyInflow = stats?.grandTotalCollection || 0;
  const monthlyOutflow = (stats?.totalExpenditure || 0) + (stats?.bankCharges || 0);

  // Upto Metrics
  const uptoInflow = stats?.upto?.grandTotalCollection || 0;

  // NAV Metrics
  const totalAssets = [
    stats?.upto?.grandTotalCollection || 0,
    healthData?.totalAccruedInterestActive || 0,
    healthData?.totalOutstandingFeesActive || 0
  ].reduce((a, b) => a + b, 0);

  const totalLiabilities = [
    healthData?.totalAdvancePaidActive || 0,
    stats?.upto?.bankCharges || 0,
    stats?.upto?.totalExpenditure || 0
  ].reduce((a, b) => a + b, 0);

  const nav = totalAssets - totalLiabilities;
  const perMemberWealth = Math.ceil(nav / (usersCount || 1));

  // Revenue Audit Rows
  const revenueRows = [
    { label: "Regular Savings Collection", key: "totalApprovedAmount" },
    { label: "Delayed Fine Collection", key: "totalDelayedFinePaid" },
    { label: "Service & Renewal Fees", key: "totalServiceChargePaid" },
    { label: "Loan Interest Revenue", key: "totalLoanInterestPaid" },
    { label: "Bank Interest Income", key: "bankInterest" },
    { label: "Capital / Nav Collection", key: "navCollection" },
    { label: "Miscellaneous Revenue", key: "miscellaneous" },
  ];

  const calculateSubTotal = (source: any) => {
    return revenueRows.reduce((acc, row) => acc + (source?.[row.key] || 0), 0);
  };

  const monthlyRevSubTotal = calculateSubTotal(stats);
  const prevRevSubTotal = calculateSubTotal(stats.prev);
  const uptoRevSubTotal = calculateSubTotal(stats.upto);
  const lifetimeRevSubTotal = calculateSubTotal(lifetimeStats);

  return (
    <div id="financial-statement-report" className="bg-white text-slate-900 p-8 sm:p-12 max-w-[210mm] mx-auto shadow-2xl print:shadow-none print:p-0 font-sans border border-slate-100 print:border-none">
      {/* Header Section */}
      <div className="border-b-4 border-slate-950 pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">{orgName}</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Financial Audit</p>
            </div>
          </div>
          <div className="pt-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Complete Financial Statement</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5" /> Period: {targetMonth} {targetYear}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <p className="text-[9px] font-black uppercase tracking-widest">Generated On</p>
            </div>
            <p className="text-sm font-black text-slate-950">{format(generatedAt, "PPPP")}</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
              {bsDate.year}-{bsDate.month}-{bsDate.day} BS • {format(generatedAt, "hh:mm:ss a")}
            </p>
          </div>

          {/* Official Bank Details in Header */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Official Bank Channel</p>
            </div>
            <p className="text-[10px] font-black text-slate-950 uppercase">{getOfficialBankName(bankDetails?.bankName)}</p>
            <p className="text-[10px] font-bold text-slate-600">A/C: {bankDetails?.accountNo}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase">{bankDetails?.accountName}</p>
          </div>
        </div>
      </div>

      {/* 1. Executive Summary - Cash Position */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Executive Cash Position ({targetMonth})</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Opening Balance</p>
            <p className="text-base font-black text-slate-950 text-center truncate">Rs. {(ledgerData?.openingBalance || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Inflow (Period)</p>
            </div>
            <p className="text-base font-black text-emerald-900 text-center truncate">Rs. {monthlyInflow.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ArrowDownRight className="w-3 h-3 text-rose-600" />
              <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Outflow (Period)</p>
            </div>
            <p className="text-base font-black text-rose-900 text-center truncate">Rs. {monthlyOutflow.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-slate-950/20">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Closing Balance</p>
            <p className="text-base font-black text-white text-center truncate">Rs. {(ledgerData?.closingBalance || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </section>

      {/* 2. Revenue & Collection Audit */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Revenue & Collection Audit</h3>
        </div>
        <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[25%]">Category</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest text-right w-[18.75%]">Total ({targetMonth.slice(0, 3)})</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right w-[18.75%]">Previous</th>
                <th className="px-4 py-4 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right w-[18.75%]">Upto ({targetMonth.slice(0, 3)})</th>
                <th className="px-4 py-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right w-[18.75%]">Lifetime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenueRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-700 truncate">{row.label}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {(stats[row.key] || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-400 text-right">Rs. {(stats.prev?.[row.key] || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-amber-600/80 text-right">Rs. {(stats.upto?.[row.key] || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-emerald-600 text-right">Rs. {(lifetimeStats[row.key] || 0).toLocaleString()}</td>
                </tr>
              ))}

              <tr className="bg-slate-100/50 border-t border-slate-200">
                <td className="px-4 py-3 text-[10px] font-black text-slate-900 uppercase">Operational Revenue</td>
                <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {monthlyRevSubTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-slate-500 text-right">Rs. {prevRevSubTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-amber-600 text-right">Rs. {uptoRevSubTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-emerald-600 text-right">Rs. {lifetimeRevSubTotal.toLocaleString()}</td>
              </tr>

              <tr className="bg-slate-50/50">
                <td colSpan={5} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Asset Tracking & Credits</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </td>
              </tr>

              <React.Fragment>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-700 truncate">Principal Repayment</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {(stats.totalLoanRepaid || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-400 text-right">Rs. {(stats.prev?.totalLoanRepaid || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-amber-600/80 text-right">Rs. {(stats.upto?.totalLoanRepaid || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-emerald-600 text-right">Rs. {(lifetimeStats.totalLoanRepaid || 0).toLocaleString()}</td>
                </tr>
                {stats.principalRepaymentLogs?.length > 0 && (
                  <tr>
                    <td colSpan={5} className="px-10 py-3 bg-blue-50/30">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-8">
                        {stats.principalRepaymentLogs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between border-b border-blue-100/50 pb-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                <HandCoins className="w-2 h-2 text-blue-600" />
                              </div>
                              <p className="text-[8px] font-bold text-slate-600 truncate">{log.memberName}</p>
                            </div>
                            <p className="text-[8px] font-black text-blue-700 ml-2">Rs. {log.amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>

              <React.Fragment>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-700 truncate">Advanced Credit (Inflow)</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {(stats.totalAdvancedPayment || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-400 text-right">Rs. {(stats.prev?.totalAdvancedPayment || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-amber-600/80 text-right">Rs. {(stats.upto?.totalAdvancedPayment || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-emerald-600 text-right">Rs. {(lifetimeStats.totalAdvancedPayment || 0).toLocaleString()}</td>
                </tr>
                {stats.advanceInflowLogs?.length > 0 && (
                  <tr>
                    <td colSpan={5} className="px-10 py-3 bg-amber-50/30">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-8">
                        {stats.advanceInflowLogs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between border-b border-amber-100/50 pb-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Wallet className="w-2 h-2 text-amber-600" />
                              </div>
                              <p className="text-[8px] font-bold text-slate-600 truncate">{log.memberName}</p>
                            </div>
                            <p className="text-[8px] font-black text-amber-700 ml-2">Rs. {log.amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>

              <tr className="hover:bg-rose-50/30 transition-colors">
                <td className="px-4 py-3 text-[10px] font-bold text-slate-700 truncate">Advance Credit Used</td>
                <td className="px-4 py-3 text-[10px] font-black text-rose-600 text-right">- Rs. {(stats.totalCreditUsed || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-slate-400 text-right">- Rs. {(stats.prev?.totalCreditUsed || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-rose-400 text-right">- Rs. {(stats.upto?.totalCreditUsed || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-[10px] font-black text-rose-500 text-right">- Rs. {(lifetimeStats.totalCreditUsed || 0).toLocaleString()}</td>
              </tr>

              <tr className="bg-blue-600 text-white border-t-2 border-blue-700 shadow-lg print:shadow-none">
                <td className="px-4 py-5 text-[11px] font-black uppercase tracking-tighter">Grand Total Collection</td>
                <td className="px-4 py-5 text-sm font-black text-right">Rs. {monthlyInflow.toLocaleString()}</td>
                <td className="px-4 py-5 text-xs font-black text-right opacity-80">Rs. {(stats.prev?.grandTotalCollection || 0).toLocaleString()}</td>
                <td className="px-4 py-5 text-sm font-black text-right text-amber-200">Rs. {uptoInflow.toLocaleString()}</td>
                <td className="px-4 py-5 text-sm font-black text-right text-emerald-200">Rs. {(lifetimeStats.grandTotalCollection || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div className="bg-blue-50 px-6 py-2 border-t border-blue-100 print:bg-white">
            <p className="text-[7px] font-black text-blue-700 uppercase tracking-widest text-center italic">Institutional Verification: Grand Total = (Operational Revenue + Advanced Credit Inflow) - Credit Used</p>
          </div>
        </div>
      </section>

      {/* 3. Valuation & NAV Analysis */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Valuation & NAV Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Total Institutional Assets</h4>
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Total Cash Collections (Upto)</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {uptoInflow.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Accrued Interest (Receivables)</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {(healthData?.totalAccruedInterestActive || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Outstanding Fees (Receivables)</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {(healthData?.totalOutstandingFeesActive || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-950 rounded-2xl text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">Gross Institutional Assets</span>
                <span className="text-sm font-black">Rs. {totalAssets.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Total Institutional Liabilities</h4>
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Member Advance Credits</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {(healthData?.totalAdvancePaidActive || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Operating Expenditure (Upto)</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {(stats?.upto?.totalExpenditure || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Bank Charges (Upto)</span>
                <span className="text-[10px] font-black text-slate-900">Rs. {(stats?.upto?.bankCharges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-4 bg-rose-600 rounded-2xl text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">Total Liabilities</span>
                <span className="text-sm font-black">Rs. {totalLiabilities.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[32px] relative overflow-hidden text-white border border-white/5 shadow-2xl print:shadow-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px]" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="text-center md:text-left">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Net Asset Value (NAV)</h4>
              <p className="text-4xl font-black tracking-tighter">Rs. {nav.toLocaleString()}</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center md:text-right">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-2">Per Member Wealth</h4>
              <p className="text-4xl font-black tracking-tighter">Rs. {perMemberWealth.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Based on {usersCount} active members</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Audit Notes */}
      <section className="pt-8 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Statement Notes & Disclaimers</h3>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl space-y-3 text-slate-900">
          <p className="text-[10px] leading-relaxed font-medium">
            1. This statement is a point-in-time reconstruction of the organization's financial state as of the end of the selected period.
          </p>
          <p className="text-[10px] leading-relaxed font-medium">
            2. "Historical Cash Collections" include all member deposits, interest, and fees collected up to the reporting date.
          </p>
          <p className="text-[10px] leading-relaxed font-medium">
            3. "Accrued Interest" and "Outstanding Fees" are treated as assets (receivables) as they represent legally binding income generated within this period.
          </p>
          <p className="text-[10px] leading-relaxed font-medium">
            4. Net Asset Value (NAV) represents the total equity of the organization if all assets were liquidated and liabilities settled today.
          </p>
          <p className="text-[10px] leading-relaxed font-bold text-slate-500 italic pt-2 border-t border-slate-200/50 mt-2">
            This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">© Hamro Bachat Audit Engine v2.8</p>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Printed: {format(new Date(), "yyyy-MM-dd HH:mm")}</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #financial-statement-report, #financial-statement-report * {
            visibility: visible !important;
          }
          html, body, #__next, main, [role="dialog"], .print-modal-container, .print-modal-content, .print-modal-body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            width: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #financial-statement-report {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          @page {
            size: A4;
            margin: 15mm 10mm 15mm 10mm;
          }
          .shadow-2xl, .shadow-lg, .shadow-sm, .shadow-xl {
            box-shadow: none !important;
          }
          section, table, tr, tbody, .grid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CompleteFinancialStatement;
