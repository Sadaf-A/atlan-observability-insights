const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg()[0]; 

    res.locals.metrics = {
        memory: {
            rss: memoryUsage.rss / 1024 / 1024, 
            heapTotal: memoryUsage.heapTotal / 1024 / 1024, 
            heapUsed: memoryUsage.heapUsed / 1024 / 1024,
            external: memoryUsage.external / 1024 / 1024,
        },
        cpu: {
            loadAvg1min: cpuLoad
        }
    };

    next();
});

app.get('/', (req, res) => {
    console.log("GET request received");
    res.status(200).json({
        message: 'GET request received',
        metrics: res.locals.metrics
    });
});

app.post('/', (req, res) => {
    console.log("POST request received")
    res.status(201).json({
        message: 'POST request received',
        data: req.body,
        metrics: res.locals.metrics
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
