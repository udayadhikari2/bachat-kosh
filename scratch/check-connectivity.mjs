import mongoose from 'mongoose';
import dns from 'dns';
import { promisify } from 'util';

const resolveSrv = promisify(dns.resolveSrv);
const resolve4 = promisify(dns.resolve4);

async function checkConnectivity() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("ERROR: MONGO_URL not found in environment.");
    process.exit(1);
  }

  console.log("--- Connectivity Diagnostic ---");
  console.log(`URL format check: ${mongoUrl.startsWith('mongodb+srv') ? 'SRV detected' : 'Standard detected'}`);
  
  // 1. DNS Test
  try {
    console.log("1. Testing DNS Resolution...");
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    const host = mongoUrl.split('@')[1]?.split('/')[0];
    console.log(`Target Host: ${host}`);
    
    if (host.includes('mongodb.net')) {
      const srvs = await resolveSrv(`_mongodb._tcp.${host}`);
      console.log("SRV Records found:", srvs.length);
      for (const record of srvs) {
        console.log(` - Node: ${record.name}:${record.port}`);
        const ips = await resolve4(record.name);
        console.log(`   IPs: ${ips.join(', ')}`);
      }
    }
  } catch (dnsErr) {
    console.error("DNS RESOLUTION FAILED:", dnsErr.message);
  }

  // 2. Connection Test
  try {
    console.log("\n2. Testing Database Connection...");
    await mongoose.connect(mongoUrl, { 
      connectTimeoutMS: 5000,
      family: 4 
    });
    console.log("SUCCESS: Database connection established.");
    await mongoose.disconnect();
  } catch (connErr) {
    console.error("CONNECTION FAILED:", connErr.message);
    
    if (connErr.message.includes('ECONNREFUSED')) {
      console.log("\nRECOMMENDATION: This error usually means the connection was rejected.");
      console.log(" - Action: Log in to Atlas and ensure your IP is whitelisted (Network Access).");
      console.log(" - Action: Verify port 27017 is not blocked by your router/firewall.");
    }
  }
}

// Ensure we have access to .env
import pkg from 'dotenv';
pkg.config();

checkConnectivity();
