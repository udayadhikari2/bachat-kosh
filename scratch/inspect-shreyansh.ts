import connectDB from "../lib/db";
import User from "../lib/models/User";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const users = await User.find({ name: /Shreyansh/i }).lean();
    console.log("Shreyansh Adhikari records found:", users.length);
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
