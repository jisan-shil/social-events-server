import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion } from 'mongodb';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL.split(','),
    credentials: true,
  })
);
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
export async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db('socialEvents');
  }
  return db;
}

app.get('/', async (req, res) => {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    res.json({ message: 'Social Events API is running', db: 'connected' });
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;