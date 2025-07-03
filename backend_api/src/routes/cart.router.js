const express = require("express");
const cartController = require("../controllers/cart.controller");
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

module.exports.setup = (app) => {
  app.use("/api/cart", router);
  router.post("/add", authenticateToken, cartController.addToCart);
  router.get("/", authenticateToken, cartController.getCart);
  router.put("/update", authenticateToken, cartController.updateCartItem);
  router.delete(
    "/remove/:cart_item_id",
    authenticateToken,
    cartController.removeCartItem
  );
  router.post("/orders/checkout", authenticateToken, cartController.checkout);
  router.get(
    "/:cartId/recommended-products",
    authenticateToken,
    cartController.getRecommendedProducts
  );
  router.get(
    "/:userId",
    authenticateToken,
    cartController.getCartByUserId
  );
};
