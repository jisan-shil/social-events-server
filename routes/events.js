import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

export const EVENT_TYPES = [
  'Cleanup',
  'Plantation',
  'Donation',
  'Blood Donation',
  'Food Distribution',
  'Education',
  'Health Camp',
  'Other',
];

const today = () => new Date().toISOString().slice(0, 10);

function validateEvent(body) {
  const errors = [];
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  const thumbnail = String(body.thumbnail || '').trim();
  const location = String(body.location || '').trim();
  const eventDate = String(body.eventDate || '').trim();

  if (title.length < 5) errors.push('Title must be at least 5 characters');
  if (description.length < 20) errors.push('Description must be at least 20 characters');
  if (!EVENT_TYPES.includes(type)) errors.push('Please choose a valid event type');
  if (!/^https?:\/\/.+/i.test(thumbnail)) errors.push('Thumbnail must be a valid image URL');
  if (location.length < 3) errors.push('Location is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) errors.push('Event date is invalid');
  else if (eventDate < today()) errors.push('Event date must be in the future');

  return { errors, data: { title, description, type, thumbnail, location, eventDate } };
}

// Public: upcoming events (supports ?limit=6&type=Cleanup&search=dhaka)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { type, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 0, 100);

    const query = { eventDate: { $gte: today() } };
    if (type && type !== 'All') query.type = type;
    if (search) query.title = { $regex: String(search), $options: 'i' };

    let cursor = db.collection('events').find(query).sort({ eventDate: 1 });
    if (limit) cursor = cursor.limit(limit);

    res.json(await cursor.toArray());
  } catch (err) {
    res.status(500).json({ message: 'Failed to load events' });
  }
});

// Private: events created by logged-in user
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db
      .collection('events')
      .find({ createdBy: req.user.email })
      .sort({ eventDate: 1 })
      .toArray();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load your events' });
  }
});

// Public: single event
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const db = await getDb();
    const event = await db
      .collection('events')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load event' });
  }
});

// Private: create
router.post('/', verifyToken, async (req, res) => {
  try {
    const { errors, data } = validateEvent(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const db = await getDb();
    const doc = {
      ...data,
      createdBy: req.user.email,
      creatorName: req.user.name || 'Anonymous',
      participants: 0,
      createdAt: new Date(),
    };
    const result = await db.collection('events').insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// Private: update (owner only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const { errors, data } = validateEvent(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const db = await getDb();
    const _id = new ObjectId(req.params.id);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy !== req.user.email) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    await db.collection('events').updateOne({ _id }, { $set: data });
    res.json({ message: 'Event updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// Private: delete (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const db = await getDb();
    const _id = new ObjectId(req.params.id);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy !== req.user.email) {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }

    await db.collection('events').deleteOne({ _id });
    await db.collection('joinedEvents').deleteMany({ eventId: _id });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

export default router;