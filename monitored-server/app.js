const express = require('express');
const cors = require('cors');
const os = require('os');
require('dotenv').config();
const connectDB = require("./db");
const Data = require("./models/DataModel");
const metricsMiddleware = require('./middlewares/metrics')

const app = express();
connectDB();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/", async (req, res) => {
    console.log("GET request received");
    try {
        const data = await Data.find(); 
        
        res.status(200).json({
            message: "GET request received",
            data,
            metrics: res.locals.metrics
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
});

app.post("/", async (req, res) => {
    console.log("POST request received");
    try {
        const newData = await Data.create(req.body);
        res.status(201).json({
            message: "Data inserted successfully",
            data: newData,
            metrics: res.locals.metrics
        });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ message: "Error inserting data" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
