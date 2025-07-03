const express = require("express");
const usersController = require("../controllers/users.controller");
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

module.exports.setup = (app) => {
  app.use("/api/users", router);
  router.get("/count", authenticateToken, usersController.countUsers);
  router.get("/", usersController.getAllUsers);
  router.get("/recent", authenticateToken, usersController.getRecentUsers);
  router.get("/:id", authenticateToken, usersController.getUserById);
  router.post("/register", usersController.createUser);
  router.post("/login", usersController.login);
  router.put(
    "/change-password",
    authenticateToken,
    usersController.changePassword
  );
  router.post("/forgot-password", usersController.forgotPassword);
  router.post("/verify-otp", usersController.verifyOTP);
  router.put("/reset-password", usersController.resetPassword);
  router.put("/:id", authenticateToken, usersController.updateUser);
  router.delete("/remove/:id", authenticateToken, usersController.deleteUser);
};
