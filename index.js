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
        // await client.connect();
        console.log("Successfully connected to MongoDB!");

        // Facilities
        const facilityCollection = client.db("venuex_db").collection("facilities");


        // Get all facilities (Supports Search & Filter)
        app.get('/facilities', async (req, res) => {
            try {
                const { search, category } = req.query;
                let query = {};

                // 1. Search by facility name using $regex (case-insensitive)
                if (search) {
                    query.name = { $regex: search, $options: 'i' };
                }

                // 2. Filter by sport type using $in
                if (category && category !== 'All') {
                    query.facility_type = { $in: [category] };
                }

                const result = await facilityCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching facilities:", error);
                res.status(500).send({ message: "Server Error", error });
            }
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


    // Add a new facility
    app.post('/facilities', async (req, res) => {
        try {
            const facilityData = req.body;

            // Validation check
            if (!facilityData.name || !facilityData.facility_type || !facilityData.location || !facilityData.price_per_hour || !facilityData.image) {
                return res.status(400).send({ success: false, message: "Missing required fields" });
            }

            // Prepare document with correct data types
            const newFacility = {
                ...facilityData,
                price_per_hour: Number(facilityData.price_per_hour),
                capacity: Number(facilityData.capacity) || 0,
                createdAt: new Date(),
            };

            const result = await facilityCollection.insertOne(newFacility);
            res.status(201).send({ success: true, insertedId: result.insertedId });
        } catch (error) {
            console.error("Error adding facility:", error);
            res.status(500).send({ success: false, message: "Failed to add facility" });
        }
    });

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


    // Get all bookings (Supports optional query filtering by email: /bookings?email=user@gmail.com)
    app.get('/bookings', async (req, res) => {
        try {
            const email = req.query.email;
            let query = {};
            if (email) {
                query = { userEmail: email };
            }
            const result = await bookingCollection.find(query).sort({ createdAt: -1 }).toArray();
            res.send(result);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            res.status(500).send({ success: false, message: "Failed to fetch bookings" });
        }
    });

    // Delete / Cancel a booking by ID
    app.delete('/bookings/:id', async (req, res) => {
        try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ success: false, message: "Invalid Booking ID format" });
            }

            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);

            if (result.deletedCount === 1) {
                res.send({ success: true, message: "Booking cancelled successfully" });
            } else {
                res.status(404).send({ success: false, message: "Booking not found" });
            }
        } catch (error) {
            console.error("Error deleting booking:", error);
            res.status(500).send({ success: false, message: "Failed to cancel booking" });
        }
    });


    // Update a facility by ID
    app.put('/facilities/:id', async (req, res) => {
        try {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ success: false, message: "Invalid ID format" });
            }

            const updatedData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: updatedData.name,
                    facility_type: updatedData.facility_type,
                    location: updatedData.location,
                    price_per_hour: Number(updatedData.price_per_hour),
                    capacity: Number(updatedData.capacity),
                    image: updatedData.image,
                    description: updatedData.description,
                },
            };

            const result = await facilityCollection.updateOne(filter, updateDoc);
            res.send({ success: true, modifiedCount: result.modifiedCount });
        } catch (error) {
            console.error("Error updating facility:", error);
            res.status(500).send({ success: false, message: "Failed to update facility" });
        }
    });

    // Delete a facility by ID
    app.delete('/facilities/:id', async (req, res) => {
        try {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ success: false, message: "Invalid ID format" });
            }

            const query = { _id: new ObjectId(id) };
            const result = await facilityCollection.deleteOne(query);

            if (result.deletedCount === 1) {
                res.send({ success: true, message: "Facility deleted successfully" });
            } else {
                res.status(404).send({ success: false, message: "Facility not found" });
            }
        } catch (error) {
            console.error("Error deleting facility:", error);
            res.status(500).send({ success: false, message: "Failed to delete facility" });
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

module.exports = app;