const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");

        // Facilities
        const facilityCollection = client.db("venuex_db").collection("facilities");

        
        app.get('/facilities', async (req, res) => {
            const result = await facilityCollection.find().toArray();
            res.send(result);
        });

        app.get('/facilities/:id', async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid ID format" });
                }
                const query = { _id: new ObjectId(id) };
                const result = await facilityCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ message: "Facility not found" });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server Error", error });
            }
        });

    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }

    // Bookings Collection
    const bookingCollection = client.db("venuex_bd").collection("bookings");

    // Create a new booking
    app.post('/bookings', async (req, res) => {
        try {
            const bookingData = req.body;

            // Basic validation
            if (!bookingData.facilityId || !bookingData.date || !bookingData.slot) {
                return res.status(400).send({ success: false, message: "Missing required fields" });
            }

            const bookingWithTimestamp = {
                ...bookingData,
                createdAt: new Date(),
                status: "Confirmed"
            };

            const result = await bookingCollection.insertOne(bookingWithTimestamp);
            res.status(201).send({ success: true, insertedId: result.insertedId });
        } catch (error) {
            console.error("Booking creation error:", error);
            res.status(500).send({ success: false, message: "Failed to create booking" });
        }
    });
}
run();

app.get('/', (req, res) => {
    res.send("Server is running...");
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});