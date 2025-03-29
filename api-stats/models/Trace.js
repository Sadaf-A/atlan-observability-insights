const mongoose = require('mongoose');
const spanSchema = new mongoose.Schema({
    spanId: String,
    parentSpanId: String,
    serviceName: String,
    operationName: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    tags: Object,
    logs: [Object],
});

const traceSchema = new mongoose.Schema({
    traceId: String,
    createdAt: { type: Date, default: Date.now },
    spans: [spanSchema],
});

const Trace = mongoose.model("Trace", traceSchema);
module.exports = Trace;

