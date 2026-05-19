export function calculateLoanStats(loan: any, forceEndDate?: Date) {
  const calculationDate = forceEndDate ? new Date(forceEndDate) : new Date();
  
  // 1. Reconstruct point-in-time state by filtering the audit trail
  const filteredPayments = (loan.payments || []).filter((p: any) => new Date(p.date).getTime() <= calculationDate.getTime());
  const filteredRenewals = (loan.renewalHistory || []).filter((r: any) => new Date(r.date).getTime() <= calculationDate.getTime());

  // Point-in-time Paid trackers
  const principalPaid = filteredPayments.filter((p: any) => p.type === "PRINCIPAL").reduce((sum: number, p: any) => sum + p.amount, 0);
  const interestPaid = filteredPayments.filter((p: any) => p.type === "INTEREST").reduce((sum: number, p: any) => sum + p.amount, 0);
  const penaltyPaid = filteredPayments.filter((p: any) => p.type === "PENALTY").reduce((sum: number, p: any) => sum + p.amount, 0);
  const scPaid = filteredPayments.filter((p: any) => p.type === "SERVICE_CHARGE").reduce((sum: number, p: any) => sum + p.amount, 0);
  const renewalPaidTotal = filteredPayments.filter((p: any) => p.type === "RENEWAL").reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const totalPaid = filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

  if (!loan.activatedAt || loan.status === "PENDING" || loan.status === "APPROVED") {
    const totalAmountToPay = loan.principalAmount + (loan.serviceChargeAmount || 0) + (loan.renewalAmount || 0);
    return {
      totalDays: 0,
      baseDays: 0,
      exceedDays: 0,
      baseInterest: 0,
      exceedInterest: 0,
      totalInterest: 0,
      totalAmountToPay,
      totalPaid,
      outstandingAmount: Math.max(0, totalAmountToPay - totalPaid)
    };
  }

  const activatedDate = new Date(loan.activatedAt);
  
  // If calculation date is before activation, return zeroed stats
  if (calculationDate.getTime() < activatedDate.getTime()) {
    return {
      totalDays: 0,
      baseDays: 0,
      exceedDays: 0,
      baseInterest: 0,
      exceedInterest: 0,
      totalInterest: 0,
      totalAmountToPay: loan.principalAmount,
      totalPaid: 0,
      outstandingAmount: loan.principalAmount
    };
  }

  const finalEndDate = forceEndDate
    ? new Date(forceEndDate)
    : (loan.status === "COMPLETED" && loan.completedAt)
      ? new Date(loan.completedAt)
      : (loan.status === "DELETED" && loan.deletedAt)
        ? new Date(loan.deletedAt)
        : new Date();

  // Extract all events that signify a timeline boundary (Payments & Renewals)
  const settlementPayments = filteredPayments
    .filter((p: any) => p.type === "PRINCIPAL" || p.type === "INTEREST")
    .map((p: any) => ({ date: p.date, type: p.type, amount: p.amount }));

  const renewalEvents = filteredRenewals
    .map((r: any) => ({ date: r.date, type: "RENEWAL", amount: 0 }));

  const timelineEvents = [...settlementPayments, ...renewalEvents]
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentPrincipal = loan.principalAmount;
  let lastDate = activatedDate;

  // Dynamic Deadline Tracking
  let currentDeadline = loan.dueDate && loan.renewalCount === 0
    ? new Date(loan.dueDate)
    : new Date(activatedDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  let totalBaseInterest = 0;
  let totalExceedInterest = 0;
  let baseDaysTotal = 0;
  let exceedDaysTotal = 0;

  const getCalendarDays = (d1: Date, d2: Date) => {
    const startObj = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const endObj = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculatePeriod = (start: Date, end: Date, principal: number, deadline: Date) => {
    if (start.getTime() >= end.getTime() || principal <= 0) return;

    if (end.getTime() <= deadline.getTime()) {
      const days = getCalendarDays(start, end);
      baseDaysTotal += days;
      totalBaseInterest += Math.ceil((principal * loan.interestRate * days) / (365 * 100));

    } else if (start.getTime() >= deadline.getTime()) {
      const days = getCalendarDays(start, end);
      exceedDaysTotal += days;
      totalExceedInterest += Math.ceil((principal * (loan.penaltyRate || 20) * days) / (365 * 100));

    } else {
      const bDays = getCalendarDays(start, deadline);
      const eDays = getCalendarDays(deadline, end);
      baseDaysTotal += bDays;
      exceedDaysTotal += eDays;
      totalBaseInterest += Math.ceil((principal * loan.interestRate * bDays) / (365 * 100));
      totalExceedInterest += Math.ceil((principal * (loan.penaltyRate || 20) * eDays) / (365 * 100));
    }
  };

  for (const event of timelineEvents) {
    const eventDate = new Date(Math.max(lastDate.getTime(), Math.min(new Date(event.date).getTime(), finalEndDate.getTime())));

    if (eventDate.getTime() > lastDate.getTime()) {
      calculatePeriod(lastDate, eventDate, currentPrincipal, currentDeadline);
      lastDate = eventDate;
    }

    if (event.type === "PRINCIPAL") {
      currentPrincipal = Math.max(0, currentPrincipal - event.amount);
    } else if (event.type === "RENEWAL") {
      const renewalInfo = filteredRenewals.find((r: any) => new Date(r.date).getTime() === new Date(event.date).getTime());
      if (renewalInfo?.newDueDate) {
        currentDeadline = new Date(renewalInfo.newDueDate);
      }
    }
  }

  if (lastDate.getTime() < finalEndDate.getTime()) {
    calculatePeriod(lastDate, finalEndDate, currentPrincipal, currentDeadline);
  }

  const calculatedTotalInterest = totalBaseInterest + totalExceedInterest;

  // Point-in-time unpaid trackers
  const unpaidBaseInterest = Math.max(0, Math.ceil(totalBaseInterest) - (interestPaid || 0));
  const unpaidPenaltyInterest = Math.max(0, Math.ceil(totalExceedInterest) - (penaltyPaid || 0));
  const unpaidSC = Math.max(0, (loan.serviceChargeAmount || 0) - (scPaid || 0));
  
  // Reconstruct historical invoiced renewal fees
  const historicalInvoicedRenewal = filteredRenewals.reduce((sum: number, r: any) => sum + (r.renewalAmount || 0), 0);
  const unpaidRenewal = Math.max(0, historicalInvoicedRenewal - (renewalPaidTotal || 0));

  // The true historical principal outstanding
  const principalOutstanding = Math.max(0, loan.principalAmount - principalPaid);
  const outstandingAmount = Math.ceil(principalOutstanding + unpaidBaseInterest + unpaidPenaltyInterest + unpaidSC + unpaidRenewal);

  const totalAmountToPay = totalPaid + outstandingAmount;
  const daysSinceLastEvent = getCalendarDays(lastDate, finalEndDate);

  return {
    totalDays: baseDaysTotal + exceedDaysTotal,
    daysSinceLastEvent,
    baseDays: baseDaysTotal,
    exceedDays: exceedDaysTotal,
    baseInterest: Math.ceil(totalBaseInterest),
    exceedInterest: Math.ceil(totalExceedInterest),
    unpaidBaseInterest,
    unpaidPenaltyInterest,
    unpaidSC,
    unpaidRenewal,
    totalInterest: Math.ceil(calculatedTotalInterest),
    totalAmountToPay: Math.ceil(totalAmountToPay),
    totalPaid,
    outstandingAmount,
    principalOutstanding,
    isServiceChargePaid: (scPaid || 0) >= (loan.serviceChargeAmount || 0),
    isRenewalChargePaid: (loan.renewalAmount || 0) > 0 ? (renewalPaidTotal || 0) >= loan.renewalAmount : true
  };
}
