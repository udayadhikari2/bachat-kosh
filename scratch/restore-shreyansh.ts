import connectDB from "../lib/db";
import User from "../lib/models/User";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const userId = "6a12c740ab71560fa892dd09";
    
    const result = await User.findByIdAndUpdate(userId, {
      $set: {
        role: "USER",
        accountNumber: "800420",
        email: "shreyansh@temp.com",
        gender: "Male",
        address: {
          street: "Bardaghat-14",
          city: "Belahani",
          state: null,
          zip: "33000"
        }
      }
    }, { new: true });

    console.log("Updated User Document:");
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
