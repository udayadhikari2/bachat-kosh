import connectDB from "../lib/db";
import User from "../lib/models/User";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const users = await User.find({ organizationId: orgId }).select("name role accountNumber email").sort({ accountNumber: 1 }).lean();
    console.log("All organization users sorted by account number:");
    console.log(users);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
