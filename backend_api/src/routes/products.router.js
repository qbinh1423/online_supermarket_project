const express = require("express");
const productController = require("../controllers/products.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

module.exports.setup = (app) => {
  app.use("/api/product", router);
  router.get("/count", authenticateToken, productController.getProductCount);
  router.get("/", productController.getAllProducts);
  router.get("/:id", productController.getProductById);
  router.get("/search", productController.getProductsByName);
  router.get("/category/:cate_name", productController.getProductByCategory);
  router.get("/brand/:br_name", productController.getProductByBrand);
  router.get("/:productId/reviews", productController.getProductWithReviews);
  router.post(
    "/add",
    authenticateToken,
    upload.array("p_images", 5),
    productController.createProduct
  );
  router.put(
    "/:id",
    authenticateToken,
    upload.array("p_images", 5),
    productController.updateProduct
  );
  router.delete("/all", productController.deleteAllProducts);
  router.delete("/:id", authenticateToken, productController.deleteProduct);
};
