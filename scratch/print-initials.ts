import connectDB from "../lib/db";
import Organization from "../lib/models/Organization";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const org = await Organization.findById(orgId).lean();
    console.log("Organization Financials:");
    console.log(org?.financials);
    console.log("Organization Config:");
    console.log(org?.config);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
