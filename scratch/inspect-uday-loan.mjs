import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const getCalendarDays = (d1, d2) => {
  const startObj = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const endObj = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diff = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`  [getCalendarDays] d1: ${d1.toISOString()} (${d1.toLocaleDateString()}) -> d2: ${d2.toISOString()} (${d2.toLocaleDateString()}) => diff: ${diff}`);
  return diff;
};

function calculateLoanStats(loan, forceEndDate) {
  const calculationDate = forceEndDate ? new Date(forceEndDate) : new Date();
  
  const filteredPayments = (loan.payments || []).filter((p) => new Date(p.date).getTime() <= calculationDate.getTime());
  const filteredRenewals = (loan.renewalHistory || []).filter((r) => new Date(r.date).getTime() <= calculationDate.getTime());

  const principalPaid = filteredPayments.filter((p) => p.type === "PRINCIPAL").reduce((sum, p) => sum + p.amount, 0);
  const interestPaid = filteredPayments.filter((p) => p.type === "INTEREST").reduce((sum, p) => sum + p.amount, 0);
  const penaltyPaid = filteredPayments.filter((p) => p.type === "PENALTY").reduce((sum, p) => sum + p.amount, 0);
  const scPaid = filteredPayments.filter((p) => p.type === "SERVICE_CHARGE").reduce((sum, p) => sum + p.amount, 0);
  const renewalPaidTotal = filteredPayments.filter((p) => p.type === "RENEWAL").reduce((sum, p) => sum + p.amount, 0);
  
  const totalPaid = filteredPayments
    .filter((p) => p.type !== "ADVANCE" && p.type !== "ORGANIZATION")
    .reduce((sum, p) => sum + p.amount, 0);

  const activatedDate = new Date(loan.activatedAt);
  const finalEndDate = forceEndDate
    ? new Date(forceEndDate)
    : (loan.status === "COMPLETED" && loan.completedAt)
      ? new Date(loan.completedAt)
      : (loan.status === "DELETED" && loan.deletedAt)
        ? new Date(loan.deletedAt)
        : new Date();

  console.log(`activatedDate: ${activatedDate.toISOString()}`);
  console.log(`finalEndDate: ${finalEndDate.toISOString()}`);

  const settlementPayments = filteredPayments
    .filter((p) => p.type === "PRINCIPAL" || p.type === "INTEREST")
    .map((p) => ({ date: p.date, type: p.type, amount: p.amount }));

  const renewalEvents = filteredRenewals
    .map((r) => ({ date: r.date, type: "RENEWAL", amount: 0 }));

  const timelineEvents = [...settlementPayments, ...renewalEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentPrincipal = loan.principalAmount;
  let lastDate = activatedDate;

  let currentDeadline = loan.dueDate && loan.renewalCount === 0
    ? new Date(loan.dueDate)
    : new Date(activatedDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  let totalBaseInterest = 0;
  let totalExceedInterest = 0;
  let baseDaysTotal = 0;
  let exceedDaysTotal = 0;

  const calculatePeriod = (start, end, principal, deadline) => {
    if (start.getTime() >= end.getTime() || principal <= 0) return;
    console.log(`calculatePeriod: start: ${start.toISOString()} -> end: ${end.toISOString()}`);

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
    console.log(`Timeline event: type: ${event.type}, eventDate: ${eventDate.toISOString()}`);

    if (eventDate.getTime() > lastDate.getTime()) {
      calculatePeriod(lastDate, eventDate, currentPrincipal, currentDeadline);
      lastDate = eventDate;
    }

    if (event.type === "PRINCIPAL") {
      currentPrincipal = Math.max(0, currentPrincipal - event.amount);
    } else if (event.type === "RENEWAL") {
      const renewalInfo = filteredRenewals.find((r) => new Date(r.date).getTime() === new Date(event.date).getTime());
      if (renewalInfo?.newDueDate) {
        currentDeadline = new Date(renewalInfo.newDueDate);
      }
    }
  }

  if (lastDate.getTime() < finalEndDate.getTime()) {
    console.log("Timeline End: calculating final period");
    calculatePeriod(lastDate, finalEndDate, currentPrincipal, currentDeadline);
  }

  const daysSinceLastEvent = getCalendarDays(lastDate, finalEndDate);
  console.log(`daysSinceLastEvent: ${daysSinceLastEvent}`);
  console.log(`totalDays: ${baseDaysTotal + exceedDaysTotal}`);
}

async function run() {
  await mongoose.connect(MONGO_URL);

  const usersColl = mongoose.connection.db.collection("users");
  const loansColl = mongoose.connection.db.collection("loans");

  const uday = await usersColl.findOne({ name: /Uday/i });
  const activeLoan = await loansColl.findOne({ userId: uday._id, status: "ACTIVE" });

  calculateLoanStats(activeLoan);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
