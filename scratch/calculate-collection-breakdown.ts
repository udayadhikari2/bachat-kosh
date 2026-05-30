import connectDB from "../lib/db";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";
import Aggregation from "../lib/models/Aggregation";
import BankLedger from "../lib/models/BankLedger";
import Organization from "../lib/models/Organization";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const org = await Organization.findById(orgId).lean();
    const initials = org?.financials || {};

    // 1. Deposits Sum by Type
    console.log("--- APPROVED DEPOSITS SUMMARY ---");
    const depositSummary = await Deposit.aggregate([
      { $match: { organizationId: org._id, status: "APPROVED" } },
      { $group: { _id: "$depositType", totalAmount: { $sum: "$amount" }, totalFine: { $sum: "$fineApplied" }, totalAdvance: { $sum: "$advancedPayment" }, totalCredit: { $sum: "$creditUsed" }, count: { $sum: 1 } } }
    ]);
    console.log(depositSummary);

    // 2. Loans Sum by Payment Type
    console.log("--- VERIFIED LOAN PAYMENTS SUMMARY ---");
    const loanSummary = await Loan.aggregate([
      { $match: { organizationId: org._id } },
      { $unwind: "$payments" },
      { $match: { "payments.verified": true } },
      { $group: { _id: "$payments.type", totalAmount: { $sum: "$payments.amount" }, count: { $sum: 1 } } }
    ]);
    console.log(loanSummary);

    // 3. Aggregations Sum by Type
    console.log("--- AGGREGATIONS SUMMARY ---");
    const aggSummary = await Aggregation.aggregate([
      { $match: { organizationId: org._id } },
      { $group: { _id: "$type", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);
    console.log(aggSummary);

    // 4. Bank Ledger Sums
    console.log("--- BANK LEDGER SUMMARY ---");
    const ledgerSummary = await BankLedger.aggregate([
      { $match: { organizationId: org._id } },
      { $group: { _id: null, totalBankInterest: { $sum: "$bankInterest" }, totalBankCharges: { $sum: "$bankCharges" }, totalExpenditure: { $sum: "$totalExpenditure" } } }
    ]);
    console.log(ledgerSummary);

    // Let's see what is counted in getAdminDepositStats upto:
    console.log("--- CALCULATING FROM ACTIONS MATH ---");
    // Deposits totals
    const monthlyDeposits = await Deposit.find({ organizationId: org._id, status: "APPROVED", depositType: { $in: ["MONTHLY", null] } }).lean();
    let monthlyDepAmt = 0;
    let monthlyDepFine = 0;
    let monthlyDepAdv = 0;
    let monthlyDepCredit = 0;
    for (const d of monthlyDeposits) {
      monthlyDepAmt += d.amount || 0;
      monthlyDepFine += d.fineApplied || 0;
      monthlyDepAdv += (d.advancedPayment || 0) - (d.creditUsed || 0);
      monthlyDepCredit += d.creditUsed || 0;
    }

    const scDeposits = await Deposit.find({ organizationId: org._id, status: "APPROVED", depositType: "SERVICE_CHARGE" }).lean();
    let scDepAmt = 0;
    for (const d of scDeposits) { scDepAmt += d.amount || 0; }

    const liDeposits = await Deposit.find({ organizationId: org._id, status: "APPROVED", depositType: "LOAN_INTEREST" }).lean();
    let liDepAmt = 0;
    for (const d of liDeposits) { liDepAmt += d.amount || 0; }

    // Loans totals
    let loanInterest = 0;
    let loanPenalty = 0;
    let loanRenewal = 0;
    let loanService = 0;
    let loanAdvance = 0;
    let loanOrg = 0;
    const allLoans = await Loan.find({ organizationId: org._id }).lean();
    for (const l of allLoans) {
      if (l.payments) {
        for (const p of l.payments) {
          if (p.verified) {
            if (p.type === "INTEREST") loanInterest += p.amount;
            else if (p.type === "PENALTY") loanPenalty += p.amount;
            else if (p.type === "RENEWAL") loanRenewal += p.amount;
            else if (p.type === "SERVICE_CHARGE") loanService += p.amount;
            else if (p.type === "ADVANCE") loanAdvance += p.amount;
            else if (p.type === "ORGANIZATION") loanOrg += p.amount;
          }
        }
      }
    }

    // Ledger bank interest
    const allLedgers = await BankLedger.find({ organizationId: org._id }).lean();
    let ledgerInterest = 0;
    for (const l of allLedgers) {
      ledgerInterest += l.bankInterest || 0;
    }

    console.log("monthlyDepAmt:", monthlyDepAmt);
    console.log("monthlyDepFine:", monthlyDepFine);
    console.log("monthlyDepAdv:", monthlyDepAdv);
    console.log("scDepAmt:", scDepAmt);
    console.log("liDepAmt:", liDepAmt);
    console.log("loanInterest:", loanInterest);
    console.log("loanPenalty:", loanPenalty);
    console.log("loanRenewal:", loanRenewal);
    console.log("loanService:", loanService);
    console.log("loanAdvance:", loanAdvance);
    console.log("loanOrg:", loanOrg);
    console.log("ledgerInterest:", ledgerInterest);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
