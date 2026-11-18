import { MongoClient, ServerApiVersion } from 'mongodb';

let client;
let db;

export async function getDb() {
  if (!db) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    db = client.db('socialEvents');
    await db
      .collection('joinedEvents')
      .createIndex({ eventId: 1, userEmail: 1 }, { unique: true });
  }
  return db;
}