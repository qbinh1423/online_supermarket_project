const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  v_name: { type: String, required: true, unique: true },
  v_stock_quantity: { type: Number, required: true, min: 0 },
  v_price: { type: Number, required: true, min: 0},
  v_description: { type: String, required: true },
  v_create_date: { type: Date, required: true },
  v_expiry_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

voucherSchema.index({ v_name: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
