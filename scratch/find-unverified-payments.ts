import connectDB from "../lib/db";
import Loan from "../lib/models/Loan";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const loans = await Loan.find({ organizationId: orgId }).lean();
    console.log("Unverified payments:");
    for (const l of loans) {
      if (l.payments) {
        for (const p of l.payments) {
          if (!p.verified) {
            console.log(`Loan ID: ${l._id}, Type: ${p.type}, Amount: ${p.amount}, Date: ${p.date}, Verified: ${p.verified}, Proof: ${p.proof}`);
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
