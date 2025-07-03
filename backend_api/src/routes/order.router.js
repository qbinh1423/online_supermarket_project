const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/auth");
const OrderController = require("../controllers/order.controller");

module.exports.setup = (app) => {
  app.use("/api/order", router);
  router.post("/", authenticateToken, OrderController.createOrderController);
  router.post(
    "/items",
    authenticateToken,
    OrderController.addOrderItemController
  );
  router.put(
    "/:order_id",
    authenticateToken,
    OrderController.updateOrderController
  );
  router.put(
    "/items/:order_detail_id",
    authenticateToken,
    OrderController.updateOrderItemController
  );
  router.put(
    "/:order_id/status",
    authenticateToken,
    OrderController.updateOrderStatusController
  );
  router.delete(
    "/:order_id",
    authenticateToken,
    OrderController.deleteOrderController
  );
  router.get("/", OrderController.getAllOrderController);
  router.get(
    "/customer/:c_id",
    authenticateToken,
    OrderController.getOrderByIdCustomerController
  );
  router.get(
    "/count/:status",
    authenticateToken,
    OrderController.getCountOrderController
  );
  router.get(
    "/:order_id",
    authenticateToken,
    OrderController.getOrderDetailController
  );
};
