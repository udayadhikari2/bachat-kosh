import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getOfficialBankName } from './export-utils';

export interface FinancialReportData {
  orgName: string;
  bankDetails?: {
    accountNo: string;
    accountName: string;
    bankName: string;
  };
  targetMonth: string;
  targetYear: number;
  collection: { label: string; val: number }[];
  expenditure: { label: string; val: number }[];
  assetTracking?: {
    principalRepayment: number;
    advanceInflow: number;
    advanceUsed: number;
    principalLogs?: any[];
    advanceLogs?: any[];
  };
  nav: number;
  perMemberWealth: number;
  totalMembers: number;
  timestamp: string;
  ledgerData?: any;
  stats?: any;
  lifetimeStats?: any;
  healthData?: any;
  usersCount?: number;
}

export interface DepositReportItem {
  memberName: string;
  accountNumber: string;
  date: string;
  type: string;
  amount: number;
  fine: number;
  status: string;
}

export interface DepositReportData {
  orgName: string;
  month: string;
  year: number;
  items: DepositReportItem[];
  timestamp: string;
}

export interface LoanReportItem {
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

export interface LoanReportData {
  orgName: string;
  items: LoanReportItem[];
  timestamp: string;
}

export interface MemberReportItem {
  name: string;
  accountNumber: string;
  role: string;
  totalDeposited: number;
  advanceBalance: number;
  status: string;
}

export interface MemberReportData {
  orgName: string;
  items: MemberReportItem[];
  timestamp: string;
}

export const generateFinancialReport = (data: FinancialReportData) => {
  const doc = new jsPDF();
  const {
    orgName,
    bankDetails,
    targetMonth,
    targetYear,
    nav,
    perMemberWealth,
    totalMembers,
    timestamp,
    ledgerData,
    stats,
    lifetimeStats,
    healthData,
    usersCount
  } = data;

  const monthlyInflow = stats?.grandTotalCollection || 0;
  const monthlyOutflow = (stats?.totalExpenditure || 0) + (stats?.bankCharges || 0);

  const uptoInflow = stats?.upto?.grandTotalCollection || 0;

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

  const calculatedNav = totalAssets - totalLiabilities;
  const calculatedPerMemberWealth = Math.ceil(calculatedNav / (usersCount || totalMembers || 1));

  const finalNav = nav ?? calculatedNav;
  const finalPerMemberWealth = perMemberWealth ?? calculatedPerMemberWealth;

  // Header Page 1
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(orgName, 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('INSTITUTIONAL FINANCIAL AUDIT | COMPLETE STATEMENT', 14, 25);

  doc.setFontSize(10);
  doc.text(`Period: ${targetMonth} ${targetYear}`, 196, 20, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Generated: ${timestamp}`, 196, 25, { align: 'right' });
  if (bankDetails) {
    doc.text(`Bank: ${getOfficialBankName(bankDetails.bankName)} | A/C: ${bankDetails.accountNo}`, 196, 30, { align: 'right' });
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.line(14, 33, 196, 33);

  // 1. Executive Cash Position
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Executive Cash Position (${targetMonth})`, 14, 42);

  const cashRows = [
    [
      `Opening Balance\nRs. ${(ledgerData?.openingBalance || 0).toLocaleString('en-IN')}`,
      `Period Inflow\nRs. ${(monthlyInflow).toLocaleString('en-IN')}`,
      `Period Outflow\nRs. ${(monthlyOutflow).toLocaleString('en-IN')}`,
      `Closing Balance\nRs. ${(ledgerData?.closingBalance || 0).toLocaleString('en-IN')}`
    ]
  ];

  autoTable(doc, {
    startY: 46,
    body: cashRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      cellPadding: 4
    },
    columnStyles: {
      0: { fillColor: [248, 250, 252] },
      1: { fillColor: [240, 253, 244], textColor: [21, 128, 61] }, // green
      2: { fillColor: [254, 242, 242], textColor: [185, 28, 28] }, // red
      3: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }   // slate-900
    }
  });

  // 2. Revenue & Collection Audit
  const nextY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Revenue & Collection Audit', 14, nextY);

  const revenueRowsDef = [
    { label: "Regular Savings Collection", key: "totalApprovedAmount" },
    { label: "Delayed Fine Collection", key: "totalDelayedFinePaid" },
    { label: "Service & Renewal Fees", key: "totalServiceChargePaid" },
    { label: "Loan Interest Revenue", key: "totalLoanInterestPaid" },
    { label: "Bank Interest Income", key: "bankInterest" },
    { label: "Capital / Nav Collection", key: "navCollection" },
    { label: "Miscellaneous Revenue", key: "miscellaneous" },
  ];

  const revenueTableRows: any[][] = revenueRowsDef.map(row => [
    row.label,
    `Rs. ${(stats?.[row.key] || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.prev?.[row.key] || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.upto?.[row.key] || 0).toLocaleString('en-IN')}`,
    `Rs. ${(lifetimeStats?.[row.key] || 0).toLocaleString('en-IN')}`
  ]);

  const calculateSubTotal = (source: any) => {
    return revenueRowsDef.reduce((acc, row) => acc + (source?.[row.key] || 0), 0);
  };
  const monthlyRevSubTotal = calculateSubTotal(stats);
  const prevRevSubTotal = calculateSubTotal(stats?.prev);
  const uptoRevSubTotal = calculateSubTotal(stats?.upto);
  const lifetimeRevSubTotal = calculateSubTotal(lifetimeStats);

  revenueTableRows.push([
    { content: 'Operational Revenue Sub-Total', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `Rs. ${monthlyRevSubTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `Rs. ${prevRevSubTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `Rs. ${uptoRevSubTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `Rs. ${lifetimeRevSubTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
  ]);

  revenueTableRows.push([
    'Principal Repayment',
    `Rs. ${(stats?.totalLoanRepaid || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.prev?.totalLoanRepaid || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.upto?.totalLoanRepaid || 0).toLocaleString('en-IN')}`,
    `Rs. ${(lifetimeStats?.totalLoanRepaid || 0).toLocaleString('en-IN')}`
  ]);
  
  revenueTableRows.push([
    'Advanced Credit (Inflow)',
    `Rs. ${(stats?.totalAdvancedPayment || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.prev?.totalAdvancedPayment || 0).toLocaleString('en-IN')}`,
    `Rs. ${(stats?.upto?.totalAdvancedPayment || 0).toLocaleString('en-IN')}`,
    `Rs. ${(lifetimeStats?.totalAdvancedPayment || 0).toLocaleString('en-IN')}`
  ]);

  revenueTableRows.push([
    'Advance Credit Used',
    `- Rs. ${(stats?.totalCreditUsed || 0).toLocaleString('en-IN')}`,
    `- Rs. ${(stats?.prev?.totalCreditUsed || 0).toLocaleString('en-IN')}`,
    `- Rs. ${(stats?.upto?.totalCreditUsed || 0).toLocaleString('en-IN')}`,
    `- Rs. ${(lifetimeStats?.totalCreditUsed || 0).toLocaleString('en-IN')}`
  ]);

  const prevInflow = stats?.prev?.grandTotalCollection || 0;
  const lifetimeInflow = lifetimeStats?.grandTotalCollection || 0;

  revenueTableRows.push([
    { content: 'GRAND TOTAL COLLECTION', styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } },
    { content: `Rs. ${monthlyInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } },
    { content: `Rs. ${prevInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } },
    { content: `Rs. ${uptoInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } },
    { content: `Rs. ${lifetimeInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } }
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Category', `Total (${targetMonth.slice(0,3)})`, 'Previous', `Upto (${targetMonth.slice(0,3)})`, 'Lifetime']],
    body: revenueTableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  // Page 2
  doc.addPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(orgName, 14, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Financial Statement & NAV Analysis - Page 2', 14, 24);
  doc.line(14, 27, 196, 27);

  // 3. Valuation & NAV Balance Sheet
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Valuation & NAV Balance Sheet', 14, 36);

  const assetsRows: any[][] = [
    ['Total Cash Collections (Upto)', `Rs. ${uptoInflow.toLocaleString('en-IN')}`],
    ['Accrued Interest (Active Loans)', `Rs. ${(healthData?.totalAccruedInterestActive || 0).toLocaleString('en-IN')}`],
    ['Outstanding Fees (Active Loans)', `Rs. ${(healthData?.totalOutstandingFeesActive || 0).toLocaleString('en-IN')}`],
    [{ content: 'Gross Institutional Assets', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: `Rs. ${totalAssets.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }]
  ];

  const liabilitiesRows: any[][] = [
    ['Member Advance Credits', `Rs. ${(healthData?.totalAdvancePaidActive || 0).toLocaleString('en-IN')}`],
    ['Operating Expenditure (Upto)', `Rs. ${(stats?.upto?.totalExpenditure || 0).toLocaleString('en-IN')}`],
    ['Bank Charges (Upto)', `Rs. ${(stats?.upto?.bankCharges || 0).toLocaleString('en-IN')}`],
    [{ content: 'Total Liabilities', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }, { content: `Rs. ${totalLiabilities.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }]
  ];

  autoTable(doc, {
    startY: 40,
    head: [['Asset Account', 'Valuation (NPR)']],
    body: assetsRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } }
  });

  const finalAssetsY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: finalAssetsY + 6,
    head: [['Liability / Deduction Account', 'Deduction (NPR)']],
    body: liabilitiesRows,
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27] },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } }
  });

  const finalLiabilitiesY = (doc as any).lastAutoTable.finalY;

  const navY = finalLiabilitiesY + 8;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, navY, 182, 22, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Net Asset Value (NAV):', 20, navY + 8);
  doc.setTextColor(52, 211, 153);
  doc.setFontSize(11);
  doc.text(`Rs. ${finalNav.toLocaleString('en-IN')}`, 20, navY + 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Per Member Wealth:', 110, navY + 8);
  doc.setTextColor(96, 165, 250);
  doc.setFontSize(11);
  doc.text(`Rs. ${finalPerMemberWealth.toLocaleString('en-IN')}`, 110, navY + 15);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Based on ${usersCount || totalMembers} active members`, 110, navY + 19);

  let currentY = navY + 28;

  const principalLogs = stats?.principalRepaymentLogs || [];
  const advanceLogs = stats?.advanceInflowLogs || [];

  if (principalLogs.length > 0 || advanceLogs.length > 0) {
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('4. Detailed Period Log Audit', 14, currentY);
    currentY += 4;

    if (principalLogs.length > 0) {
      const pLogRows = principalLogs.map((log: any) => [log.memberName, `Rs. ${log.amount.toLocaleString('en-IN')}`]);
      autoTable(doc, {
        startY: currentY,
        head: [['Member Name (Principal Repayments)', 'Amount Paid']],
        body: pLogRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: { 1: { halign: 'right' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    if (advanceLogs.length > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }
      
      const advLogRows = advanceLogs.map((log: any) => [log.memberName, `Rs. ${log.amount.toLocaleString('en-IN')}`]);
      autoTable(doc, {
        startY: currentY,
        head: [['Member Name (Advanced Credit Inflows)', 'Amount Credited']],
        body: advLogRows,
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: { 1: { halign: 'right' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // 5. Notes & Sign-offs
  if (currentY > 190) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. Audit Notes & Sign-Off', 14, currentY);
  
  const notesText = [
    "1. This statement is a point-in-time reconstruction of the organization's financial state as of the end of the selected period.",
    "2. 'Historical Cash Collections' include all member deposits, interest, and fees collected up to the reporting date.",
    "3. 'Accrued Interest' and 'Outstanding Fees' are treated as assets (receivables) as they represent legally binding income generated within this period.",
    "4. Net Asset Value (NAV) represents the total equity of the organization if all assets were liquidated and liabilities settled today."
  ];

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  let noteY = currentY + 5;
  notesText.forEach(note => {
    doc.text(note, 14, noteY);
    noteY += 4.5;
  });

  const sigY = noteY + 12;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.', 14, sigY);

  // Dynamic Footers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Hamro Bachat Audit Engine', 14, 287);
    doc.text(`Generated: ${timestamp}   |   Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  doc.save(`${orgName}_Financial_Report_${targetMonth || 'All'}_${targetYear}.pdf`);
};

export const generateDepositReport = (data: DepositReportData) => {
  const doc = new jsPDF();
  const { orgName, month, year, items, timestamp } = data;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(34, 197, 94); // Green-500
  doc.text(orgName, 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`Monthly Deposit Audit Report - ${month} ${year}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(`Generated on: ${timestamp}`, 105, 36, { align: 'center' });

  // Summary Stats
  const totalApproved = items.filter(i => i.status === 'APPROVED').reduce((sum, i) => sum + i.amount, 0);
  const totalFine = items.filter(i => i.status === 'APPROVED').reduce((sum, i) => sum + (i.fine || 0), 0);

  autoTable(doc, {
    startY: 45,
    head: [['Total Verified Collection', 'Total Fines Collected', 'Total Transactions']],
    body: [[
      `Rs. ${totalApproved.toLocaleString('en-IN')}`,
      `Rs. ${totalFine.toLocaleString('en-IN')}`,
      items.length.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
  });

  // Main Table
  const tableRows = items.map(item => [
    item.memberName,
    item.accountNumber,
    item.date,
    (item.type || 'SAVINGS').replace('_', ' '),
    `Rs. ${item.amount.toLocaleString('en-IN')}`,
    `Rs. ${(item.fine || 0).toLocaleString('en-IN')}`,
    item.status
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Member Name', 'A/C No.', 'Date', 'Type', 'Amount', 'Fine', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] }, // Slate-700
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
    }
  });

  doc.save(`${orgName}_Deposit_Report_${month}_${year}.pdf`);
};

export const generateLoanReport = (data: LoanReportData) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
  const { orgName, items, timestamp } = data;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(59, 130, 246); // Blue-500
  doc.text(orgName, 148.5, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text('Loan Portfolio & Credit Audit Report', 148.5, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${timestamp}`, 148.5, 38, { align: 'center' });

  // Summary Metrics
  const totalPrincipal = items.reduce((sum, i) => sum + (i.principalAmount || 0), 0);
  const totalOutstanding = items.reduce((sum, i) => sum + (i.principalOutstanding || 0), 0);
  const activeCount = items.filter(i => i.status === 'ACTIVE').length;

  autoTable(doc, {
    startY: 45,
    head: [['Total Loan Disbursed', 'Current Principal Outstanding', 'Active Loan Accounts']],
    body: [[
      `Rs. ${totalPrincipal.toLocaleString('en-IN')}`,
      `Rs. ${totalOutstanding.toLocaleString('en-IN')}`,
      activeCount.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Main Table
  const tableRows = items.map(item => [
    item.memberName,
    item.accountNumber,
    item.activatedAt || 'N/A',
    `${item.interestRate}%`,
    `Rs. ${(item.principalAmount || 0).toLocaleString('en-IN')}`,
    `Rs. ${(item.principalOutstanding || 0).toLocaleString('en-IN')}`,
    `Rs. ${(item.interestOutstanding || 0).toLocaleString('en-IN')}`,
    `Rs. ${(item.totalPaid || 0).toLocaleString('en-IN')}`,
    item.status
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Member Name', 'A/C No.', 'Activated', 'Rate', 'Principal', 'Bal Principal', 'Accrued Int.', 'Total Paid', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    }
  });

  doc.save(`${orgName}_Loan_Portfolio_Report.pdf`);
};

export const generateMemberReport = (data: MemberReportData) => {
  const doc = new jsPDF();
  const { orgName, items, timestamp } = data;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(orgName, 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text('Member Standing & Equity Audit Report', 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${timestamp}`, 105, 38, { align: 'center' });

  // Summary Metrics
  const activeMembers = items.filter(i => i.status === 'ACTIVE').length;
  const totalEquity = items.reduce((sum, i) => sum + i.totalDeposited, 0);

  autoTable(doc, {
    startY: 45,
    head: [['Total Organization Equity', 'Active Members', 'Total Records']],
    body: [[
      `Rs. ${totalEquity.toLocaleString('en-IN')}`,
      activeMembers.toString(),
      items.length.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Main Table
  const tableRows = items.map(item => [
    item.name,
    item.accountNumber,
    item.role,
    `Rs. ${item.totalDeposited.toLocaleString('en-IN')}`,
    `Rs. ${item.advanceBalance.toLocaleString('en-IN')}`,
    item.status
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Name', 'A/C No.', 'Role', 'Total Deposited', 'Advance Bal.', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
    }
  });

  doc.save(`${orgName}_Member_Standing_Report.pdf`);
};

export const exportFinancialToExcel = (data: FinancialReportData) => {
  const { 
    orgName, 
    bankDetails,
    targetMonth, 
    targetYear, 
    collection, 
    expenditure, 
    assetTracking,
    nav, 
    perMemberWealth, 
    totalMembers, 
    timestamp, 
    ledgerData 
  } = data;

  const rows = [
    ["Institutional Financial Audit - " + orgName],
    ["Bank Details", bankDetails ? `${getOfficialBankName(bankDetails.bankName)} | A/C: ${bankDetails.accountNo} | ${bankDetails.accountName}` : "N/A"],
    ["Period", `${targetMonth} ${targetYear}`],
    ["Generated On", timestamp],
    [],
    ["1. EXECUTIVE CASH POSITION"],
    ["Opening Balance", ledgerData?.openingBalance || 0],
    ["Inflow (Period)", collection.reduce((a, b) => a + b.val, 0) + (assetTracking?.advanceInflow || 0) + (assetTracking?.principalRepayment || 0) - (assetTracking?.advanceUsed || 0)],
    ["Outflow (Period)", (ledgerData?.totalExpenditure || 0) + (ledgerData?.bankCharges || 0)],
    ["Closing Balance", ledgerData?.closingBalance || 0],
    [],
    ["2. REVENUE & COLLECTIONS (OPERATIONAL)"],
    ["Category", "Amount (NPR)"]
  ];

  collection.forEach(item => rows.push([item.label, item.val]));
  const revSubTotal = collection.reduce((a, b) => a + b.val, 0);
  rows.push(["Operational Sub-Total", revSubTotal]);
  
  rows.push([]);
  rows.push(["3. ASSET TRACKING & CREDITS"]);
  rows.push(["Principal Repayment", assetTracking?.principalRepayment || 0]);
  rows.push(["Advanced Credit (Inflow)", assetTracking?.advanceInflow || 0]);
  rows.push(["Advance Credit Used", -(assetTracking?.advanceUsed || 0)]);
  rows.push(["GRAND TOTAL COLLECTION", (revSubTotal + (assetTracking?.advanceInflow || 0)) - (assetTracking?.advanceUsed || 0)]);

  if (assetTracking?.principalLogs?.length) {
    rows.push([]);
    rows.push(["PRINCIPAL REPAYMENT LOGS"]);
    rows.push(["Member Name", "Amount"]);
    assetTracking.principalLogs.forEach(log => rows.push([log.memberName, log.amount]));
  }

  if (assetTracking?.advanceLogs?.length) {
    rows.push([]);
    rows.push(["ADVANCED CREDIT INFLOW LOGS"]);
    rows.push(["Member Name", "Amount"]);
    assetTracking.advanceLogs.forEach(log => rows.push([log.memberName, log.amount]));
  }

  rows.push([]);
  rows.push(["4. VALUATION ANALYSIS"]);
  rows.push(["Net Asset Value (NAV)", nav]);
  rows.push(["Total Members", totalMembers]);
  rows.push(["Per Member Wealth", perMemberWealth]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Financial Statement");

  const fileName = `Financial_Statement_${orgName.replace(/\s+/g, '_')}_${targetMonth}_${targetYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
