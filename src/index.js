const { MongoClient } = require("mongodb");
const { Mongock } = require("@mongock/core");
const { MongoDbDriver } = require("@mongock/mongodb-driver");
const fs = require("fs");
const path = require("path");

/**
 * MongoDB Connection Details (for POC only)
 */
const username = "praveents";
const password = "EkafqheY5FzPgwyK";
const databaseName = process.env.MY_DATABASE || "testDatabase"; // Default DB
const mongoUri = `mongodb://${username}:${password}@localhost:27017`; // MongoDB URI
const client = new MongoClient(mongoUri);

/**
 * Function to Execute Raw MongoDB Commands
 * Reads content of `mongodb.js` and executes its commands line by line
 */
const executeRawCommands = async (filePath, db) => {
  try {
    // Read file content synchronously
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const commands = fileContent.split(";\n").filter((cmd) => cmd.trim() !== ""); // Split commands by ';'

    // Execute each command using the `db` object
    for (const command of commands) {
      console.log(`Executing: ${command}`);
      await eval(`(async () => { ${command} })()`);
    }

    console.log(`✅ Migration for ${filePath} applied successfully.`);
  } catch (error) {
    console.error(`❌ Failed to execute commands from ${filePath}:`, error);
    throw error;
  }
};

/**
 * Function to Load and Run Migrations from Release Folders
 */
const loadAndRunReleases = async (releaseDir, db) => {
  const releasePath = path.resolve(__dirname, releaseDir);
  const versions = fs.readdirSync(releasePath);

  for (const version of versions) {
    const migrationFilePath = path.resolve(releasePath, version, "mongodb.js");
    if (fs.existsSync(migrationFilePath)) {
      console.log(`Applying migration from: ${migrationFilePath}`);
      await executeRawCommands(migrationFilePath, db); // Execute the file
    } else {
      console.warn(`No migration file found for release ${version}`);
    }
  }
};

/**
 * Main Runner Function
 */
const runMigrations = async () => {
  try {
    await client.connect();
    const db = client.db(databaseName); // Connect to the specified database
    console.log(`Connected to MongoDB database: ${databaseName}`);

    // Mongock setup to track migrations
    const driver = new MongoDbDriver(client, db);
    const mongock = new Mongock({ driver });

    // Apply weekly releases
    console.log("Starting weekly migrations...");
    await loadAndRunReleases("../releases/weekly", db);

    // Apply monthly releases
    console.log("Starting monthly migrations...");
    await loadAndRunReleases("../releases/monthly", db);

    console.log("All migrations executed successfully!");
  } catch (error) {
    console.error("❌ Migration process failed:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
};

// Run the migrations
runMigrations();
