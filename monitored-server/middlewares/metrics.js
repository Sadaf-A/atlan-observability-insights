const os = require("os");
const mongoose = require("mongoose");

const metricsMiddleware = (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg()[0]; 

    let isDbQuery = false;
    
    const writeMethods = ["POST", "PUT", "DELETE", "PATCH"];
    if (writeMethods.includes(req.method) && Object.keys(req.body).length > 0) {
        isDbQuery = true;
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
        res.locals.metrics.isDbQuery = isDbQuery;
        return originalJson({ ...data, metrics: res.locals.metrics });
    };

    res.locals.metrics = {
        isDbQuery: isDbQuery,
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
};

module.exports = metricsMiddleware;
