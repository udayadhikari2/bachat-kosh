import connectDB from "../lib/db";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";
import Aggregation from "../lib/models/Aggregation";
import BankLedger from "../lib/models/BankLedger";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    console.log("Searching for 92...");
    
    // Find all deposits with amount, fineApplied, advancedPayment or creditUsed involving 92
    const deposits = await Deposit.find({
      organizationId: orgId,
      $or: [
        { amount: 92 },
        { fineApplied: 92 },
        { advancedPayment: 92 },
        { creditUsed: 92 }
      ]
    });
    console.log("Deposits with 92:", deposits);

    // Find all loan payments with amount involving 92
    const loans = await Loan.find({
      organizationId: orgId,
      "payments.amount": 92
    });
    console.log("Loans with 92 payments:", loans.length);

    // Look for any numbers ending in .79 or with 92 in decimal
    const allDeposits = await Deposit.find({ organizationId: orgId, status: "APPROVED" });
    console.log("Checking decimals in deposits...");
    allDeposits.forEach(d => {
      if (d.amount % 1 !== 0 || d.fineApplied % 1 !== 0 || d.advancedPayment % 1 !== 0 || d.creditUsed % 1 !== 0) {
        console.log("Non-integer deposit:", d._id, d.depositType, d.amount, d.fineApplied, d.advancedPayment, d.creditUsed, d.month);
      }
    });

    const allLoans = await Loan.find({ organizationId: orgId });
    console.log("Checking decimals in loan payments...");
    allLoans.forEach(l => {
      if (l.payments) {
        l.payments.forEach((p: any) => {
          if (p.amount % 1 !== 0) {
            console.log("Non-integer loan payment:", l._id, p.type, p.amount, p.date);
          }
        });
      }
    });

    console.log("Checking bank ledgers...");
    const ledgers = await BankLedger.find({ organizationId: orgId });
    ledgers.forEach(l => {
      console.log(`Ledger ${l.month}: closing=${l.closingBalance}, bankInterest=${l.bankInterest}, bankCharges=${l.bankCharges}, deposits=${l.totalDeposits}, repaid=${l.totalLoanRepaid}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
