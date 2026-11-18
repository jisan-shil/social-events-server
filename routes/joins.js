import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// Join an event
router.post('/events/:id/join', verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const db = await getDb();
    const eventId = new ObjectId(req.params.id);
    const event = await db.collection('events').findOne({ _id: eventId });

    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.eventDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ message: 'This event has already passed' });
    }

    await db.collection('joinedEvents').insertOne({
      eventId,
      userEmail: req.user.email,
      userName: req.user.name || 'Anonymous',
      joinedAt: new Date(),
    });
    await db.collection('events').updateOne({ _id: eventId }, { $inc: { participants: 1 } });

    res.status(201).json({ message: 'You have joined this event' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already joined this event' });
    }
    res.status(500).json({ message: 'Failed to join event' });
  }
});

// Check if current user joined an event
router.get('/events/:id/join-status', verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.json({ joined: false });
    const db = await getDb();
    const found = await db.collection('joinedEvents').findOne({
      eventId: new ObjectId(req.params.id),
      userEmail: req.user.email,
    });
    res.json({ joined: !!found });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check join status' });
  }
});

// Events joined by the logged-in user, sorted by event date
router.get('/joined-events', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const joins = await db
      .collection('joinedEvents')
      .find({ userEmail: req.user.email })
      .toArray();
    const ids = joins.map((j) => j.eventId);
    const events = await db
      .collection('events')
      .find({ _id: { $in: ids } })
      .sort({ eventDate: 1 })
      .toArray();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load joined events' });
  }
});

export default router;