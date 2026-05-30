import connectDB from "../lib/db.js";
import User from "../lib/models/User.js";
import { getMemberActivity } from "../lib/actions/member.js";
import { getCurrentNepaliDate } from "../lib/utils/nepali-date.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const currentNepali = getCurrentNepaliDate();
    console.log("Current Nepali Date:", currentNepali);

    // Find any USER role user in the database
    const user = await User.findOne({ role: "USER" }).lean();
    if (!user) {
      console.log("No USER role user found in the database.");
      process.exit(0);
    }

    console.log(`Found User: ${user.name} (ID: ${user._id})`);
    
    // Run member activity
    const activity = await getMemberActivity(user._id.toString());
    if (activity.success) {
      console.log("Activity data loaded successfully!");
      console.log("Member Stats:", activity.data.stats);
      console.log("Organization Stats:", activity.data.orgStats);
    } else {
      console.error("Failed to load member activity:", activity.error);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
