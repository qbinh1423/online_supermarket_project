const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  promotion_code: { type: String, required: true, unique: true },
  description: { type: String },
  discount_percentage: { type: Number, min: 0, max: 100 },
  start_date: { type: Date },
  end_date: { type: Date },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Promotion", promotionSchema);
    