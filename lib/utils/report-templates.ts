import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getOfficialBankName } from './export-utils';

const toBase64Image = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to convert image to base64:", err);
    return null;
  }
};

const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const drawInitials = (doc: jsPDF, name: string, x: number, y: number, bgColor: [number, number, number], textColor: [number, number, number], cx: number = 5, radius: number = 2.2) => {
  const initials = getInitials(name);
  doc.setFillColor(...bgColor);
  doc.circle(x + cx, y, radius, 'F');
  doc.setFontSize(5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(initials, x + cx, y + 0.7, { align: 'center' });
};

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
  profileImage?: string | null;
  date: string;
  type: string;
  amount: number;
  fine: number;
  status: string;
  rejectionReason?: string | null;
}

export interface DepositReportData {
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
  bankDetails?: {
    accountNo: string;
    accountName: string;
    bankName: string;
  };
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

export const generateFinancialReport = async (data: FinancialReportData) => {
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

  const principalLogs = stats?.principalRepaymentLogs || [];
  const advanceLogs = stats?.advanceInflowLogs || [];

  const [principalWithImages, advanceWithImages] = await Promise.all([
    Promise.all(principalLogs.map(async (log: any) => ({
      ...log,
      base64Avatar: await toBase64Image(log.profileImage)
    }))),
    Promise.all(advanceLogs.map(async (log: any) => ({
      ...log,
      base64Avatar: await toBase64Image(log.profileImage)
    })))
  ]);

  const monthlyInflow = stats?.grandTotalCollection || 0;
  const isBaseline = targetMonth === lifetimeStats?.financials?.initialOpeningMonth && Number(targetYear) === Number(lifetimeStats?.financials?.initialOpeningYear);
  const monthlyOutflow = (stats?.totalExpenditure || 0) + (stats?.bankCharges || 0) - (isBaseline ? (lifetimeStats?.financials?.initialExpenditure || 0) + (lifetimeStats?.financials?.initialBankCharges || 0) : 0);

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
    { content: 'GRAND TOTAL COLLECTION', styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138], cellPadding: 8 } },
    { content: `Rs. ${monthlyInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138], cellPadding: 8 } },
    { content: `Rs. ${prevInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138], cellPadding: 8 } },
    { content: `Rs. ${uptoInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138], cellPadding: 8 } },
    { content: `Rs. ${lifetimeInflow.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138], cellPadding: 8 } }
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Category', `Total (${targetMonth.slice(0, 3)})`, 'Previous', `Upto (${targetMonth.slice(0, 3)})`, 'Lifetime']],
    body: revenueTableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 6
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
      const pLogRows = principalWithImages.map((log: any) => [
        "", // Avatar (drawn in didDrawCell)
        `${log.memberName}\n${log.accountNo || '—'}`,
        `Rs. ${log.amount.toLocaleString('en-IN')}`
      ]);
      autoTable(doc, {
        startY: currentY,
        head: [['', 'Member Details', 'Amount Paid']],
        body: pLogRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35, halign: 'right' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const log = principalWithImages[data.row.index];
            const x = data.cell.x;
            const y = data.cell.y + data.cell.height / 2;
            const r = 0.8;
            if (log.base64Avatar) {
              try {
                doc.addImage(log.base64Avatar, 'JPEG', x + 3.5, y - 2.5, 5, 5);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.1);
                (doc as any).roundedRect(x + 3.5, y - 2.5, 5, 5, r, r, 'S');
              } catch (e) {
                drawInitials(doc, log.memberName, x, y, [219, 234, 254], [30, 58, 138], 6, 2.2);
              }
            } else {
              drawInitials(doc, log.memberName, x, y, [219, 234, 254], [30, 58, 138], 6, 2.2);
            }
          }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    if (advanceLogs.length > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      const advLogRows = advanceWithImages.map((log: any) => [
        "", // Avatar (drawn in didDrawCell)
        `${log.memberName}\n${log.accountNo || '—'}`,
        `Rs. ${log.amount.toLocaleString('en-IN')}`
      ]);
      autoTable(doc, {
        startY: currentY,
        head: [['', 'Member Details', 'Amount Credited']],
        body: advLogRows,
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6], fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35, halign: 'right' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const log = advanceWithImages[data.row.index];
            const x = data.cell.x;
            const y = data.cell.y + data.cell.height / 2;
            const r = 0.8;
            if (log.base64Avatar) {
              try {
                doc.addImage(log.base64Avatar, 'JPEG', x + 3.5, y - 2.5, 5, 5);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.1);
                (doc as any).roundedRect(x + 3.5, y - 2.5, 5, 5, r, r, 'S');
              } catch (e) {
                drawInitials(doc, log.memberName, x, y, [254, 243, 199], [146, 64, 14], 6, 2.2);
              }
            } else {
              drawInitials(doc, log.memberName, x, y, [254, 243, 199], [146, 64, 14], 6, 2.2);
            }
          }
        }
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
    doc.text('Bachat Audit Engine', 14, 287);
    doc.text(`Generated: ${timestamp}   |   Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  doc.save(`${orgName}_Financial_Report_${targetMonth || 'All'}_${targetYear}.pdf`);
};

export const generateDepositReport = async (data: DepositReportData) => {
  if (typeof window !== 'undefined') {
    const element = document.getElementById("deposit-report-section");
    if (element) {
      try {
        const html2canvas = (await import('html2canvas-pro')).default;
        const canvas = await html2canvas(element, {
          scale: 3, // High-quality 3x scaling for crisp PDF rendering
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = 210;
        const pdfHeight = 297;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const aspect = canvasHeight / canvasWidth;

        let printWidth = pdfWidth;
        let printHeight = pdfWidth * aspect;

        // Scale to fit on a single A4 page
        if (printHeight > pdfHeight) {
          printHeight = pdfHeight;
          printWidth = pdfHeight / aspect;
        }

        // Center on the page
        const xOffset = (pdfWidth - printWidth) / 2;
        const yOffset = (pdfHeight - printHeight) / 2;

        pdf.addImage(imgData, "JPEG", xOffset, yOffset, printWidth, printHeight);
        pdf.save(`${data.orgName}_Deposit_Report_${data.month}_${data.year}.pdf`);
        return;
      } catch (err) {
        console.error("html2canvas PDF generation failed, falling back to manual layout:", err);
      }
    }
  }

  const doc = new jsPDF();
  const { orgName, month, year, items, rejectedItems = [], notDepositedMembers = [], timestamp, bankDetails } = data;

  // Preload all avatars in parallel
  const [itemsWithImages, rejectedWithImages, unpaidWithImages] = await Promise.all([
    Promise.all(items.map(async item => ({
      ...item,
      base64Avatar: await toBase64Image(item.profileImage)
    }))),
    Promise.all(rejectedItems.map(async item => ({
      ...item,
      base64Avatar: await toBase64Image(item.profileImage)
    }))),
    Promise.all(notDepositedMembers.map(async item => ({
      ...item,
      base64Avatar: await toBase64Image(item.profileImage)
    })))
  ]);

  // Header
  doc.setFontSize(16);
  doc.setTextColor(34, 197, 94); // Green-500
  doc.text(orgName, 105, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Monthly Deposit Audit Report - ${month} ${year}`, 105, 22, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Generated on: ${timestamp}`, 105, 27, { align: 'center' });

  // Summary Stats
  const totalApproved = items.reduce((sum, i) => sum + i.amount, 0);
  const totalFine = items.reduce((sum, i) => sum + (i.fine || 0), 0);

  autoTable(doc, {
    startY: 32,
    head: [['Total Verified Collection', 'Total Fines Collected', 'Total Transactions']],
    body: [[
      `Rs. ${totalApproved.toLocaleString('en-IN')}`,
      `Rs. ${totalFine.toLocaleString('en-IN')}`,
      items.length.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], fontSize: 8, cellPadding: 2 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
  });

  // Sort all three lists alphabetically
  const sortedItems = [...items].sort((a, b) => a.memberName.localeCompare(b.memberName));
  const sortedRejected = [...rejectedItems].sort((a, b) => a.memberName.localeCompare(b.memberName));
  const sortedUnpaid = [...notDepositedMembers].sort((a, b) => a.memberName.localeCompare(b.memberName));

  // ─── Dynamic single-page scaling ─────────────────────────────────────────
  // A4 = 297mm. Usable = 297 - 14(top) - 14(bottom) = 269mm
  // Fixed overhead: header(13) + summary table(18) + gaps+labels(18) + notes+footer(16) = ~65mm
  // Remaining budget for the 3 data tables:
  const USABLE_HEIGHT = 269;
  const FIXED_OVERHEAD = 65;
  const tableBudget = USABLE_HEIGHT - FIXED_OVERHEAD; // ~204mm

  // Estimate height of one data row at base settings (fontSize=7.5, cellPadding=1.4):
  //   row height ≈ fontSize * 0.3528 (pt→mm) + 2 * cellPadding
  //   7.5 * 0.3528 + 2*1.4 ≈ 5.45mm per row
  const BASE_PAD = 1.4;
  const BASE_FS  = 7.5;
  const BASE_SIDE_FS  = 7.0;
  const BASE_SIDE_PAD = 1.4;
  const baseRowH      = BASE_FS * 0.3528 + 2 * BASE_PAD;
  const baseSideRowH  = BASE_SIDE_FS * 0.3528 + 2 * BASE_SIDE_PAD;
  // Each approved row spans full page width; side tables share the width in 2 columns
  // The taller of the two side tables determines side height
  const sideRows      = Math.max(sortedRejected.length, sortedUnpaid.length, 1);
  const approvedRows  = Math.max(sortedItems.length, 1);
  const neededHeight  = approvedRows * baseRowH + sideRows * baseSideRowH;

  // Compute a uniform scale factor, clamped to [0.60, 1.0]
  const scale = neededHeight > tableBudget
    ? Math.max(0.60, tableBudget / neededHeight)
    : 1.0;

  const cellPad     = +(BASE_PAD     * scale).toFixed(2);
  const fontSize    = +(BASE_FS      * scale).toFixed(1);
  const sideCellPad = +(BASE_SIDE_PAD * scale).toFixed(2);
  const sideFontSz  = +(BASE_SIDE_FS  * scale).toFixed(1);
  // ─────────────────────────────────────────────────────────────────────────

  // Approved Deposits Table  — merge name + A/C into one cell
  const tableRows = sortedItems.map(item => [
    "", // Avatar (drawn in didDrawCell)
    `${item.memberName}\n${item.accountNumber}`,
    item.date,
    (item.type || 'SAVINGS').replace('_', ' '),
    `Rs. ${item.amount.toLocaleString('en-IN')}`,
    `Rs. ${(item.fine || 0).toLocaleString('en-IN')}`
  ]);

  let currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text("1. APPROVED DEPOSITS", 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['', 'Member', 'Date', 'Type', 'Amount', 'Fine']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], fontSize: fontSize, cellPadding: cellPad },
    styles: { fontSize: fontSize, cellPadding: cellPad },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 16 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const item = itemsWithImages[data.row.index];
        const x = data.cell.x;
        const y = data.cell.y + data.cell.height / 2;
        const r = 0.8; // corner radius ~3px
        if (item.base64Avatar) {
          try {
            doc.addImage(item.base64Avatar, 'JPEG', x + 2.5, y - 2.5, 5, 5);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            (doc as any).roundedRect(x + 2.5, y - 2.5, 5, 5, r, r, 'S');
          } catch (e) {
            drawInitials(doc, item.memberName, x, y, [219, 234, 254], [30, 58, 138]);
          }
        } else {
          drawInitials(doc, item.memberName, x, y, [219, 234, 254], [30, 58, 138]);
        }
      }
    }
  });

  const bottomStartY = (doc as any).lastAutoTable.finalY + 8;

  // Title for Rejected Deposits
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(`2. REJECTED DEPOSITS (${sortedRejected.length})`, 14, bottomStartY);

  // Title for Unpaid Members
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(`3. UNPAID MEMBERS (${sortedUnpaid.length})`, 108, bottomStartY);

  // 1. Rejected Deposits Table (Left Column)
  // Rejected Deposits — sorted, name+account merged
  const rejectedRows = sortedRejected.map(item => [
    "",
    `${item.memberName}\n${item.accountNumber}`,
    `Rs. ${item.amount.toLocaleString('en-IN')}`,
    item.rejectionReason || "No reason"
  ]);

  autoTable(doc, {
    startY: bottomStartY + 3,
    margin: { left: 14, right: 108 },
    tableWidth: 88,
    head: [['', 'Member', 'Amount', 'Rejection Message']],
    body: rejectedRows.length > 0 ? rejectedRows : [['', 'No rejected deposits', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], fontSize: sideFontSz, cellPadding: sideCellPad },
    styles: { fontSize: sideFontSz, cellPadding: sideCellPad },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 24 }
    },
    didDrawCell: (data) => {
      if (sortedRejected.length > 0 && data.section === 'body' && data.column.index === 0) {
        const item = rejectedWithImages[data.row.index];
        const x = data.cell.x;
        const y = data.cell.y + data.cell.height / 2;
        const r = 0.7;
        if (item.base64Avatar) {
          try {
            doc.addImage(item.base64Avatar, 'JPEG', x + 2, y - 2, 4, 4);
            doc.setDrawColor(244, 63, 94);
            doc.setLineWidth(0.1);
            (doc as any).roundedRect(x + 2, y - 2, 4, 4, r, r, 'S');
          } catch (e) {
            drawInitials(doc, item.memberName, x, y, [254, 226, 226], [159, 18, 57], 4, 1.8);
          }
        } else {
          drawInitials(doc, item.memberName, x, y, [254, 226, 226], [159, 18, 57], 4, 1.8);
        }
      }
    }
  });

  const leftFinalY = (doc as any).lastAutoTable.finalY;

  // Unpaid Members — sorted, name+account merged
  const unpaidRows = sortedUnpaid.map(item => [
    "",
    `${item.memberName}\n${item.accountNumber}`,
    "Unpaid"
  ]);

  autoTable(doc, {
    startY: bottomStartY + 3,
    margin: { left: 108, right: 14 },
    tableWidth: 88,
    head: [['', 'Member', 'Status']],
    body: unpaidRows.length > 0 ? unpaidRows : [['', 'All active members deposited', '']],
    theme: 'grid',
    headStyles: { fillColor: [217, 119, 6], fontSize: sideFontSz, cellPadding: sideCellPad },
    styles: { fontSize: sideFontSz, cellPadding: sideCellPad },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' }
    },
    didDrawCell: (data) => {
      if (sortedUnpaid.length > 0 && data.section === 'body' && data.column.index === 0) {
        const item = unpaidWithImages[data.row.index];
        const x = data.cell.x;
        const y = data.cell.y + data.cell.height / 2;
        const r = 0.7;
        if (item.base64Avatar) {
          try {
            doc.addImage(item.base64Avatar, 'JPEG', x + 2, y - 2, 4, 4);
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(0.1);
            (doc as any).roundedRect(x + 2, y - 2, 4, 4, r, r, 'S');
          } catch (e) {
            drawInitials(doc, item.memberName, x, y, [254, 243, 199], [146, 64, 14], 4, 1.8);
          }
        } else {
          drawInitials(doc, item.memberName, x, y, [254, 243, 199], [146, 64, 14], 4, 1.8);
        }
      }
    }
  });

  const rightFinalY = (doc as any).lastAutoTable.finalY;
  const finalY = Math.max(leftFinalY, rightFinalY) + 6;

  // Notes & Sign-offs (Ensure it fits on the single page)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Statement Notes & Disclaimers', 14, finalY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.', 14, finalY + 5);

  // Footer stamping (Should only be 1 page)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    // Left stamp
    doc.text('Bachat Audit Engine', 14, 288);

    // Right stamp
    const footerRightText = `Generated: ${timestamp} | Page ${i} of ${pageCount}`;
    doc.text(footerRightText, 196, 288, { align: 'right' });
  }

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
    startY: 42,
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
    startY: (doc as any).lastAutoTable.finalY + 8,
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

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  // Notes & Sign-offs
  if (finalY > 170) {
    doc.addPage();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Audit Notes & Sign-Off', 14, 20);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.', 14, 28);
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Audit Notes & Sign-Off', 14, finalY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('This is an automated report. For any corrections, inquiries, or further support, please direct your request to administrative support.', 14, finalY + 8);
  }

  // Footer stamping (Landscape)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    // Left stamp
    doc.text('Bachat Audit Engine', 14, 200);

    // Right stamp
    const footerRightText = `Generated: ${timestamp} | Page ${i} of ${pageCount}`;
    doc.text(footerRightText, 283, 200, { align: 'right' });
  }

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
    ledgerData,
    stats,
    lifetimeStats
  } = data;

  const isBaseline = targetMonth === lifetimeStats?.financials?.initialOpeningMonth && Number(targetYear) === Number(lifetimeStats?.financials?.initialOpeningYear);
  const excelOutflow = (ledgerData?.totalExpenditure || 0) + (ledgerData?.bankCharges || 0) - (isBaseline ? (lifetimeStats?.financials?.initialExpenditure || 0) + (lifetimeStats?.financials?.initialBankCharges || 0) : 0);

  const rows = [
    ["Institutional Financial Audit - " + orgName],
    ["Bank Details", bankDetails ? `${getOfficialBankName(bankDetails.bankName)} | A/C: ${bankDetails.accountNo} | ${bankDetails.accountName}` : "N/A"],
    ["Period", `${targetMonth} ${targetYear}`],
    ["Generated On", timestamp],
    [],
    ["1. EXECUTIVE CASH POSITION"],
    ["Opening Balance", ledgerData?.openingBalance || 0],
    ["Inflow (Period)", collection.reduce((a, b) => a + b.val, 0) + (assetTracking?.advanceInflow || 0) + (assetTracking?.principalRepayment || 0) - (assetTracking?.advanceUsed || 0)],
    ["Outflow (Period)", excelOutflow],
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

export const exportDepositToExcel = (data: DepositReportData) => {
  const { orgName, month, year, items, timestamp } = data;

  const totalApproved = items.filter(i => i.status === 'APPROVED').reduce((sum, i) => sum + i.amount, 0);
  const totalFine = items.filter(i => i.status === 'APPROVED').reduce((sum, i) => sum + (i.fine || 0), 0);

  const rows = [
    ["Monthly Deposit Audit Report - " + orgName],
    ["Period", `${month} ${year}`],
    ["Generated On", timestamp],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Verified Collection", totalApproved],
    ["Total Fines Collected", totalFine],
    ["Total Transactions", items.length],
    [],
    ["DETAILED TRANSACTIONS"],
    ["Member Name", "Account Number", "Date", "Type", "Amount (NPR)", "Fine (NPR)", "Status"]
  ];

  items.forEach(item => {
    rows.push([
      item.memberName,
      item.accountNumber,
      item.date,
      (item.type || 'SAVINGS').replace('_', ' '),
      item.amount,
      item.fine || 0,
      item.status
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Deposits");

  const fileName = `Deposit_Report_${orgName.replace(/\s+/g, '_')}_${month}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportLoanToExcel = (data: LoanReportData) => {
  const { orgName, items, timestamp } = data;

  const totalPrincipal = items.reduce((sum, i) => sum + (i.principalAmount || 0), 0);
  const totalOutstanding = items.reduce((sum, i) => sum + (i.principalOutstanding || 0), 0);
  const activeCount = items.filter(i => i.status === 'ACTIVE').length;

  const rows = [
    ["Loan Portfolio & Credit Audit Report - " + orgName],
    ["Generated On", timestamp],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Loan Disbursed", totalPrincipal],
    ["Current Principal Outstanding", totalOutstanding],
    ["Active Loan Accounts", activeCount],
    [],
    ["DETAILED LOAN PORTFOLIO"],
    ["Member Name", "Account Number", "Activated Date", "Interest Rate", "Principal Disbursed", "Balance Principal Outstanding", "Accrued Interest", "Total Paid", "Status"]
  ];

  items.forEach(item => {
    rows.push([
      item.memberName,
      item.accountNumber,
      item.activatedAt || 'N/A',
      `${item.interestRate}%`,
      item.principalAmount || 0,
      item.principalOutstanding || 0,
      item.interestOutstanding || 0,
      item.totalPaid || 0,
      item.status
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Loan Portfolio");

  const fileName = `Loan_Portfolio_Report_${orgName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
