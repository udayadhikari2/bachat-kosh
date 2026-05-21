import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

// Fix DNS resolution issues
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ Error: MONGO_URL is not defined in .env");
  process.exit(1);
}

// Parse target DB name from argument, defaulting to "bachat-kosh"
const targetDbName = process.argv[2] || "bachat-kosh";
const sourceDbName = "test";

if (targetDbName === sourceDbName) {
  console.error(`❌ Error: Source and Target database names must be different. Both are "${sourceDbName}".`);
  process.exit(1);
}

async function migrate() {
  try {
    console.log(`Connecting to MongoDB cluster...`);
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB cluster.");

    const conn = mongoose.connection;

    // 1. Verify source database exists and contains collections
    const sourceDb = conn.useDb(sourceDbName);
    const collections = await sourceDb.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log(`⚠️ Source database "${sourceDbName}" has no collections. Nothing to migrate.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\nFound ${collections.length} collections in "${sourceDbName}":`);
    for (const col of collections) {
      const count = await sourceDb.db.collection(col.name).countDocuments();
      console.log(` - ${col.name}: ${count} documents`);
    }

    console.log(`\nStarting migration to target database "${targetDbName}"...`);
    const targetDb = conn.useDb(targetDbName);

    for (const col of collections) {
      const colName = col.name;
      const srcCollection = sourceDb.db.collection(colName);
      const destCollection = targetDb.db.collection(colName);

      const totalDocs = await srcCollection.countDocuments();
      console.log(`\nProcessing collection [${colName}] (${totalDocs} documents):`);

      if (totalDocs === 0) {
        console.log(` -> Skipping empty collection [${colName}].`);
        continue;
      }

      // Check if target collection already has data
      const destCount = await destCollection.countDocuments();
      if (destCount > 0) {
        console.log(` ⚠️ Target collection [${colName}] already has ${destCount} documents.`);
        console.log(`    Clearing existing target collection data to prevent duplicates...`);
        await destCollection.deleteMany({});
      }

      // Read all documents from source
      console.log(` -> Fetching documents from [${sourceDbName}.${colName}]...`);
      const docs = await srcCollection.find({}).toArray();

      // Write to target
      console.log(` -> Inserting ${docs.length} documents into [${targetDbName}.${colName}]...`);
      await destCollection.insertMany(docs);
      console.log(` -> Successfully copied documents.`);

      // Copy indexes
      console.log(` -> Copying indexes for [${colName}]...`);
      const indexes = await srcCollection.indexes();
      for (const idx of indexes) {
        if (idx.name === "_id_") continue; // Skip default primary key index
        
        const { key, name, ...rawOptions } = idx;
        const indexOptions = { name };

        // Clean options: skip null/undefined values and system fields like 'ns' and 'v'
        for (const [optKey, optVal] of Object.entries(rawOptions)) {
          if (optKey === "ns" || optKey === "v" || optVal === null || optVal === undefined) {
            continue;
          }
          indexOptions[optKey] = optVal;
        }

        console.log(`    - Recreating index: ${name} (options: ${JSON.stringify(indexOptions)})`);
        await destCollection.createIndex(key, indexOptions);
      }
      console.log(` -> Index recreation completed.`);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 MIGRATION SUCCESSFUL!`);
    console.log(`All collections, data, and indexes copied to "${targetDbName}".`);
    console.log(`======================================================`);
    
    // Print verification comparison
    console.log(`\nVerification Comparison:`);
    let verificationSuccess = true;
    for (const col of collections) {
      const srcCount = await sourceDb.db.collection(col.name).countDocuments();
      const destCount = await targetDb.db.collection(col.name).countDocuments();
      const match = srcCount === destCount ? "✅ MATCH" : "❌ MISMATCH";
      if (srcCount !== destCount) verificationSuccess = false;
      console.log(` - ${col.name}: Source=${srcCount} | Target=${destCount} (${match})`);
    }

    if (!verificationSuccess) {
      console.warn("\n⚠️ Warning: Some document counts do not match! Please check the logs.");
    }

    // Instruct user on how to update .env
    const baseUri = MONGO_URL.split("?")[0];
    const params = MONGO_URL.includes("?") ? `?${MONGO_URL.split("?")[1]}` : "";
    
    // Format the new MONGO_URL
    let newUri;
    if (baseUri.endsWith("/")) {
      newUri = `${baseUri}${targetDbName}${params}`;
    } else {
      // Check if it already has a trailing database name or just ends at host
      const hostPart = baseUri.replace("mongodb+srv://", "").split("/")[0];
      newUri = `mongodb+srv://${MONGO_URL.split("@")[0].replace("mongodb+srv://", "")}@${hostPart}/${targetDbName}${params}`;
    }

    console.log(`\n👉 NEXT STEP: Update your .env file's MONGO_URL variable to point to the new database:`);
    console.log(`\nChange the line:`);
    console.log(`MONGO_URL="${MONGO_URL}"`);
    console.log(`\nTo:`);
    console.log(`MONGO_URL="${newUri}"`);
    console.log(`\n======================================================`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
}

migrate();
