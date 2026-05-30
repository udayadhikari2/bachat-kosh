import connectDB from "../lib/db";
import Loan from "../lib/models/Loan";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const loans = await Loan.find({ organizationId: orgId }).lean();
    
    console.log("Verified payments:");
    const types = new Map();
    const list = [];
    
    for (const l of loans) {
      if (l.payments) {
        for (const p of l.payments) {
          if (p.verified) {
            types.set(p.type, (types.get(p.type) || 0) + p.amount);
            list.push({
              loanId: l._id,
              type: p.type,
              amount: p.amount,
              date: p.date,
              proof: p.proof
            });
          }
        }
      }
    }

    console.log("Grouped by type:", types);
    console.log("Detailed payments list:");
    console.log(JSON.stringify(list, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
