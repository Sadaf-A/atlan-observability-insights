const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: false, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  urls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Url" }],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
