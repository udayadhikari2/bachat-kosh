/**
 * Finance Engine for Bachat
 * Handles interest and penalty calculations
 */

export const FINANCE_CONFIG = {
  DAYS_IN_YEAR: 365,
  LOAN_PERIOD_DAYS: 180,
};

/**
 * Calculate daily interest based on principal and annual interest rate.
 * Formula: (Principal * Rate * Days) / (365 * 100)
 */
export function calculateInterest(
  principal: number,
  annualRate: number,
  days: number
): number {
  if (principal <= 0 || days <= 0) return 0;
  return (principal * annualRate * days) / (FINANCE_CONFIG.DAYS_IN_YEAR * 100);
}

/**
 * Calculate penalty for delayed repayment.
 * Applies a higher rate (e.g. 20%) on the principal for the delayed days.
 */
export function calculatePenalty(
  principal: number,
  penaltyRate: number,
  delayedDays: number
): number {
  if (principal <= 0 || delayedDays <= 0) return 0;
  return (principal * penaltyRate * delayedDays) / (FINANCE_CONFIG.DAYS_IN_YEAR * 100);
}

/**
 * Calculate late fee for deposits.
 * Usually a flat monthly fee.
 */
export function calculateLateFee(baseAmount: number, monthsLate: number): number {
  return baseAmount * monthsLate;
}

/**
 * Summary helper for a loan's current status
 */
export function getLoanSnapshot(
  principal: number,
  activatedAt: Date,
  interestRate: number,
  penaltyRate: number,
  today: Date = new Date()
) {
  const diffTime = Math.abs(today.getTime() - activatedAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let totalInterest = 0;
  let totalPenalty = 0;
  let isOverdue = false;
  let delayedDays = 0;

  if (diffDays <= FINANCE_CONFIG.LOAN_PERIOD_DAYS) {
    totalInterest = calculateInterest(principal, interestRate, diffDays);
  } else {
    // Normal interest for first 180 days
    totalInterest = calculateInterest(
      principal,
      interestRate,
      FINANCE_CONFIG.LOAN_PERIOD_DAYS
    );
    // Penalty interest for remaining days
    delayedDays = diffDays - FINANCE_CONFIG.LOAN_PERIOD_DAYS;
    totalPenalty = calculatePenalty(principal, penaltyRate, delayedDays);
    isOverdue = true;
  }

  return {
    daysElapsed: diffDays,
    interest: totalInterest,
    penalty: totalPenalty,
    totalPayable: principal + totalInterest + totalPenalty,
    isOverdue,
    delayedDays,
  };
}
