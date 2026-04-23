/**
 * instrumentation.ts — Next.js Server Startup Hook
 *
 * This file runs once when the Next.js server process starts.
 * We use it to pre-warm the MongoDB connection so that the very first
 * incoming request never hits a cold-start ECONNREFUSED error from
 * the SRV DNS resolution.
 */
export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // Force DNS to use reliable resolvers BEFORE any Mongoose connect call
      const dns = await import("dns");
      dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
      if (typeof dns.setDefaultResultOrder === "function") {
        dns.setDefaultResultOrder("ipv4first");
      }

      console.log("[INSTRUMENTATION] DNS bridge configured.");

      // Pre-warm the MongoDB connection
      const connectDB = (await import("@/lib/db")).default;
      await connectDB();
      console.log("[INSTRUMENTATION] MongoDB pre-warm: SUCCESS.");
    } catch (err: any) {
      // Non-fatal: the app will still work, just first request may be slower
      console.warn("[INSTRUMENTATION] MongoDB pre-warm failed:", err.message);
    }
  }
}
