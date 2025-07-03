const mongoose = require("mongoose");
const Category = require("../models/category");

async function createCategory(payload) {
  try {
    console.log(
      `[${new Date().toISOString()}] Creating category with payload:`,
      payload
    );
    if (!payload.cate_name) {
      throw new Error("Category name is required");
    }
    const category = new Category({
      cate_name: payload.cate_name,
      parent_category_id: payload.parent_category_id || null,
      cate_description: payload.cate_description,
    });
    const savedCategory = await category.save();
    console.log(`[${new Date().toISOString()}] Category saved:`, savedCategory);
    return savedCategory;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in createCategory:`,
      error
    );
    throw new Error(`Error creating category: ${error.message}`);
  }
}

async function getCategoryById(id) {
  return Category.findById(id).populate("parent_category_id");
}

async function getAllCategories() {
  return Category.find().populate("parent_category_id");
}

async function getCategoriesNullParent() {
  try {
    console.log(
      `[${new Date().toISOString()}] Fetching categories with null parent`
    );
    const categories = await Category.find({
      parent_category_id: null,
    }).populate("parent_category_id");
    console.log(
      `[${new Date().toISOString()}] Found ${
        categories.length
      } categories with null parent`
    );
    return categories;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getCategoriesNullParent:`,
      error
    );
    throw new Error(
      `Error fetching categories with null parent: ${error.message}`
    );
  }
}

async function getCategoriesByParent(parentId) {
  try {
    console.log(
      `[${new Date().toISOString()}] Fetching categories with parent_id=${parentId}`
    );
    if (!mongoose.isValidObjectId(parentId)) {
      throw new Error("Invalid parent category ID");
    }
    const categories = await Category.find({
      parent_category_id: parentId,
    }).populate("parent_category_id");
    console.log(
      `[${new Date().toISOString()}] Found ${
        categories.length
      } categories with parent_id=${parentId}`
    );
    return categories;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getCategoriesByParent:`,
      error
    );
    throw new Error(`Error fetching categories by parent: ${error.message}`);
  }
}

async function updateCategory(id, payload) {
  return Category.findByIdAndUpdate(id, payload, { new: true }).populate(
    "parent_category_id"
  );
}

async function deleteCategory(id) {
  return Category.findByIdAndDelete(id);
}

module.exports = {
  createCategory,
  getCategoryById,
  getAllCategories,
  getCategoriesNullParent,
  getCategoriesByParent,
  updateCategory,
  deleteCategory,
};
