const express = require("express");
const reviewController = require("../controllers/review.controller");
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

module.exports.setup = (app, upload) => {
  app.use("/api/reviews", router);
  router.post(
    "/add",
    upload.array("images", 3),
    authenticateToken,
    reviewController.createReview
  );
  router.get("/product/:p_id", reviewController.getReviewsByProduct);
  router.get("/", reviewController.getAllReviews);
  router.delete("/:id", reviewController.deleteReviewById);

  router.post("/:reviewId/reply", reviewController.replyToReview);
  router.put("/:reviewId/replies/:replyId", reviewController.updateReply);
  router.delete("/:reviewId/replies/:replyId", reviewController.deleteReply);
  router.get("/user/:c_id", reviewController.getReviewByUserId);
};
