const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  c_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  o_name: { type: String, required: true },
  o_phone: { type: String, match: /^[0-9]{10}$/, trim: true },
  o_date: { type: Date, default: Date.now },
  o_status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "canceled"],
    default: "pending",
  },
  o_total_amount: { type: Number, required: true, min: 0 },
  o_shipping_address: { type: String, required: true },
  o_payment_method: {
    type: String,
    enum: ["COD", "Banking"],
    required: true,
  },
  o_cancel_reason: { type: String, default: null },
  v_name: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voucher",
    default: null,
  },
  orderDetails: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderDetail",
    },
  ],

  statusHistory: [
    {
      status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "canceled"],
      },
      timestamp: { type: Date, default: Date.now },
      cancelReason: { type: String, default: null },
    },
  ],
});

module.exports = mongoose.model("Order", orderSchema);
