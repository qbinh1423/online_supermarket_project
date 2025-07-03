const mongoose = require("mongoose");

const orderDetailSchema = new mongoose.Schema({
  o_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  p_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  order_detail_quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
});

module.exports = mongoose.model("OrderDetail", orderDetailSchema);
