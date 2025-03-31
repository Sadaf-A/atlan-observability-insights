const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  baseUrl: { type: String, required: true, unique: true, trim: true },
  endpoints: {
    GET: [{ type: String }],
    POST: [{ type: String }],
    PUT: [{ type: String }],
    DELETE: [{ type: String }],
    PATCH: [{ type: String }],
  },
  createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model("Url", urlSchema);
module.exports = Url;
