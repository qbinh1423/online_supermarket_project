const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  url: { type: String },
  p_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
});

module.exports = mongoose.model("Image", imageSchema);
