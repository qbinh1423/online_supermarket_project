const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  c_email: {
    type: String,
    required: true,
    index: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Please provide a valid email"],
  },
  otp: { type: String, required: true },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 10 * 60 * 1000,
    expires: 600,
  },
});

module.exports = mongoose.model("OTP", otpSchema);