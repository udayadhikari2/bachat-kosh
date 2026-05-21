import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { adToBs, NEPALI_MONTHS } from "./nepali-date";
import { getOfficialBankName } from "./export-utils";

interface PDFData {
  loan: any;
  organization: any;
  user: any;
  activationDate: Date;
  evaluationDate: Date;
  daysElapsed: number;
  includeRenewalFee: boolean;
  renewalFeeAmount: number;
  advanceAmountUsed?: number;
  availableAdvanceBalance?: number;
  baseDays: number;
  exceedDays: number;
  stats: any;
}

export const generateLoanStatementPDF = (data: PDFData) => {
  const { 
    loan, organization, user, activationDate, evaluationDate, 
    daysElapsed, includeRenewalFee, renewalFeeAmount, 
    advanceAmountUsed = 0,
    availableAdvanceBalance = 0,
    baseDays,
    exceedDays,
    stats
  } = data;
  const doc = new jsPDF();
  const now = new Date();
  
  const bsNow = adToBs(now);
  const nepaliNow = `${bsNow.year} ${NEPALI_MONTHS[bsNow.month - 1]} ${bsNow.day}`;
  
  const bsActivation = adToBs(activationDate);
  const nepaliActivation = `${bsActivation.year} ${NEPALI_MONTHS[bsActivation.month - 1]} ${bsActivation.day}`;
  
  const bsEval = adToBs(evaluationDate);
  const nepaliEval = `${bsEval.year} ${NEPALI_MONTHS[bsEval.month - 1]} ${bsEval.day}`;

  // Helper for currency formatting (no decimals)
  const formatCurrency = (amount: number) => {
    return "Rs. " + Math.ceil(amount).toLocaleString();
  };

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text(organization.name || "Hamro Bachat Organization", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${getOfficialBankName(organization.bankDetails?.bankName) || ""} | Account: ${organization.bankDetails?.accountNo || ""}`, 105, 27, { align: "center" });

  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);

  // --- Statement Info ---
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("OFFICIAL LOAN BILL / STATEMENT", 20, 48);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Bill Date: ${now.toLocaleDateString()} (${nepaliNow} BS)`, 20, 55);
  doc.text(`Valuation Date: ${evaluationDate.toLocaleDateString()} (${nepaliEval} BS)`, 20, 60);

  // --- Member & Timeline Details ---
  doc.setFillColor(245, 247, 250);
  doc.rect(20, 70, 170, 50, "F");
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("MEMBER & LOAN TIMELINE", 25, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Name: ${user.name}`, 25, 87);
  doc.text(`Account / Email: ${user.email}`, 25, 92);
  doc.text(`Initial Activation Date: ${activationDate.toLocaleDateString()} (${nepaliActivation} BS)`, 25, 97);
  doc.text(`Standard Period (Base): ${baseDays} Days (Rate: ${loan.interestRate}% P.A.)`, 25, 102);
  doc.text(`Exceeded Period (Penalty): ${exceedDays} Days (Rate: ${loan.penaltyRate || 20}% P.A.)`, 25, 107);
  doc.text(`Total Interest Duration: ${daysElapsed} Days`, 25, 112);
  
  doc.text(`Loan Reference: ${loan._id?.toString().slice(-8).toUpperCase()}`, 115, 87);
  doc.text(`Current Status: ${loan.status}`, 115, 92);
  doc.text(`Valuation Date: ${evaluationDate.toLocaleDateString()}`, 115, 97);
  doc.text(`(BS: ${nepaliEval})`, 115, 102);

  // --- Table of Dues ---
  let duesSubtotal = 0;
  const tableData: any[][] = [];

  // 1. Accrued Interest
  const interest = Math.ceil(stats.unpaidBaseInterest);
  const penalty = Math.ceil(stats.unpaidPenaltyInterest);
  
  tableData.push(["Accrued Base Interest (Total)", formatCurrency(interest)]);
  duesSubtotal += interest;

  if (penalty > 0) {
    tableData.push(["Accrued Penalty Interest", formatCurrency(penalty)]);
    duesSubtotal += penalty;
  }

  // 2. Fees
  const sc = Math.ceil(loan.serviceChargeAmount || 0);
  const isSCPaid = !!stats.isServiceChargePaid;
  tableData.push([`Service Charge ${isSCPaid ? '(Settled)' : '(Unpaid)'}`, isSCPaid ? "Rs. 0" : formatCurrency(sc)]);
  if (!isSCPaid) duesSubtotal += sc;

  const rnOld = Math.ceil(loan.renewalAmount || 0);
  const isRNOldPaid = !!stats.isRenewalChargePaid;
  if (rnOld > 0 || isRNOldPaid) {
    tableData.push([`Previous Renewal Fee ${isRNOldPaid ? '(Settled)' : '(Unpaid)'}`, isRNOldPaid ? "Rs. 0" : formatCurrency(rnOld)]);
    if (!isRNOldPaid) duesSubtotal += rnOld;
  }

  if (includeRenewalFee) {
    const rf = Math.ceil(renewalFeeAmount);
    tableData.push(["Upcoming Renewal Fee (Requested)", formatCurrency(rf)]);
    duesSubtotal += rf;
  }

  // Subtotal (Except Principal)
  tableData.push([{ 
    content: "SUBTOTAL (FEES & INTEREST):", 
    styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } 
  }, { 
    content: formatCurrency(duesSubtotal), 
    styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } 
  }]);

  // 3. Principal
  const principal = Math.ceil(loan.balanceAmount || loan.principalAmount);
  tableData.push(["Core Principal Balance", formatCurrency(principal)]);

  autoTable(doc, {
    startY: 125,
    head: [["Description", "Amount (NPR)"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right", fontStyle: "bold" }
    },
    margin: { left: 20, right: 20 }
  });

  // --- Final Totals ---
  const finalYStart = (doc as any).lastAutoTable.finalY + 15;
  const grandTotal = duesSubtotal + principal;
  
  // Use the specific amount applied for this bill
  const totalDeduction = advanceAmountUsed;
  const netTotal = Math.max(0, grandTotal - totalDeduction);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("TOTAL ACCRUED DUES:", 20, finalYStart);
  doc.text(formatCurrency(grandTotal), 190, finalYStart, { align: "right" });

  if (totalDeduction > 0) {
    doc.setTextColor(59, 130, 246); // Blue for credits
    doc.text(`GLOBAL ADVANCE CREDIT (${totalDeduction === advanceAmountUsed ? 'APPLIED' : 'AVAILABLE'}) (-):`, 20, finalYStart + 7);
    doc.text("-" + formatCurrency(totalDeduction), 190, finalYStart + 7, { align: "right" });
  }

  const finalYTotal = totalDeduction > 0 ? finalYStart + 17 : finalYStart + 10;
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // Emerald for net
  doc.text("NET OUTSTANDING PAYABLE:", 20, finalYTotal);
  doc.text(formatCurrency(netTotal), 190, finalYTotal, { align: "right" });


  // Footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("This document serves as an official statement of dues as per organization records.", 105, 275, { align: "center" });
  doc.text(`Generated by Hamro Bachat Management System`, 105, 280, { align: "center" });
  doc.text(`Calculations rounded to nearest whole number (Decimal-Free Policy).`, 105, 285, { align: "center" });

  // Save the PDF
  doc.save(`Bill_${user.name.replace(/\s+/g, "_")}_${now.getTime()}.pdf`);
};
