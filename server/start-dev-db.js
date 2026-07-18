import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('Starting in-memory MongoDB on port 27017 for development...');
try {
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'talentflow'
    }
  });
  console.log(`\n=================================================`);
  console.log(` Local In-Memory MongoDB running at:`);
  console.log(` ${mongoServer.getUri()}`);
  console.log(` Port: 27017, Database Name: talentflow`);
  console.log(` Keep this terminal window open to keep the DB alive!`);
  console.log(`=================================================\n`);
} catch (err) {
  console.error('Failed to start in-memory MongoDB:', err.message);
  process.exit(1);
}
