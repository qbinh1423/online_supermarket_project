const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  c_name: { type: String, required: true, trim: true },
  c_address: { type: String, trim: true },
  c_phone: { type: String, match: /^[0-9]{10}$/, trim: true },
  c_email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Please provide a valid email"],
  },
  c_date: { type: Date },
  c_password: { type: String, required: true, minlength: 6 },
  c_role: { type: String, enum: ["user", "admin"], default: "user" },
  // created_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
