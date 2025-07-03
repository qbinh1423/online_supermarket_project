const categoryService = require("../services/category.service");

async function createCategory(req, res) {
  try {
    console.log(
      `[${new Date().toISOString()}] Received createCategory request:`,
      req.body
    );
    const { cate_name, parent_category_id, cate_description } = req.body;
    const category = await categoryService.createCategory({
      cate_name,
      parent_category_id,
      cate_description,
    });
    console.log(
      `[${new Date().toISOString()}] Category created successfully:`,
      category
    );
    res.status(201).json({
      status: "success",
      message: "Category created!",
      data: category,
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in createCategory controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function getCategory(req, res) {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ status: "error", message: "Category not found" });
    }
    res.json({ status: "success", data: category });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getCategory controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function getAllCategories(req, res) {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({ status: "success", data: categories });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getAllCategories controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function getCategoriesNullParent(req, res) {
  try {
    console.log(
      `[${new Date().toISOString()}] Received getCategoriesNullParent request`
    );
    const categories = await categoryService.getCategoriesNullParent();
    res.json({ status: "success", data: categories });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getCategoriesNullParent controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function getCategoriesByParent(req, res) {
  try {
    console.log(
      `[${new Date().toISOString()}] Received getCategoriesByParent request for parentId=${
        req.params.parentId
      }`
    );
    const categories = await categoryService.getCategoriesByParent(
      req.params.parentId
    );
    if (categories.length === 0) {
      return res
        .status(404)
        .json({
          status: "error",
          message: "No categories found for this parent",
        });
    }
    res.json({ status: "success", data: categories });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getCategoriesByParent controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function updateCategory(req, res) {
  try {
    const { cate_name, parent_category_id, cate_description } = req.body;
    const category = await categoryService.updateCategory(req.params.id, {
      cate_name,
      parent_category_id: parent_category_id || null,
      cate_description,
    });
    if (!category) {
      return res
        .status(404)
        .json({ status: "error", message: "Category not found" });
    }
    res.json({
      status: "success",
      message: "Category updated",
      data: category,
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in updateCategory controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ status: "error", message: "Category not found" });
    }
    res.json({ status: "success", message: "Category deleted" });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in deleteCategory controller:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
}

module.exports = {
  createCategory,
  getCategory,
  getAllCategories,
  getCategoriesNullParent,
  getCategoriesByParent,
  updateCategory,
  deleteCategory,
};
