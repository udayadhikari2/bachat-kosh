import mongoose from "mongoose";
import dns from "dns";

// DNS Bridge — must run at module init time on the server
if (typeof window === "undefined" && !process.env.VERCEL) {
  try {
    // Point to reliable public DNS to resolve MongoDB SRV records
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  } catch (err) {
    console.warn("[DB_DNS_WARN]:", err);
  }
}

const MONGODB_URI = process.env.MONGO_URL || "";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGO_URL environment variable inside .env");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Return existing connection immediately if connected
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection has been closed, reset cached states to force reconnection
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 — prevents dual-stack SRV resolution issues
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("[DB] Connection established.");
        return m;
      })
      .catch(async (err) => {
        console.error("[DB] First connection attempt failed:", err.message);
        // Reset and try once more
        cached.promise = null;
        if (!process.env.VERCEL) {
          // Re-apply DNS bridge in case it wasn't set yet
          try {
            dns.setServers(["8.8.8.8", "8.8.4.4"]);
            dns.setDefaultResultOrder?.("ipv4first");
          } catch (dnsErr) {
            console.warn("[DB_DNS_RETRY_WARN]:", dnsErr);
          }
        }
        // Retry
        return mongoose.connect(MONGODB_URI, opts).then((m) => {
          console.log("[DB] Retry connection established.");
          return m;
        });
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
