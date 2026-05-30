import connectDB from "../lib/db";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const deposits = await Deposit.find({
      organizationId: orgId,
      $or: [
        { amount: 90 },
        { fineApplied: 90 },
        { advancedPayment: 90 },
        { creditUsed: 90 }
      ]
    });
    console.log("Deposits with 90:", deposits);

    const loans = await Loan.find({
      organizationId: orgId,
      "payments.amount": 90
    });
    console.log("Loans with 90 payments:", loans);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
