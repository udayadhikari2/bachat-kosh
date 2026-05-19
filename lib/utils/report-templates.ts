import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const { orgName, targetMonth, targetYear, collection, expenditure, nav, perMemberWealth, totalMembers, timestamp } = data;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(orgName, 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text('Financial Statement & NAV Analysis', 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Period: ${targetMonth || 'All'} ${targetYear} | Generated: ${timestamp}`, 105, 38, { align: 'center' });

  // 1. Assets & Collections Table
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('1. Total Collection (Assets & Inflows)', 14, 50);
  
  const collectionRows: any[] = collection.map(item => [item.label, `Rs. ${item.val.toLocaleString('en-IN')}`]);
  const totalValuation = collection.reduce((a, b) => a + b.val, 0);
  collectionRows.push([{ content: 'Total Valuation', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }, { content: `Rs. ${totalValuation.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }]);

  autoTable(doc, {
    startY: 55,
    head: [['Category', 'Amount']],
    body: collectionRows,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });

  // 2. Expenditures & Liabilities Table
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.text('2. Expenditures (Outflows & Liabilities)', 14, finalY + 15);
  
  const expenditureRows: any[] = expenditure.map(item => [item.label, `Rs. ${item.val.toLocaleString('en-IN')}`]);
  const totalDeduction = expenditure.reduce((a, b) => a + b.val, 0);
  expenditureRows.push([{ content: 'Total Deduction', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }, { content: `Rs. ${totalDeduction.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Category', 'Amount']],
    body: expenditureRows,
    theme: 'striped',
    headStyles: { fillColor: [244, 63, 94] }, // Rose-500
  });

  // 3. NAV Summary Block
  const finalY2 = (doc as any).lastAutoTable.finalY;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, finalY2 + 15, 182, 40, 'F');
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.rect(14, finalY2 + 15, 182, 40, 'S');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Asset Value (NAV):', 20, finalY2 + 28);
  doc.setTextColor(16, 185, 129);
  doc.text(`Rs. ${nav.toLocaleString('en-IN')}`, 100, finalY2 + 28);

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Per Member Assets:`, 20, finalY2 + 42);
  doc.setTextColor(59, 130, 246); // Blue-500
  doc.text(`Rs. ${perMemberWealth.toLocaleString('en-IN')} (across ${totalMembers} members)`, 100, finalY2 + 42);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`This is an automatically generated audit report from Hamro Bachat. Verified on ${timestamp}`, 105, 285, { align: 'center' });

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
    ["Bank Details", bankDetails ? `${bankDetails.bankName} | A/C: ${bankDetails.accountNo} | ${bankDetails.accountName}` : "N/A"],
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
