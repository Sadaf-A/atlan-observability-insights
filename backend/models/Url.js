const mongoose = require("mongoose");

const endpointSchema = new mongoose.Schema({
    path: {
      type: String,
      required: true,
    },
    body: {
      type: mongoose.Schema.Types.Mixed, 
      default: null,
    },
  });

const urlSchema = new mongoose.Schema({
  baseUrl: { type: String, required: true, unique: true, trim: true },
  endpoints: {
    GET: [endpointSchema],
    POST: [endpointSchema],
    PUT: [endpointSchema],
    DELETE: [endpointSchema],
    PATCH: [endpointSchema],
  },
  createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model("Url", urlSchema);
module.exports = Url;
