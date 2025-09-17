import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Helpers
const nowIso = () => new Date().toISOString();
const ensureId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { 
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

// Model (use default ObjectId)
const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  updatedAt: { type: String, required: true },
}, { versionKey: false, timestamps: false });

const Todo = mongoose.model('Todo', todoSchema);

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const list = await Todo.find({}).sort({ updatedAt: -1 }).lean();
    // map _id to id to match client expectations
    res.json(list.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// CREATE todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, completed, updatedAt } = req.body || {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const doc = await Todo.create({
      title: title.trim(),
      completed: Boolean(completed),
      updatedAt: updatedAt || nowIso(),
    });
    res.status(201).json({ id: doc._id, title: doc.title, completed: doc.completed, updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// UPDATE todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed, updatedAt } = req.body || {};
    const updates = {
      ...(typeof title === 'string' ? { title: title.trim() } : {}),
      ...(typeof completed !== 'undefined' ? { completed: Boolean(completed) } : {}),
      updatedAt: updatedAt || nowIso(),
    };
    const doc = await Todo.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: 'not found' });
    const out = { id: doc._id, title: doc.title, completed: doc.completed, updatedAt: doc.updatedAt };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Todo.findByIdAndDelete(id);
    if (!result) {
      // idempotent delete
      return res.status(404).json({ error: 'not found' });
    }
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});


