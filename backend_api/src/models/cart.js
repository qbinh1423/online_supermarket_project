const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  c_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  cart_created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", cartSchema);
