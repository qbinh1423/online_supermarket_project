const express = require("express");
const categoryController = require("../controllers/category.controller");
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

module.exports.setup = (app) => {
  app.use("/api/category", router);
  router.post("/add", authenticateToken, categoryController.createCategory);
  router.get("/", categoryController.getAllCategories);
  router.get("/parents", categoryController.getCategoriesNullParent);
  router.get("/by-parent/:parentId", categoryController.getCategoriesByParent);
  router.get("/:id", categoryController.getCategory);
  router.put("/:id", authenticateToken, categoryController.updateCategory);
  router.delete("/:id", authenticateToken, categoryController.deleteCategory);
};
