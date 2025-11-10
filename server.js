const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://github.com/shiivampatell12/after-school-backend.git'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Static files middleware for lesson images
app.use('/images', express.static('public/images'));

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000
};

MongoClient.connect(process.env.MONGODB_URI, mongoOptions)
    .then(client => {
        console.log('Connected to MongoDB Atlas');
        db = client.db('afterschooldb');
    })
    .catch(error => console.error('MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'After School Classes API',
        timestamp: new Date(),
        status: 'running'
    });
});

// Get all lessons
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search lessons (challenge component)
app.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }

        const searchRegex = new RegExp(q, 'i');
        const lessons = await db.collection('lessons').find({
            $or: [
                { subject: { $regex: searchRegex } },
                { location: { $regex: searchRegex } },
                { price: { $regex: searchRegex } },
                { spaces: { $regex: searchRegex } }
            ]
        }).toArray();
        
        res.json(lessons);
    } catch (error) {
        console.error('Error searching lessons:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save order
app.post('/orders', async (req, res) => {
    try {
        const order = {
            ...req.body,
            createdAt: new Date(),
            status: 'confirmed'
        };
        
        const result = await db.collection('orders').insertOne(order);
        console.log('Order saved:', result.insertedId);
        
        res.json({ 
            success: true, 
            orderId: result.insertedId,
            message: 'Order submitted successfully'
        });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update lesson spaces
app.put('/lessons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { spaces } = req.body;
        
        if (spaces === undefined || spaces < 0) {
            return res.status(400).json({ error: 'Valid spaces value required' });
        }
        
        const result = await db.collection('lessons').updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    spaces: parseInt(spaces),
                    lastUpdated: new Date()
                } 
            }
        );
        
        console.log(`Updated lesson ${id}, spaces: ${spaces}`);
        res.json({ 
            success: true, 
            modifiedCount: result.modifiedCount,
            lessonId: id,
            newSpaces: spaces
        });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await db.admin().ping();
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date()
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 Lessons API: http://localhost:${PORT}/lessons`);
});