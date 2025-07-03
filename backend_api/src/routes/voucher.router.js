const express = require("express");
const router = express.Router();
const voucherController = require("../controllers/voucher.controller");
const authenticateToken = require("../middlewares/auth");

module.exports.setup = (app) => {
  app.use("/api/voucher", router);

  router.get("/", voucherController.getAllVouchers);
  router.get("/count", authenticateToken, voucherController.getVoucherCount);
  router.get("/:id", voucherController.getVoucherById);
  router.post("/add", authenticateToken, voucherController.createVoucher);
  router.put("/update/:id", authenticateToken, voucherController.updateVoucher);
  router.delete(
    "/remove/:id",
    authenticateToken,
    voucherController.deleteVoucher
  );
};
