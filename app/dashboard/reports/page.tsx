"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Download,
  TrendingUp,
  Calendar,
  Filter,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Printer,
  Users,
  PiggyBank,
  Wallet,
  X
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { NEPALI_MONTHS, getCurrentNepaliDate, getNepaliYearRange } from "@/lib/utils/nepali-date";
import {
  generateFinancialReport,
  generateDepositReport,
  generateLoanReport,
  generateMemberReport,
  exportFinancialToExcel
} from "@/lib/utils/report-templates";
import { getUsersByOrg } from "@/lib/actions/user";
import { getAdminDepositStats, getDeposits } from "@/lib/actions/deposit";
import { getFinancialHealth, getLoans } from "@/lib/actions/loan";
import { getBankLedger } from "@/lib/actions/bank-ledger";
import CompleteFinancialStatement from "@/components/dashboard/reports/CompleteFinancialStatement";

export default function ReportsPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lifetimeStats, setLifetimeStats] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showStatementPreview, setShowStatementPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const current = getCurrentNepaliDate();
  const [targetMonth, setTargetMonth] = useState(current.monthName);
  const [targetYear, setTargetYear] = useState(current.year);

  const [financialMonth, setFinancialMonth] = useState(current.monthName);
  const [financialYear, setFinancialYear] = useState(current.year);

  useEffect(() => {
    setFinancialMonth(targetMonth);
    setFinancialYear(targetYear);
  }, [targetMonth, targetYear]);

  const orgId = (session?.user as any)?.organizationId;
  const orgName = (session?.user as any)?.organizationName || "Organization";

  const fetchFinancialDataForPeriod = async (month: string, year: number) => {
    if (!orgId) return null;
    const queryMonth = `${month} ${year}`;
    try {
      const [sResult, healthResult, ledgerResult] = await Promise.all([
        getAdminDepositStats(orgId, queryMonth),
        getFinancialHealth(orgId, month, year),
        getBankLedger(orgId, queryMonth)
      ]);
      return {
        stats: sResult.success ? sResult.data : null,
        healthData: healthResult.success ? healthResult.data : null,
        ledgerData: ledgerResult.success ? ledgerResult.data : null
      };
    } catch (error) {
      console.error("[ERROR] fetchFinancialDataForPeriod:", error);
      return null;
    }
  };

  async function fetchData() {
    if (!orgId) return;
    setLoading(true);
    const queryMonth = `${targetMonth} ${targetYear}`;

    try {
      const [uResult, sResult, lifetimeResult, healthResult, ledgerResult] = await Promise.all([
        getUsersByOrg(orgId),
        getAdminDepositStats(orgId, queryMonth),
        getAdminDepositStats(orgId, "all"),
        getFinancialHealth(orgId, targetMonth, targetYear),
        getBankLedger(orgId, queryMonth)
      ]);

      if (uResult.success) setUsers((uResult as any).data);
      if (sResult.success) setStats((sResult as any).data);
      if (lifetimeResult.success) setLifetimeStats((lifetimeResult as any).data);
      if (healthResult.success) setHealthData((healthResult as any).data);
      if (ledgerResult.success) setLedgerData((ledgerResult as any).data);
    } catch (error) {
      console.error("[ERROR] ReportsPage fetchData:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [orgId, targetMonth, targetYear]);

  const handlePrevMonth = () => {
    const mIdx = NEPALI_MONTHS.indexOf(targetMonth);
    let newMonthIdx = mIdx - 1;
    let newYear = targetYear;
    if (newMonthIdx < 0) {
      newMonthIdx = 11;
      newYear -= 1;
    }
    setTargetMonth(NEPALI_MONTHS[newMonthIdx]);
    setTargetYear(newYear);
  };

  const handleNextMonth = () => {
    const mIdx = NEPALI_MONTHS.indexOf(targetMonth);
    let newMonthIdx = mIdx + 1;
    let newYear = targetYear;
    if (newMonthIdx > 11) {
      newMonthIdx = 0;
      newYear += 1;
    }
    setTargetMonth(NEPALI_MONTHS[newMonthIdx]);
    setTargetYear(newYear);
  };

  const revenueRows = [
    { label: "Regular Savings Collection", key: "totalApprovedAmount" },
    { label: "Delayed Fine Collection", key: "totalDelayedFinePaid" },
    { label: "Service & Renewal Fees", key: "totalServiceChargePaid" },
    { label: "Loan Interest Revenue", key: "totalLoanInterestPaid" },
    { label: "Bank Interest Income", key: "bankInterest" },
    { label: "Capital / Nav Collection", key: "navCollection" },
    { label: "Miscellaneous Revenue", key: "miscellaneous" },
  ];

  const reports = [
    {
      id: "financial",
      title: "Complete Financial Statement",
      description: "Full audit of assets, liabilities, NAV analysis, and per-member wealth distribution.",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      action: async (localMonth?: string, localYear?: number) => {
        const m = localMonth || targetMonth;
        const y = localYear || targetYear;
        
        let currentStats = stats;
        let currentLedger = ledgerData;
        let currentHealth = healthData;
        
        if (m !== targetMonth || y !== targetYear) {
          const customData = await fetchFinancialDataForPeriod(m, y);
          if (customData) {
            currentStats = customData.stats;
            currentLedger = customData.ledgerData;
            currentHealth = customData.healthData;
          }
        }

        setPreviewData({
          orgName: currentStats?.officialName || orgName,
          bankDetails: currentStats?.bankDetails,
          targetMonth: m,
          targetYear: y,
          ledgerData: currentLedger,
          stats: currentStats,
          lifetimeStats,
          healthData: currentHealth,
          usersCount: users.filter(u => u.role === 'USER').length || 1,
          generatedAt: new Date()
        });
        setShowStatementPreview(true);
      }
    },
    {
      id: "deposit",
      title: "Monthly Deposit Report",
      description: "Detailed breakdown of all member deposits, collected fines, and service charges.",
      icon: PiggyBank,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      action: async () => {
        const res = await getDeposits({
          organizationId: orgId,
          month: `${targetMonth} ${targetYear}`,
          limit: 1000
        });
        if (res.success) {
          generateDepositReport({
            orgName,
            month: targetMonth,
            year: targetYear,
            items: res.data.map((d: any) => ({
              memberName: d.userId.name,
              accountNumber: d.userId.accountNumber || "N/A",
              amount: d.amount,
              fine: d.delayedFinePaid || 0,
              type: d.type || "SAVINGS",
              date: new Date(d.date).toLocaleDateString(),
              status: d.status
            })),
            timestamp: new Date().toLocaleString()
          });
        }
      }
    },
    {
      id: "loan",
      title: "Loan Portfolio Audit",
      description: "Complete list of active and historical loans with principal and interest balances.",
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      action: async () => {
        const res = await getLoans({ organizationId: orgId, limit: 1000 });
        if (res.success) {
          generateLoanReport({
            orgName,
            items: res.data.map((l: any) => ({
              memberName: l.userId.name,
              accountNumber: l.userId.accountNumber || "N/A",
              principalAmount: l.principalAmount,
              principalOutstanding: l.balanceAmount ?? l.principalAmount,
              interestOutstanding: (l.stats?.unpaidBaseInterest || 0) + (l.stats?.unpaidPenaltyInterest || 0),
              totalPaid: l.totalPaid || 0,
              interestRate: l.interestRate,
              status: l.status,
              activatedAt: l.activatedAt ? new Date(l.activatedAt).toLocaleDateString() : "N/A"
            })),
            timestamp: new Date().toLocaleString()
          });
        }
      }
    },
    {
      id: "member",
      title: "Member Equity Audit",
      description: "Comprehensive standing of all members including lifetime deposits and advance credits.",
      icon: Users,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      action: async () => {
        generateMemberReport({
          orgName,
          items: users.map((u: any) => ({
            name: u.name,
            accountNumber: u.accountNumber || "N/A",
            role: u.role,
            totalDeposited: 0, // In real app, this would be cumulative deposits
            advanceBalance: u.advanceBalance || 0,
            status: u.isActive ? 'ACTIVE' : 'INACTIVE'
          })),
          timestamp: new Date().toLocaleString()
        });
      }
    },
  ];

  const getFormattedReportData = () => {
    if (!previewData) return null;
    return {
      orgName: previewData.orgName,
      bankDetails: previewData.bankDetails,
      targetMonth: previewData.targetMonth,
      targetYear: previewData.targetYear,
      collection: revenueRows.map(row => ({ label: row.label, val: previewData.stats?.[row.key] || 0 })),
      assetTracking: {
        principalRepayment: previewData.stats?.totalLoanRepaid || 0,
        advanceInflow: previewData.stats?.totalAdvancedPayment || 0,
        advanceUsed: previewData.stats?.totalCreditUsed || 0,
        principalLogs: previewData.stats?.principalRepaymentLogs,
        advanceLogs: previewData.stats?.advanceInflowLogs
      },
      expenditure: [
        { label: "Historical Bank Charges", val: previewData.stats?.upto?.bankCharges || 0 },
        { label: "Historical Org Expenditure", val: previewData.stats?.upto?.totalExpenditure || 0 }
      ],
      nav: (previewData.stats?.upto?.grandTotalCollection || 0) + (previewData.healthData?.totalAccruedInterestActive || 0) + (previewData.healthData?.totalOutstandingFeesActive || 0)
        - ((previewData.healthData?.totalAdvancePaidActive || 0) + (previewData.stats?.upto?.bankCharges || 0) + (previewData.stats?.upto?.totalExpenditure || 0)),
      perMemberWealth: Math.ceil(((previewData.stats?.upto?.grandTotalCollection || 0) + (previewData.healthData?.totalAccruedInterestActive || 0) + (previewData.healthData?.totalOutstandingFeesActive || 0)
        - ((previewData.healthData?.totalAdvancePaidActive || 0) + (previewData.stats?.upto?.bankCharges || 0) + (previewData.stats?.upto?.totalExpenditure || 0))) / (previewData.usersCount || 1)),
      totalMembers: previewData.usersCount,
      timestamp: previewData.generatedAt.toLocaleString(),
      ledgerData: {
        ...previewData.ledgerData,
        totalExpenditure: previewData.stats?.totalExpenditure,
        bankCharges: previewData.stats?.bankCharges
      },
      stats: previewData.stats,
      lifetimeStats: previewData.lifetimeStats,
      healthData: previewData.healthData,
      usersCount: previewData.usersCount
    };
  };

  if (loading && !stats) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Accessing Financial Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeader
          title="Audit & Reports"
          description="High-fidelity financial insights and regulatory audit logs for your organization."
          icon={FileText}
        />

        {/* Calendar Controller */}
        <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 text-center min-w-[140px]">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{targetMonth}</p>
            <p className="text-sm font-black text-white">{targetYear}</p>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>



      <div className="bg-slate-900/40 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Audit Library</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Select a template to generate real-time financial documentation</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {reports.map((report, i) => {
            const Icon = report.icon;
            const isGen = generating === report.id;
            return (
              <div key={i} className="px-10 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8 group hover:bg-white/[0.03] transition-all duration-500">
                <div className="flex items-start gap-8">
                  <div className={`p-5 ${report.bg} rounded-[32px] border border-white/5 group-hover:scale-110 transition-all shadow-2xl relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <Icon className={`w-8 h-8 ${report.color}`} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white tracking-tight">{report.title}</h4>
                    <p className="text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">{report.description}</p>
                    
                    {report.id === "financial" && (
                      <div className="flex items-center gap-2 mt-4 bg-white/5 p-1.5 rounded-xl border border-white/5 w-fit">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-2 animate-pulse" />
                        <select
                          value={financialMonth}
                          onChange={(e) => setFinancialMonth(e.target.value)}
                          className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
                        >
                          {NEPALI_MONTHS.map((m) => (
                            <option key={m} value={m} className="bg-slate-900 text-white">
                              {m}
                            </option>
                          ))}
                        </select>
                        <div className="w-[1px] h-4 bg-white/10" />
                        <select
                          value={financialYear}
                          onChange={(e) => setFinancialYear(Number(e.target.value))}
                          className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
                        >
                          {getNepaliYearRange(current.year - 5).map((y) => (
                            <option key={y} value={y} className="bg-slate-900 text-white">
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-6">
                      <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-emerald-500/20">
                        <FileText className="w-3 h-3" /> Audit Ready
                      </span>
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        Format: PDF (A4)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={async () => {
                      setGenerating(report.id);
                      if (report.id === 'financial') {
                        await (report as any).action(financialMonth, financialYear);
                      } else {
                        await report.action();
                      }
                      setGenerating(null);
                    }}
                    disabled={!!generating}
                    className="flex items-center justify-center px-8 py-4 bg-slate-800 hover:bg-emerald-600 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 group/btn border border-white/5 hover:border-emerald-400 disabled:opacity-50 disabled:scale-100"
                  >
                    {isGen ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" />
                    )}
                    {isGen ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={async () => {
                      setGenerating(report.id);
                      if (report.id === 'financial') {
                        await (report as any).action(financialMonth, financialYear);
                      } else {
                        await report.action();
                      }
                      setGenerating(null);
                    }}
                    className="p-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl transition-all"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-10 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-white/5 rounded-[40px] relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left">
            <h3 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase">Automated Board Audit</h3>
            <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
              Enable "Transparency Mode" to automatically dispatch reconciled financial statements to verified board members and auditors at the conclusion of each Nepali month.
            </p>
          </div>
          <button className="px-10 py-5 bg-indigo-600/10 hover:bg-indigo-600 flex items-center text-indigo-400 hover:text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all border border-indigo-500/20 shadow-2xl active:scale-95">
            <ShieldCheck className="w-5 h-5 mr-3" />
            Enable Automation
          </button>
        </div>
      </div>

      {/* ── Financial Statement Preview Modal ────────────────────── */}
      {showStatementPreview && previewData ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 print-modal-container">
          <div className="bg-slate-900 border border-white/10 w-full max-w-5xl max-h-[95vh] rounded-[32px] overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.8)] print-modal-content">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Audit Preview</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Complete Financial Statement • {previewData.targetMonth} {previewData.targetYear}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const reportData = getFormattedReportData();
                    if (reportData) {
                      generateFinancialReport(reportData);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl transition-all border border-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    const reportData = getFormattedReportData();
                    if (reportData) {
                      exportFinancialToExcel(reportData);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  Excel (XLSX)
                </button>
                <button
                  onClick={() => setShowStatementPreview(false)}
                  className="p-2.5 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50 print-modal-body">
              <CompleteFinancialStatement data={previewData} />
            </div>

            <div className="px-8 py-4 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Verify all figures against physical ledgers before official sign-off.</p>
              <button
                onClick={() => setShowStatementPreview(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase rounded-xl transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
