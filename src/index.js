const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection details
const username = 'praveents';
const password = 'EkafqheY5FzPgwyK';
const dbName = process.env.MY_DATABASE || 'testDatabase';
const mongoUri = `mongodb://${username}:${password}@localhost:27017`;

// MongoDB client
let client;

// Function to execute MongoDB raw commands from a file
const executeRawCommands = async (filePath, db) => {
  console.log(`Processing file: ${filePath}`);

  // Read file content
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const commands = fileContent.split(';\n').filter((cmd) => cmd.trim() !== ''); // Split commands by `;`

  // Execute each command
  for (const command of commands) {
    try {
      console.log(`Executing: ${command}`);
      // Make db available in the eval context and ensure proper async handling
      await eval(`(async () => { 
        const db = arguments[0]; 
        ${command} 
      })()`).call(null, db);
    } catch (err) {
      console.error(`Error executing command: ${command}`, err);
      throw err;
    }
  }
};

// Function to load and run migration files from a directory
const loadAndRunReleases = async (releaseDir, db) => {
  const releasePath = path.resolve(releaseDir); // Resolve the absolute path for the directory
  console.log('Scanning releases directory:', releasePath);

  try {
    const versions = fs.readdirSync(releasePath); // Get all version subdirectories

    // Execute migrations sequentially to avoid session conflicts
    for (const version of versions) {
      const migrationFilePath = path.join(releasePath, version, 'mongodb.js'); // Compute the path to `mongodb.js`

      if (fs.existsSync(migrationFilePath)) {
        console.log(`Applying migration for version: ${version}`);
        await executeRawCommands(migrationFilePath, db); // Execute sequentially
      } else {
        console.warn(`No mongodb.js file found for release version ${version}`);
      }
    }
  } catch (err) {
    console.error(`Failed to scan or process directory: ${releasePath}`, err);
    throw err;
  }

  console.log(`All migrations for ${releaseDir} completed.`);
};

// Main function to run migrations
const runMigrations = async () => {
  try {
    // Connect to MongoDB
    client = new MongoClient(mongoUri); // Initialize MongoDB client
    console.log(`Connecting to MongoDB database: ${dbName}`);
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to database: ${dbName}`);

    const baseReleasesPath = path.resolve(__dirname, '../releases'); // Base path for releases

    // Run all weekly migrations
    console.log('Applying Weekly Releases...');
    await loadAndRunReleases(path.join(baseReleasesPath, 'weekly'), db);

    // Run all monthly migrations
    console.log('Applying Monthly Releases...');
    await loadAndRunReleases(path.join(baseReleasesPath, 'monthly'), db);

    console.log('All migrations completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed!', err);
  } finally {
    try {
      console.log('Closing database connections...');
      if (client) {
        await client.close(); // Close the MongoDB client connection
        console.log('🔒 MongoDB connection has been closed.');
      }
    } catch (err) {
      console.error('Error while closing MongoDB connection:', err);
    }
  }
};

// Run the migrations
runMigrations();
