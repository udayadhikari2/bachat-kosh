import connectDB from "../lib/db";
import Aggregation from "../lib/models/Aggregation";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const aggs = await Aggregation.find({ organizationId: orgId }).lean();
    console.log("All aggregations in DB:");
    console.log(JSON.stringify(aggs, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
