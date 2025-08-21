const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection details
const username = 'praveents';
const password = 'EkafqheY5FzPgwyK';
const dbName = process.env.MY_DATABASE || 'testDatabase';
const mongoUri = `mongodb://${username}:${password}@localhost:27017`;

// MongoDB client
const client = new MongoClient(mongoUri);

// Function to execute raw MongoDB commands from a file
const executeRawCommands = async (filePath, db) => {
  console.log(`Processing file: ${filePath}`);
  
  // Read the content of the file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const commands = fileContent.split(';\n').filter((cmd) => cmd.trim() !== ''); // Split commands by `;`

  for (const command of commands) {
    try {
      console.log(`Executing: ${command}`);
      await eval(`(async () => { ${command} })()`);
    } catch (err) {
      console.error(`Error executing command: ${command}`, err);
      throw err;
    }
  }
};

// Function to load and run migration files from a directory
const loadAndRunReleases = async (releaseDir, db) => {
  const releasePath = path.resolve(__dirname, releaseDir); // Resolve the full path to the release directory
  console.log('Scanning releases directory:', releasePath); // Debug log the path being scanned

  try {
    const versions = fs.readdirSync(releasePath); // Read all subdirectories (versions) inside
    for (const version of versions) {
      const migrationFilePath = path.join(releasePath, version, 'mongodb.js'); // Locate the mongodb.js file
      if (fs.existsSync(migrationFilePath)) {
        console.log(`Applying migration for version: ${version}`);
        await executeRawCommands(migrationFilePath, db); // Execute the commands in the file
        console.log(`Migration for version ${version} applied successfully.`);
      } else {
        console.warn(`No mongodb.js file found for release version ${version}`);
      }
    }
  } catch (err) {
    console.error(`Failed to scan or process directory: ${releasePath}`, err);
    throw err;
  }
};

// Main function to run migrations
const runMigrations = async () => {
  try {
    // Connect to the database
    console.log(`Connecting to MongoDB database: ${dbName}`);
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to database: ${dbName}`);

    // Load and apply weekly releases
    console.log('Applying Weekly Releases...');
    await loadAndRunReleases('../releases/weekly', db);

    // Load and apply monthly releases
    console.log('Applying Monthly Releases...');
    await loadAndRunReleases('../releases/monthly', db);

    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed!', err);
  } finally {
    // Ensure the MongoDB connection is closed
    await client.close();
    console.log('🔒 MongoDB connection closed.');
  }
};

// Run the migrations
runMigrations();
