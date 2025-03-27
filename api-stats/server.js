const express = require('express');
const cors = require('cors');
const winston = require('winston');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

// Enhanced logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// WebSocket Server with error handling
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    clients.add(ws);

    ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        clients.delete(ws);
    });

    ws.on('close', () => {
        clients.delete(ws);
        logger.info('WebSocket client disconnected');
    });
});

// Broadcast with error handling
const broadcast = (data) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (error) {
                logger.error('Broadcast error:', error);
                clients.delete(client);
            }
        }
    });
};

// Improved MongoDB connection with reconnection and error handling
mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true
});

const db = mongoose.connection;
db.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
});
db.once('open', () => {
    logger.info('Connected to MongoDB');
});

// Enhanced metric schema with validation
const metricSchema = new mongoose.Schema({
    method: { 
        type: String, 
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        required: true 
    },
    route: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    status: { 
        type: Number, 
        required: true,
        min: 100,
        max: 599
    },
    latency: { 
        type: Number, 
        required: true,
        min: 0
    },
    timestamp: { 
        type: Date, 
        default: Date.now,
        expires: '24h' // Automatically remove after 24 hours
    },
    error: {
        type: String,
        default: null
    }
});

const Metric = mongoose.model('Metric', metricSchema);

const app = express();
app.use(cors());
app.use(express.json());

// Centralized request tracking
class RequestTracker {
    constructor() {
        this.requestTypeMetrics = {
            GET: { count: 0, errors: 0 },
            POST: { count: 0, errors: 0 },
            PUT: { count: 0, errors: 0 },
            DELETE: { count: 0, errors: 0 },
            PATCH: { count: 0, errors: 0 }
        };
    }

    incrementCount(method) {
        if (this.requestTypeMetrics[method]) {
            this.requestTypeMetrics[method].count++;
        }
    }

    incrementErrors(method) {
        if (this.requestTypeMetrics[method]) {
            this.requestTypeMetrics[method].errors++;
        }
    }

    getStats() {
        return this.requestTypeMetrics;
    }

    reset() {
        Object.keys(this.requestTypeMetrics).forEach(method => {
            this.requestTypeMetrics[method] = { count: 0, errors: 0 };
        });
    }
}

const requestTracker = new RequestTracker();

class UrlMonitor {
    constructor() {
        this.monitoredUrl = null;
        this.monitoringInterval = null;
    }

    async setUrl(url) {
        if (!url) {
            throw new Error('URL is required');
        }

        try {
            new URL(url);
        } catch (error) {
            throw new Error('Invalid URL format');
        }

        this.monitoredUrl = url;
        requestTracker.reset();

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(
            () => this.checkUrl(), 
            process.env.MONITORING_INTERVAL || 10000
        );

        logger.info(`Started monitoring ${url}`);
    }

    async checkUrl() {
        if (!this.monitoredUrl) return;

        const start = Date.now();
        const methods = ['GET', 'POST'];
        const method = methods[Math.round(Math.random())];

        requestTracker.incrementCount(method);

        try {
            if (method === 'GET') {
                response = await axios.get(monitoredUrl);
            } else if (method === 'POST') {a
                const postData = { key1: 'value1', key2: 'value2' };
                response = await axios.post(monitoredUrl, postData);
            }

            const duration = (Date.now() - start) / 1000;

            const metric = new Metric({
                method,
                route: this.monitoredUrl,
                status: response.status,
                latency: duration,
                timestamp: new Date()
            });

            await metric.save();

            const latestMetrics = await Metric.find({ route: this.monitoredUrl })
                .sort({ timestamp: -1 })
                .limit(20);

            broadcast({
                metrics: latestMetrics,
                requestStats: requestTracker.getStats()
            });

            logger.info(`✅ ${this.monitoredUrl} - ${response.status} - ${duration}s`);
        } catch (error) {
            const duration = (Date.now() - start) / 1000;
            const status = error.response ? error.response.status : 500;

            requestTracker.incrementErrors(method);

            // Create and save error metric
            const metric = new Metric({
                method,
                route: this.monitoredUrl,
                status,
                latency: duration,
                timestamp: new Date(),
                error: error.message
            });

            await metric.save();

            // Broadcast error metrics and request stats
            const latestMetrics = await Metric.find({ route: this.monitoredUrl })
                .sort({ timestamp: -1 })
                .limit(20);

            broadcast({
                metrics: latestMetrics,
                requestStats: requestTracker.getStats()
            });

            logger.error(`❌ ${this.monitoredUrl} - ERROR ${status} - ${duration}s`, error);
        }
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoredUrl = null;
            logger.info('Stopped URL monitoring');
        }
    }
}

const urlMonitor = new UrlMonitor();

// Routes
app.post("/api/set-url", async (req, res) => {
    try {
        const { url } = req.body;
        await urlMonitor.setUrl(url);
        res.json({ message: `Monitoring ${url}` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await Metric.find()
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(metrics);
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

app.get('/api/request-stats', (req, res) => {
    res.json(requestTracker.getStats());
});

app.post('/api/stop-monitoring', (req, res) => {
    urlMonitor.stopMonitoring();
    res.json({ message: 'Monitoring stopped' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Closing HTTP server.');
    urlMonitor.stopMonitoring();
    wss.close(() => {
        logger.info('WebSocket server closed.');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
});

module.exports = { app, server, wss };