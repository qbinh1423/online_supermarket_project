const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  br_name: { type: String, required: true, unique: true },
  br_image: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /\.(jpg|jpeg|png)$/i.test(v);
      },
      message: "Hình ảnh phải có định dạng .jpg, .jpeg, .png",
    },
  },
  created_at: { type: Date, default: Date.now },
});

brandSchema.index({ br_name: 1 });

module.exports = mongoose.model("Brand", brandSchema);
