const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  content: { type: String, required: true },
  username: { type: String, default: "Admin" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
});

const reviewSchema = new mongoose.Schema({
  p_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  c_id: {
    type: String,
    ref: "User",
    default: null,
  },
  name: { type: String, required: true },
  content: { type: String, required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  images: [{ type: String }],
  replies: [replySchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", reviewSchema);
