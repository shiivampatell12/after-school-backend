const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://shiivampatell12.github.io/after-school-frontend/'  // Update with your GitHub Pages URL
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

// MongoDB connection
let db;
let client;

async function connectToMongoDB() {
    try {
        console.log('Attempting to connect to MongoDB...');
        console.log('Connection URI:', process.env.MONGODB_URI ? 'URI is set' : 'URI is missing');
        
        // Simple MongoDB options - remove conflicting TLS options
        const mongoOptions = {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000
        };

        client = new MongoClient(process.env.MONGODB_URI, mongoOptions);
        await client.connect();
        
        // Test the connection
        await client.db("admin").command({ ping: 1 });
        console.log('✅ Connected to MongoDB Atlas successfully!');
        
        db = client.db('afterschooldb');
        
        // Seed data if collection is empty
        const count = await db.collection('lessons').countDocuments();
        if (count === 0) {
            console.log('Seeding initial data...');
            await seedInitialData();
        }
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('Full error:', error);
        
        // Retry connection after 10 seconds (only once)
        if (!error.retryAttempted) {
            error.retryAttempted = true;
            setTimeout(() => {
                console.log('Retrying MongoDB connection...');
                connectToMongoDB();
            }, 10000);
        }
    }
}

// Seed initial data
async function seedInitialData() {
    const sampleLessons = [
        { subject: 'Math', location: 'London', price: 100, spaces: 5 },
        { subject: 'Math', location: 'Oxford', price: 80, spaces: 5 },
        { subject: 'English', location: 'London', price: 90, spaces: 5 },
        { subject: 'English', location: 'York', price: 85, spaces: 5 },
        { subject: 'Science', location: 'Bristol', price: 95, spaces: 5 },
        { subject: 'Science', location: 'Bath', price: 75, spaces: 5 },
        { subject: 'Music', location: 'Liverpool', price: 70, spaces: 5 },
        { subject: 'Music', location: 'Manchester', price: 65, spaces: 5 },
        { subject: 'Art', location: 'Birmingham', price: 60, spaces: 5 },
        { subject: 'Art', location: 'Leeds', price: 55, spaces: 5 }
    ];
    
    try {
        await db.collection('lessons').insertMany(sampleLessons);
        console.log('✅ Sample data inserted successfully');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

// Middleware to check database connection
function checkDB(req, res, next) {
    if (!db) {
        return res.status(503).json({ 
            error: 'Database not connected',
            message: 'Please try again in a moment'
        });
    }
    next();
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'After School Classes API',
        timestamp: new Date(),
        status: 'running',
        database: db ? 'connected' : 'disconnected'
    });
});

// Get all lessons
app.get('/lessons', checkDB, async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        console.log(`Found ${lessons.length} lessons`);
        res.json(lessons);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search lessons
app.get('/search', checkDB, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }

        const searchRegex = new RegExp(q, 'i');
        const lessons = await db.collection('lessons').find({
            $or: [
                { subject: { $regex: searchRegex } },
                { location: { $regex: searchRegex } }
            ]
        }).toArray();
        
        res.json(lessons);
    } catch (error) {
        console.error('Error searching lessons:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save order
app.post('/orders', checkDB, async (req, res) => {
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
app.put('/lessons/:id', checkDB, async (req, res) => {
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

// Health check
app.get('/health', async (req, res) => {
    try {
        if (db) {
            await db.admin().ping();
            res.json({ 
                status: 'healthy',
                database: 'connected',
                timestamp: new Date()
            });
        } else {
            res.status(503).json({ 
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date()
            });
        }
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
        });
    }
});

// Start server and connect to database
connectToMongoDB();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 Lessons API: http://localhost:${PORT}/lessons`);
});