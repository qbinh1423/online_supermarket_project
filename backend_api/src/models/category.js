const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  cate_name: { type: String, required: true },
  parent_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  cate_description: { type: String },
  cate_created_at: { type: Date, default: Date.now },
});

categorySchema.pre("save", async function (next) {
  try {
    let currentId = this._id;
    let parentId = this.parent_category_id;

    while (parentId) {
      if (parentId.equals(currentId)) {
        throw new Error("Cannot create circular reference in categories.");
      }
      const parent = await this.constructor.findOne({ _id: parentId });
      parentId = parent ? parent.parent_category_id : null;
    }
    console.log(
      `[${new Date().toISOString()}] No circular reference detected for cate_id=${
        this._id
      }`
    );
    next();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in pre-save hook:`,
      error
    );
    next(error);
  }
});

categorySchema.index({ parent_category_id: 1 });

module.exports = mongoose.model("Category", categorySchema);
