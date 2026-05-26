import React from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  PiggyBank,
  Globe,
  Clock,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Users
} from "lucide-react";
import { getOfficialBankName } from "@/lib/utils/export-utils";

interface DepositReportItem {
  memberName: string;
  accountNumber: string;
  date: string;
  type: string;
  amount: number;
  fine: number;
  status: string;
}

interface CompleteDepositReportProps {
  data: {
    orgName: string;
    month: string;
    year: number;
    items: DepositReportItem[];
    timestamp: string;
    bankDetails?: {
      accountNo: string;
      accountName: string;
      bankName: string;
    };
  };
}

const CompleteDepositReport: React.FC<CompleteDepositReportProps> = ({ data }) => {
  const { orgName, month, year, items, timestamp, bankDetails } = data;

  const totalApproved = items
    .filter((i) => i.status === "APPROVED")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalFine = items
    .filter((i) => i.status === "APPROVED")
    .reduce((sum, i) => sum + (i.fine || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" /> Rejected
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-2.5 h-2.5" /> Pending
          </span>
        );
      case "NOT_DEPOSITED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 animate-pulse">
            <HelpCircle className="w-2.5 h-2.5" /> Not Deposited
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
    <div id="deposit-report-section" className="bg-white text-slate-900 p-8 sm:p-12 max-w-[210mm] mx-auto shadow-2xl print:shadow-none print:p-0 font-sans border border-slate-100 print:border-none">
      {/* Header Section */}
      <div className="border-b-4 border-slate-950 pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">{orgName}</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Deposit Audit</p>
            </div>
          </div>
          <div className="pt-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monthly Deposit Report</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5" /> Month: {month} {year}
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
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Deposit Summary Metrics</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Verified Collection</p>
              <p className="text-lg font-black text-emerald-950 mt-0.5">Rs. {totalApproved.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Fines Collected</p>
              <p className="text-lg font-black text-amber-950 mt-0.5">Rs. {totalFine.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Transactions</p>
              <p className="text-lg font-black text-slate-950 mt-0.5">{items.length} Records</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Deposits Table */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950">Detailed Monthly Ledgers</h3>
        </div>
        <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[25%]">Member Name</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[15%]">A/C No.</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[15%]">Date</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[15%]">Type</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest text-right w-[15%]">Amount</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-950 uppercase tracking-widest text-right w-[15%]">Fine</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center w-[20%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-black text-slate-900 truncate">{item.memberName}</td>
                  <td className="px-4 py-3 text-[10px] font-medium text-slate-600 truncate">{item.accountNumber}</td>
                  <td className="px-4 py-3 text-[10px] font-medium text-slate-500">{item.date}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-tight">{(item.type || 'SAVINGS').replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {item.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-950 text-right">Rs. {(item.fine || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
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
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">© Bachat Audit Engine v2.8</p>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Printed: {format(new Date(), "yyyy-MM-dd HH:mm")}</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #deposit-report-section, #deposit-report-section * {
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
          #deposit-report-section {
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

export default CompleteDepositReport;
