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

  const usersColl = mongoose.connection.db.collection("users");
  const orgsColl = mongoose.connection.db.collection("organizations");

  const user = await usersColl.findOne({ name: "Apsana Paudel" });
  if (user) {
    const org = await orgsColl.findOne({ _id: user.organizationId });
    console.log("Full Org Document:", JSON.stringify(org, null, 2));
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
