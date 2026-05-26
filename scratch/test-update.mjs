import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  const userId = new mongoose.Types.ObjectId("6a12c740ab71560fa892dcff");
  const usersColl = mongoose.connection.db.collection("users");

  const userBefore = await usersColl.findOne({ _id: userId });
  console.log("Before update:", userBefore.advanceBalance);

  const res = await usersColl.updateOne({ _id: userId }, {
    $inc: { advanceBalance: 1000 }
  });
  console.log("Update result:", res);

  const userAfter = await usersColl.findOne({ _id: userId });
  console.log("After update:", userAfter.advanceBalance);

  // Revert back
  await usersColl.updateOne({ _id: userId }, {
    $inc: { advanceBalance: -1000 }
  });
  console.log("Reverted.");

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
