const express = require('express');
const cors = require('cors');
const winston = require('winston');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
require('dotenv').config();

const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

const broadcast = (data) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const logger = winston.createLogger({
    transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

const metricSchema = new mongoose.Schema({
    method: String,
    route: String,
    status: Number,
    latency: Number,
    timestamp: Date
});

const Metric = mongoose.model('Metric', metricSchema);

const requestTypeMetrics = {
    GET: { count: 0, errors: 0 },
    POST: { count: 0, errors: 0 },
    UPDATE: { count: 0, errors: 0 },
};

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const start = Date.now();

    const method = req.method.toUpperCase();

    if (requestTypeMetrics[method]) {
        requestTypeMetrics[method].count++; 
    }

    res.on('finish', async () => {
        const duration = (Date.now() - start) / 1000;

        if (res.statusCode >= 400 && requestTypeMetrics[method]) {
            requestTypeMetrics[method].errors++; 
        }

        logger.info(`${method} ${req.url} - Status: ${res.statusCode}`);

        const metric = {
            method: req.method,
            route: req.path,
            status: res.statusCode,
            latency: duration,
            timestamp: new Date()
        };

        await Metric.create(metric);
        logger.info(`Stored in DB: ${req.method} ${req.path} - ${duration}s`);

        broadcast(metric); 
    });

    next();
});

app.get('/api/metrics', async (req, res) => {
    const metrics = await Metric.find().limit(100).sort({ timestamp: -1 });
    res.json(metrics);
});

app.get('/api/request-stats', async (req, res) => {
    res.json(requestTypeMetrics);
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
