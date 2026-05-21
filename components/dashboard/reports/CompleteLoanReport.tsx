import React from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  TrendingUp,
  Globe,
  Clock,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Users,
  Coins
} from "lucide-react";
import { getOfficialBankName } from "@/lib/utils/export-utils";

interface LoanReportItem {
  memberName: string;
  accountNumber: string;
  principalAmount: number;
  interestRate: number;
  status: string;
  principalOutstanding: number;
  interestOutstanding: number;
  totalPaid: number;
  activatedAt: string;
}

interface CompleteLoanReportProps {
  data: {
    orgName: string;
    items: LoanReportItem[];
    timestamp: string;
    bankDetails?: {
      accountNo: string;
      accountName: string;
      bankName: string;
    };
  };
}

const CompleteLoanReport: React.FC<CompleteLoanReportProps> = ({ data }) => {
  const { orgName, items, timestamp, bankDetails } = data;

  const totalPrincipal = items.reduce((sum, i) => sum + (i.principalAmount || 0), 0);
  const totalOutstanding = items.reduce((sum, i) => sum + (i.principalOutstanding || 0), 0);
  const totalInterestOutstanding = items.reduce((sum, i) => sum + (i.interestOutstanding || 0), 0);
  const totalPaid = items.reduce((sum, i) => sum + (i.totalPaid || 0), 0);
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Active
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Settled
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-2.5 h-2.5" /> Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="loan-report-section" className="bg-white text-slate-900 p-8 sm:p-12 max-w-[210mm] mx-auto shadow-2xl print:shadow-none print:p-0 font-sans border border-slate-100 print:border-none">
      {/* Header Section */}
      <div className="border-b-4 border-slate-950 pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">{orgName}</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Loan Portfolio Audit</p>
            </div>
          </div>
          <div className="pt-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Loan Portfolio & Credit Report</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <TrendingUp className="w-3.5 h-3.5" /> Active Audit Record
              </span>
            </div>
          </div>
        </div>

        <div className="text-right space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <p className="text-[9px] font-black uppercase tracking-widest">Report Date</p>
            </div>
            <p className="text-sm font-black text-slate-950">{timestamp}</p>
          </div>

          {bankDetails && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Official Bank Channel</p>
              </div>
              <p className="text-[10px] font-black text-slate-950 uppercase">{getOfficialBankName(bankDetails.bankName)}</p>
              <p className="text-[10px] font-bold text-slate-600">A/C: {bankDetails.accountNo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Portfolio Summary</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Total Disbursed</p>
            <p className="text-sm font-black text-slate-950 text-center truncate">Rs. {totalPrincipal.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
            <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1 text-center">Bal Principal</p>
            <p className="text-sm font-black text-rose-900 text-center truncate">Rs. {totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1 text-center">Accrued Interest</p>
            <p className="text-sm font-black text-amber-900 text-center truncate">Rs. {totalInterestOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1 text-center">Total Paid</p>
            <p className="text-sm font-black text-emerald-900 text-center truncate">Rs. {totalPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center mt-3">
          Based on {activeCount} active loan accounts out of {items.length} total records.
        </p>
      </section>

      {/* Main Loan Table */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Detailed Portfolio Ledger</h3>
        </div>
        <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[20%]">Member Name</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[11%]">A/C No.</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[12%]">Activated</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[8%] text-center">Rate</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest w-[13%] text-right">Principal</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest w-[13%] text-right">Outstanding</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest w-[13%] text-right">Accrued Int</th>
                <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[10%] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-[10px] font-black text-slate-900 truncate">{item.memberName}</td>
                  <td className="px-3 py-3 text-[10px] font-medium text-slate-600 truncate">{item.accountNumber}</td>
                  <td className="px-3 py-3 text-[10px] font-medium text-slate-500">{item.activatedAt || "N/A"}</td>
                  <td className="px-3 py-3 text-[10px] font-black text-slate-700 text-center">{item.interestRate}%</td>
                  <td className="px-3 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {item.principalAmount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {item.principalOutstanding.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {item.interestOutstanding.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-center">{getStatusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Disclaimer Notes */}
      <section className="pt-8 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Statement Notes & Disclaimers</h3>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl text-slate-900">
          <p className="text-[10px] leading-relaxed font-bold text-slate-500 italic">
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
          #loan-report-section, #loan-report-section * {
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
          #loan-report-section {
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

export default CompleteLoanReport;
