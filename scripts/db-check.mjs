import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function check() {
  await mongoose.connect(MONGO_URL);
  const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
    password: { type: String, select: true },
    role: String
  }));

  const users = await User.find({});
  console.log("USERS IN DATABASE:");
  users.forEach(u => {
    console.log(`- ${u.email} (${u.role}) | Hash: ${u.password ? u.password.substring(0, 10) + "..." : "NONE"}`);
  });
  process.exit(0);
}

check();
