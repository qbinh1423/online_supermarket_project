const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  p_name: {
    type: String,
    required: true,
    trim: true,
  },
  p_images: { type: [String], default: [] },
  p_stock_quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  p_price: {
    type: Number,
    required: true,
    min: 0,
  },
  p_description: {
    type: String,
    trim: true,
  },
  p_specifications: [
    {
      key: { type: String, required: true, trim: true },
      value: { type: String, required: true, trim: true },
    },
  ],
  p_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
    validate: {
      validator: async function (categoryId) {
        const category = await mongoose.model("Category").findById(categoryId);
        return category && category.parent_category_id === null;
      },
    },
  },
  p_subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    validate: {
      validator: async function (subcategoryId) {
        if (!subcategoryId) return true;
        const subcategory = await mongoose
          .model("Category")
          .findById(subcategoryId);
        return (
          subcategory &&
          subcategory.parent_category_id &&
          subcategory.parent_category_id.equals(this.p_category)
        );
      },
    },
  },
  p_brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
    required: true,
    validate: {
      validator: async function (brandId) {
        const brand = await mongoose.model("Brand").findById(brandId);
        return !!brand;
      },
    },
  },
  p_created_at: {
    type: Date,
    default: Date.now,
  },
});

productSchema.index({ p_category: 1, p_subcategory: 1, p_brand: 1 });

module.exports = mongoose.model("Product", productSchema);
