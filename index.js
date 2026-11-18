import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';
import eventsRouter from './routes/events.js';
import joinsRouter from './routes/joins.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL.split(','),
    credentials: true,
  })
);
app.use(express.json());

app.get('/', async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ message: 'Social Events API is running', db: 'connected' });
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

app.use('/events', eventsRouter);
app.use('/', joinsRouter);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;