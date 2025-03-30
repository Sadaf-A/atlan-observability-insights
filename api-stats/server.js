const express = require('express');
const cors = require('cors');
const winston = require('winston');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();
const { trace } = require('@opentelemetry/api');
const Trace = require('./models/Trace');
const { v4: uuidv4 } = require('uuid');
const traceRequest  = require('./httpTracer');

mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); 
});

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
});

async function connect() {
    await mongoose.connect(process.env.MONGO_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
    });
}

connect();

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

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on("connection", (ws) => {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const startTime = new Date();

    logger.info("WebSocket client connected");
    clients.add(ws);

    const newTrace = new Trace({
        traceId,
        createdAt: startTime,
        spans: [
            {
                spanId,
                parentSpanId: null,
                serviceName: "websocket-server",
                operationName: "WebSocket Connection",
                startTime,
                endTime: null,
                duration: 0,
                tags: { status: "connected" },
                logs: [],
            },
        ],
    });

    newTrace.save();

    ws.on("error", (error) => {
        logger.error("WebSocket error:", error);
        clients.delete(ws);
    });

    ws.on("close", async () => {
        clients.delete(ws);
        logger.info("WebSocket client disconnected");

        await Trace.updateOne(
            { traceId },
            {
                $set: {
                    "spans.0.endTime": new Date(),
                    "spans.0.duration": Date.now() - startTime.getTime(),
                    "spans.0.tags.status": "disconnected",
                },
            }
        );
    });
});


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

const db = mongoose.connection;
db.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
});
db.once('open', () => {
    logger.info('Connected to MongoDB');
});

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
        required: false,
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
        expires: '24h' 
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

app.use(async (req, res, next) => {
    const traceId = req.headers['x-trace-id'] || uuidv4();
    const spanId = uuidv4();
    const startTime = Date.now();

    res.on('finish', async () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const trace = await Trace.findOneAndUpdate(
            { traceId },
            {
                $push: {
                    spans: {
                        spanId,
                        parentSpanId: null, 
                        serviceName: "api-service",
                        operationName: req.method + " " + req.url,
                        startTime: new Date(startTime),
                        endTime: new Date(endTime),
                        duration,
                        tags: { statusCode: res.statusCode }
                    }
                }
            },
            { upsert: true, new: true }
        );
    });

    req.traceId = traceId;
    req.spanId = spanId;
    next();
});

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
            let response;
            if (method === 'GET') {
                console.log("url: " + this.monitoredUrl);
                console.log(this.monitoredUrl);
                response = await traceRequest(method, this.monitoredUrl);
            } else if (method === 'POST') {
                const postData = { key1: 'value1', key2: 'value2' };
                console.log("url: " + this.monitoredUrl);
                response = await traceRequest(method, this.monitoredUrl, postData);
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
                requestStats: requestTracker.getStats(),
                resourceMetrics: response.metrics
            });
    
            logger.info(`✅ ${this.monitoredUrl} - ${response.status} - ${duration}s`);
        } catch (error) {
            const duration = (Date.now() - start) / 1000;
            const status = error.response ? error.response.status : 500;
    
            requestTracker.incrementErrors(method);
    
            const metric = new Metric({
                method,
                route: this.monitoredUrl,
                status,
                latency: duration,
                timestamp: new Date(),
                error: error.message
            });
    
            await metric.save();
    
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

app.get("/api/traces", async (req, res) => {
    try {
        const { monitoredUrl } = req.query;
        if (!monitoredUrl) return res.status(400).json({ error: "monitoredUrl is required" });

        const traces = await Trace.find({ "spans.operationName": new RegExp(monitoredUrl, "i") }).sort({ createdAt: -1 });
        res.json(traces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/metrics', async (req, res) => {
    const tracer = trace.getTracer('api-metrics');
    const span = tracer.startSpan('Fetch API Metrics');

    try {
        const metrics = await Metric.find().sort({ timestamp: -1 }).limit(100);
        res.json(metrics);
    } catch (error) {
        span.recordException(error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    } finally {
        span.end(); 
    }
});

app.get('/api/request-stats', (req, res) => {
    const tracer = trace.getTracer('api-request-stats');
    const span = tracer.startSpan('Fetch Request Stats');

    try {
        res.json(requestTracker.getStats());
    } catch (error) {
        span.recordException(error);
        res.status(500).json({ error: 'Failed to fetch request stats' });
    } finally {
        span.end();
    }
});

app.post('/api/stop-monitoring', (req, res) => {
    const tracer = trace.getTracer('api-stop-monitoring');
    const span = tracer.startSpan('Stop Monitoring');

    try {
        urlMonitor.stopMonitoring();
        res.json({ message: 'Monitoring stopped' });
    } catch (error) {
        span.recordException(error);
        res.status(500).json({ error: 'Failed to stop monitoring' });
    } finally {
        span.end();
    }
});

app.post('/api/set-url', async (req, res) => {
    const tracer = trace.getTracer('api-set-url');
    const span = tracer.startSpan('Set Monitoring URL');

    try {
        const { url } = req.body;
        await urlMonitor.setUrl(url);
        res.json({ message: `Monitoring ${url}` });
    } catch (error) {
        span.recordException(error);
        res.status(400).json({ error: error.message });
    } finally {
        span.end();
    }
});

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

app.post("/api/diagnose", async (req, res) => {
    try {
        const { monitoredUrl } = req.body;
        if (!monitoredUrl) {
            return res.status(400).json({ error: "monitoredUrl is required." });
        }

        const logs = await Trace.find({ "spans.operationName": new RegExp(monitoredUrl, "i") }).sort({ createdAt: -1 });

        if (logs.length === 0) {
            return res.json({ diagnosis: "No logs found for this URL." });
        }

        const formattedLogs = logs.map(log => 
            log.spans.map(span => 
                `Operation: ${span.operationName}, Status: ${span.tags.statusCode}, Duration: ${span.duration}ms`
            ).join("\n")
        ).join("\n\n");


      const response = await axios.post(
        process.env.COHERE_API_URL,
        {
          model: 'command-a-03-2025', 
          messages: [
            {
              role: 'user',
              content: `Analyze these HTTP request logs: ${formattedLogs}. Identify errors, anomalies, or performance issues. If everything looks normal, state that the service is healthy. Keep the response concise and professional.`,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data?.message?.content[0]?.text || 'No response from AI';
      
        res.json({ aiResponse });

    } catch (error) {
        console.error("Diagnosis Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const performanceSchema = new mongoose.Schema({
    timestamp: { type: Date, required: true },
    avgResponseTime: { type: Number, required: true },
    errorRate: { type: Number, required: true }
});

const Performance = mongoose.model("Performance", performanceSchema);

app.get("/api/seed", async (req, res) => {
    await Performance.deleteMany({});
    await Performance.insertMany([
        { timestamp: new Date("2025-03-22T12:00:00Z"), avgResponseTime: 120, errorRate: 0.05 },
        { timestamp: new Date("2025-03-23T12:00:00Z"), avgResponseTime: 135, errorRate: 0.07 },
        { timestamp: new Date("2025-03-24T12:00:00Z"), avgResponseTime: 110, errorRate: 0.04 }
    ]);
    res.send({ message: "Seeded data!" });
});

app.get("/api/performance", async (req, res) => {
    try {
        const range = req.query.range || "7d";
        const startDate = new Date();
        if (range === "30d") startDate.setDate(startDate.getDate() - 30);
        else if (range === "90d") startDate.setDate(startDate.getDate() - 90);
        else startDate.setDate(startDate.getDate() - 7);

        const data = await Performance.find({ timestamp: { $gte: startDate } }).sort({ timestamp: 1 });

        res.json(data);
    } catch (error) {
        console.error("Error fetching performance data:", error);
        res.status(500).json({ message: "Server error" });
    }
});

const port = process.env.PORT || 5001;
const server = app.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
});

module.exports = { app, server, wss };