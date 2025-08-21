const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection configuration
const username = 'praveents';
const password = 'EkafqheY5FzPgwyK';
const databaseName = process.env.MY_DATABASE || 'testDatabase';
const mongoUri = `mongodb://${username}:${password}@localhost:27017`;

const client = new MongoClient(mongoUri);

// Function to execute MongoDB raw commands
const executeRawCommands = async (filePath, db) => {
  console.log(`Processing file: ${filePath}`);
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

// Function to load and run migration files from a release folder
const loadAndRunReleases = async (releaseDir, db) => {
  const releasePath = path.resolve(releaseDir);
  const versions = fs.readdirSync(releasePath); // List all release folders

  for (const version of versions) {
    const migrationFilePath = path.join(releasePath, version, 'mongodb.js');
    if (fs.existsSync(migrationFilePath)) {
      console.log(`Applying migration for version: ${version}`);
      await executeRawCommands(migrationFilePath, db); // Execute the file
      console.log(`Migration for version ${version} applied successfully.`);
    } else {
      console.warn(`No migration file found for version ${version}`);
    }
  }
};

// Main runner function
const runMigrations = async () => {
  try {
    await client.connect(); // Connect to MongoDB
    const db = client.db(databaseName);

    console.log(`Connected to database: ${databaseName}`);

    // Apply Weekly Releases
    console.log('Applying Weekly Releases...');
    await loadAndRunReleases('../releases/weekly', db);

    // Apply Monthly Releases
    console.log('Applying Monthly Releases...');
    await loadAndRunReleases('../releases/monthly', db);

    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed!', err);
  } finally {
    await client.close();
    console.log('🔒 MongoDB connection closed.');
  }
};

// Run migrations
runMigrations();
