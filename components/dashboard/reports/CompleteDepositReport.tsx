import React from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  PiggyBank,
  Globe,
  Clock,
  Info,
  Users,
  User
} from "lucide-react";
import { getOfficialBankName } from "@/lib/utils/export-utils";

interface DepositReportItem {
  memberName: string;
  accountNumber: string;
  profileImage?: string | null;
  date: string;
  type: string;
  amount: number;
  fine: number;
  status: string;
  rejectionReason?: string | null;
}

interface CompleteDepositReportProps {
  data: {
    orgName: string;
    month: string;
    year: number;
    items: DepositReportItem[];
    rejectedItems?: DepositReportItem[];
    notDepositedMembers?: {
      memberName: string;
      accountNumber: string;
      profileImage?: string | null;
    }[];
    timestamp: string;
    bankDetails?: {
      accountNo: string;
      accountName: string;
      bankName: string;
    };
  };
}

const sortByName = <T extends { memberName: string }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.memberName.localeCompare(b.memberName));

const CompleteDepositReport: React.FC<CompleteDepositReportProps> = ({ data }) => {
  const {
    orgName,
    month,
    year,
    items,
    rejectedItems = [],
    notDepositedMembers = [],
    timestamp,
    bankDetails
  } = data;

  // Sort all three lists alphabetically
  const sortedItems = sortByName(items);
  const sortedRejected = sortByName(rejectedItems);
  const sortedUnpaid = sortByName(notDepositedMembers);

  const totalApproved = sortedItems.reduce((sum, i) => sum + i.amount, 0);
  const totalFine = sortedItems.reduce((sum, i) => sum + (i.fine || 0), 0);

  const AvatarCell = ({
    profileImage,
    name,
    size = "w-6 h-6"
  }: {
    profileImage?: string | null;
    name: string;
    size?: string;
  }) => (
    <div
      className={`inline-flex ${size} items-center justify-center shrink-0 overflow-hidden align-middle bg-slate-100 border border-slate-200`}
      style={{ borderRadius: "10px" }}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt={name}
          className="w-full h-full object-cover"
          style={{ borderRadius: "10px" }}
        />
      ) : (
        <User className="w-3 h-3 text-slate-500" />
      )}
    </div>
  );

  return (
    <div id="deposit-report-section" className="bg-white text-slate-900 p-6 sm:p-8 max-w-[210mm] mx-auto shadow-2xl print:shadow-none print:p-0 font-sans border border-slate-100 print:border-none">
      {/* Header Section */}
      <div className="border-b-2 border-slate-950 pb-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-950">{orgName}</h1>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Deposit Audit</p>
            </div>
          </div>
          <div className="pt-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Monthly Deposit Report</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              <Calendar className="w-3 h-3" /> Month: {month} {year}
            </span>
          </div>
        </div>

        <div className="text-right space-y-2 md:space-y-3">
          <div className="space-y-0.5">
            <div className="flex items-center justify-end gap-1 text-slate-400">
              <Clock className="w-3 h-3" />
              <p className="text-[7.5px] font-black uppercase tracking-widest">Report Date</p>
            </div>
            <p className="text-xs font-black text-slate-950">{timestamp}</p>
          </div>

          {bankDetails && (
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-right">
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <Globe className="w-2.5 h-2.5 text-slate-400" />
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Official Bank Channel</p>
              </div>
              <p className="text-[8.5px] font-black text-slate-950 uppercase">{getOfficialBankName(bankDetails.bankName)}</p>
              <p className="text-[8.5px] font-bold text-slate-600">A/C: {bankDetails.accountNo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">Deposit Summary Metrics</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[7.5px] font-black text-emerald-700 uppercase tracking-widest">Verified Collection</p>
              <p className="text-sm font-black text-emerald-950 mt-0.5">Rs. {totalApproved.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <PiggyBank className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[7.5px] font-black text-amber-700 uppercase tracking-widest">Fines Collected</p>
              <p className="text-sm font-black text-amber-950 mt-0.5">Rs. {totalFine.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Deposited Members</p>
              <p className="text-sm font-black text-slate-950 mt-0.5">{sortedItems.length} Records</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Approved Deposits Table */}
      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">1. Approved Deposits</h3>
        </div>
        <div className="border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50/70 border-b border-emerald-100">
                <th className="px-2 py-2 text-[8px] font-black text-emerald-800 uppercase tracking-widest w-10 text-center"></th>
                <th className="px-2 py-2 text-[8px] font-black text-emerald-800 uppercase tracking-widest">Member</th>
                <th className="px-2 py-2 text-[8px] font-black text-emerald-800 uppercase tracking-widest w-24">Date</th>
                <th className="px-2 py-2 text-[8px] font-black text-emerald-800 uppercase tracking-widest w-16">Type</th>
                <th className="px-2 py-2 text-[8px] font-black text-emerald-950 uppercase tracking-widest text-right w-24">Amount</th>
                <th className="px-2 py-2 text-[8px] font-black text-emerald-950 uppercase tracking-widest text-right w-20">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map((item, i) => (
                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-2 py-1.5 text-center align-middle">
                    <AvatarCell profileImage={item.profileImage} name={item.memberName} />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <p className="text-[9px] font-black text-slate-900 leading-none">{item.memberName}</p>
                    <p className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">{item.accountNumber}</p>
                  </td>
                  <td className="px-2 py-1.5 text-[9px] font-medium text-slate-500 align-middle">{item.date}</td>
                  <td className="px-2 py-1.5 text-[9px] font-black text-slate-600 uppercase tracking-tight align-middle">{(item.type || 'SAVINGS').replace('_', ' ')}</td>
                  <td className="px-2 py-1.5 text-[9px] font-black text-slate-950 text-right align-middle">Rs. {item.amount.toLocaleString('en-IN')}</td>
                  <td className="px-2 py-1.5 text-[9px] font-black text-slate-950 text-right align-middle">Rs. {(item.fine || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rejected and Unpaid Side-by-Side Section */}
      <section className="grid grid-cols-2 gap-4 mb-4">
        {/* Left Column: Rejected Deposits */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1 h-4 bg-rose-500 rounded-full" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">2. Rejected Deposits ({sortedRejected.length})</h3>
          </div>
          <div className="border border-rose-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/70 border-b border-rose-100">
                  <th className="px-2 py-2 text-[8px] font-black text-rose-800 uppercase tracking-widest w-8 text-center"></th>
                  <th className="px-2 py-2 text-[8px] font-black text-rose-800 uppercase tracking-widest">Member</th>
                  <th className="px-2 py-2 text-[8px] font-black text-rose-800 uppercase tracking-widest text-right w-20">Amount</th>
                  <th className="px-2 py-2 text-[8px] font-black text-rose-800 uppercase tracking-widest w-24">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRejected.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-[8px] text-slate-500 italic text-center">No rejected deposits.</td>
                  </tr>
                ) : (
                  sortedRejected.map((item, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-2 py-1.5 text-center align-middle">
                        <AvatarCell profileImage={item.profileImage} name={item.memberName} size="w-5 h-5" />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <p className="text-[9px] font-black text-slate-900 leading-none">{item.memberName}</p>
                        <p className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">{item.accountNumber}</p>
                      </td>
                      <td className="px-2 py-1.5 text-[9px] font-black text-rose-700 text-right align-middle">Rs. {item.amount.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-[8px] text-rose-600 font-medium align-middle truncate" title={item.rejectionReason || ""}>
                        {item.rejectionReason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Unpaid Members */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">3. Unpaid Members ({sortedUnpaid.length})</h3>
          </div>
          <div className="border border-amber-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-100">
                  <th className="px-2 py-2 text-[8px] font-black text-amber-800 uppercase tracking-widest w-8 text-center"></th>
                  <th className="px-2 py-2 text-[8px] font-black text-amber-800 uppercase tracking-widest">Member</th>
                  <th className="px-2 py-2 text-[8px] font-black text-amber-800 uppercase tracking-widest w-16 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUnpaid.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-[8px] text-slate-500 italic text-center">All members deposited.</td>
                  </tr>
                ) : (
                  sortedUnpaid.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-2 py-1.5 text-center align-middle">
                        <AvatarCell profileImage={item.profileImage} name={item.memberName} size="w-5 h-5" />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <p className="text-[9px] font-black text-slate-900 leading-none">{item.memberName}</p>
                        <p className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">{item.accountNumber}</p>
                      </td>
                      <td className="px-2 py-1.5 text-center align-middle">
                        <span className="inline-block text-[6.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.5 rounded-full">
                          Unpaid
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Disclaimer Notes */}
      <section className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 mb-1">
          <Info className="w-3 h-3 text-slate-400" />
          <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Statement Notes & Disclaimers</h3>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl">
          <p className="text-[8px] leading-relaxed font-bold text-slate-500 italic">
            This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-center opacity-50">
        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">© Bachat Audit Engine v2.8</p>
        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Printed: {format(new Date(), "yyyy-MM-dd HH:mm")}</p>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #deposit-report-section, #deposit-report-section * { visibility: visible !important; }
          html, body, #__next, main, [role="dialog"], .print-modal-container, .print-modal-content, .print-modal-body {
            height: auto !important; min-height: 0 !important; max-height: none !important;
            overflow: visible !important; position: static !important; display: block !important;
            width: auto !important; padding: 0 !important; margin: 0 !important;
          }
          #deposit-report-section {
            position: relative !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: 100% !important;
            padding: 0 !important; margin: 0 !important;
            box-shadow: none !important; border: none !important;
            background: white !important; color: black !important; display: block !important;
          }
          @page { size: A4; margin: 8mm 6mm 8mm 6mm; }
          .shadow-2xl, .shadow-lg, .shadow-sm, .shadow-xl { box-shadow: none !important; }
          section, table, tr, tbody, .grid { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default CompleteDepositReport;
