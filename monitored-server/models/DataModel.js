const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
    name: String,
    value: Number
}, { timestamps: true });

dataSchema.pre(/^find/, function (next) {
    this.startTime = Date.now();
    next();
});

dataSchema.post(/^find/, function (docs, next) {
    const duration = Date.now() - this.startTime;
    console.log(`MongoDB Query took ${duration}ms`);
    next();
});

const Data = mongoose.model("Data", dataSchema);
module.exports = Data;
