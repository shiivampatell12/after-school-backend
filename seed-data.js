require('dotenv').config();
const { MongoClient } = require('mongodb');

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

async function seedDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('afterschooldb');
        
        // Clear existing data
        await db.collection('lessons').deleteMany({});
        
        // Insert sample lessons
        const result = await db.collection('lessons').insertMany(sampleLessons);
        console.log(`${result.insertedCount} lessons inserted successfully!`);
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await client.close();
    }
}

seedDatabase();