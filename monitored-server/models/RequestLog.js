const mongoose = require("mongoose");

const requestLogSchema = new mongoose.Schema({
    endpoint: String,
    method: String,
    isDBQuery: Boolean,
    dbQueries: [
        {
            collection: String,
            method: String,
            query: mongoose.Schema.Types.Mixed,
            options: mongoose.Schema.Types.Mixed,
            timestamp: Date,
        }
    ],
    timestamp: { type: Date, default: Date.now },
    duration: Number 
});

module.exports = mongoose.model("RequestLog", requestLogSchema);
