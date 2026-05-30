import connectDB from "../lib/db";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";
import Notification from "../lib/models/Notification";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const userId = "6a12c740ab71560fa892dd09";

    // 1. Find deposits
    const deposits = await Deposit.find({ userId }).lean();
    console.log("Deposits for Shreyansh:", deposits);

    // 2. Find loans
    const loans = await Loan.find({ userId }).lean();
    console.log("Loans for Shreyansh:", loans);

    // 3. Find notifications
    const notifications = await Notification.find({ 
      $or: [
        { senderId: userId },
        { userId: userId }
      ]
    }).lean();
    console.log("Notifications for Shreyansh:", notifications);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
