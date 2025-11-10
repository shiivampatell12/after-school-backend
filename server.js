const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// MongoDB connection
let db;
MongoClient.connect(process.env.MONGODB_URI)
    .then(client => {
        console.log('Connected to MongoDB Atlas');
        db = client.db('afterschooldb');
    })
    .catch(error => console.error('MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Backend server running!', timestamp: new Date() });
});

// Get all lessons
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save order
app.post('/orders', async (req, res) => {
    try {
        const order = req.body;
        const result = await db.collection('orders').insertOne(order);
        res.json({ success: true, orderId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lesson spaces
app.put('/lessons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { spaces } = req.body;
        const result = await db.collection('lessons').updateOne(
            { _id: new ObjectId(id) },
            { $set: { spaces: spaces } }
        );
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});