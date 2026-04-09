import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const cluster = "hamro-bachat.25mfjtn.mongodb.net";
const uri = `mongodb+srv://${username}:${password}@${cluster}/hamro-bachat?retryWrites=true&w=majority`;

console.log("Attempting to connect to reconstructed URI...");

async function test() {
  try {
    await mongoose.connect(uri);
    console.log("SUCCESS");
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  }
}
test();
