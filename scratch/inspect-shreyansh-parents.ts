import connectDB from "../lib/db";
import User from "../lib/models/User";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const parents = await User.find({
      _id: { $in: ["6a12c740ab71560fa892dd07", "6a12c740ab71560fa892dd08"] }
    }).lean();
    console.log("Parents found:", parents.length);
    console.log(JSON.stringify(parents, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
