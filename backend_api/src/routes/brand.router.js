const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brand.controller");
const authenticateToken = require("../middlewares/auth");

module.exports.setup = (app, upload) => {
  app.use("/api/brand", router);
  router.get("/", brandController.getAllBrands);
  router.get("/count", authenticateToken, brandController.getBrandCount);
  router.get("/:id", brandController.getBrandById);

  router.post(
    "/add",
    authenticateToken,
    upload.single("image"),
    brandController.createBrand
  );
  router.put(
    "/update/:id",
    authenticateToken,
    upload.single("image"),
    brandController.updateBrand
  );
  router.delete("/:id", authenticateToken, brandController.deleteBrand);
};
