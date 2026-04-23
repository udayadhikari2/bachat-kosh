export function calculateLoanStats(loan: any, forceEndDate?: Date) {
  const totalPaid = (loan.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

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
  // Penalty starts after the Current Deadline (dueDate). Fallback to 180 days if missing.
  const penaltyDate = loan.dueDate
    ? new Date(loan.dueDate)
    : new Date(activatedDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  const finalEndDate = forceEndDate
    ? new Date(forceEndDate)
    : (loan.status === "COMPLETED" && loan.completedAt)
      ? new Date(loan.completedAt)
      : (loan.status === "DELETED" && loan.deletedAt)
        ? new Date(loan.deletedAt)
        : new Date();

  // Extract all events that signify a timeline boundary (Payments & Renewals)
  const settlementPayments = (loan.payments || [])
    .filter((p: any) => p.type === "PRINCIPAL" || p.type === "INTEREST")
    .map((p: any) => ({ date: p.date, type: p.type, amount: p.amount }));

  const renewalEvents = (loan.renewalHistory || [])
    .map((r: any) => ({ date: r.date, type: "RENEWAL", amount: 0 }));

  const timelineEvents = [...settlementPayments, ...renewalEvents]
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentPrincipal = loan.principalAmount;
  let lastDate = activatedDate;

  // Dynamic Deadline Tracking: Start with the initial deadline and update on each renewal
  // Initial deadline is usually activatedAt + 180 days (standard policy)
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

    // Check intersection with the deadline active AT THAT TIME
    if (end.getTime() <= deadline.getTime()) {
      // All base
      const days = getCalendarDays(start, end);
      baseDaysTotal += days;
      totalBaseInterest += Math.ceil((principal * loan.interestRate * days) / (365 * 100));

    } else if (start.getTime() >= deadline.getTime()) {
      // All exceed
      const days = getCalendarDays(start, end);
      exceedDaysTotal += days;
      totalExceedInterest += Math.ceil((principal * (loan.penaltyRate || 20) * days) / (365 * 100));

    } else {
      // Split over the boundary
      const bDays = getCalendarDays(start, deadline);
      const eDays = getCalendarDays(deadline, end);
      baseDaysTotal += bDays;
      exceedDaysTotal += eDays;
      totalBaseInterest += Math.ceil((principal * loan.interestRate * bDays) / (365 * 100));
      totalExceedInterest += Math.ceil((principal * (loan.penaltyRate || 20) * eDays) / (365 * 100));

    }
  };

  for (const event of timelineEvents) {
    // Bound the event date to not exceed the final calculation date
    const eventDate = new Date(Math.max(lastDate.getTime(), Math.min(new Date(event.date).getTime(), finalEndDate.getTime())));

    if (eventDate.getTime() > lastDate.getTime()) {
      // Use the deadline that was active BEFORE this event happened
      calculatePeriod(lastDate, eventDate, currentPrincipal, currentDeadline);
      lastDate = eventDate;
    }

    // Update state based on event type
    if (event.type === "PRINCIPAL") {
      currentPrincipal = Math.max(0, currentPrincipal - event.amount);
    } else if (event.type === "RENEWAL") {
      // A renewal shifts the deadline for ALL SUBSEQUENT periods
      // The timelineEvents array already includes the newDueDate from history
      const renewalInfo = (loan.renewalHistory || []).find((r: any) => new Date(r.date).getTime() === new Date(event.date).getTime());
      if (renewalInfo?.newDueDate) {
        currentDeadline = new Date(renewalInfo.newDueDate);
      }
    }
  }

  // Final period from the last event up to the calculation end date (Now, Completed, or Deleted)
  if (lastDate.getTime() < finalEndDate.getTime()) {
    calculatePeriod(lastDate, finalEndDate, currentPrincipal, currentDeadline);
  }

  const calculatedTotalInterest = totalBaseInterest + totalExceedInterest;

  // Prevent negative unpaid trackers
  const unpaidBaseInterest = Math.max(0, Math.ceil(totalBaseInterest) - (loan.interestPaid || 0));
  const unpaidPenaltyInterest = Math.max(0, Math.ceil(totalExceedInterest) - (loan.penaltyPaid || 0));

  const unpaidSC = Math.max(0, (loan.serviceChargeAmount || 0) - (loan.serviceChargePaid || 0));
  const unpaidRenewal = Math.max(0, (loan.renewalAmount || 0) - (loan.renewalPaid || 0));

  // The true outstanding is active balance + all unpaid accruals
  const outstandingAmount = Math.ceil((loan.balanceAmount ?? loan.principalAmount) + unpaidBaseInterest + unpaidPenaltyInterest + unpaidSC + unpaidRenewal);

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
    totalInterest: Math.ceil(calculatedTotalInterest),
    totalAmountToPay: Math.ceil(totalAmountToPay),
    totalPaid,
    outstandingAmount,
    isServiceChargePaid: (loan.serviceChargePaid || 0) >= (loan.serviceChargeAmount || 0),
    isRenewalChargePaid: (loan.renewalAmount || 0) > 0 ? (loan.payments || []).filter((p: any) => p.type === 'RENEWAL').reduce((sum: number, p: any) => sum + p.amount, 0) >= loan.renewalAmount : true
  };
}
