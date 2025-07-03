const reviewService = require("../services/review.service");
const Review = require("../models/review");
const path = require("path");
const fs = require("fs");

async function createReview(req, res) {
  try {
    let images = [];

    const reviewDir = path.join(__dirname, "../uploads/review");
    if (!fs.existsSync(reviewDir)) {
      fs.mkdirSync(reviewDir, { recursive: true });
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const originalName = Buffer.from(file.originalname, "latin1").toString(
          "utf8"
        );
        const fileName = `${Date.now()}-${originalName}`;
        const filePath = path.join(reviewDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        images.push(`/uploads/review/${fileName}`);
      });
    }

    if (!req.body) {
      return res.status(400).json({
        status: "error",
        message: "Missing request body",
      });
    }

    const { p_id, name, content, stars } = req.body;
    const c_id = req.user?._id || req.body.c_id;
    if (!c_id || c_id === "null") {
      return res.status(401).json({
        status: "error",
        message: "Bạn cần đăng nhập để đánh giá sản phẩm.",
      });
    }

    const review = await reviewService.createReview({
      p_id,
      c_id,
      name,
      content,
      stars: Number(stars),
      images,
    });

    res.json({
      status: "success",
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function getReviewsByProduct(req, res) {
  const { p_id } = req.params;

  try {
    const reviews = await reviewService.getReviewsByProductId(p_id);
    res.status(200).json({ status: "success", data: reviews });
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá:", error);
    res
      .status(500)
      .json({ status: "error", message: "Lỗi server khi lấy đánh giá" });
  }
}

async function getAllReviews(req, res) {
  try {
    const data = await reviewService.getAllReviews();
    res.status(200).json({
      success: true,
      data: {
        review: data.review,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        totalItems: data.totalItems,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteReviewById(req, res) {
  try {
    const reviewId = req.params.id;
    const deleted = await reviewService.deleteReviewById(reviewId);

    if (deleted.images && deleted.images.length > 0) {
      deleted.images.forEach((imgPath) => {
        const fullPath = path.join(__dirname, "..", imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ status: "error", message: "Review not found" });
    }

    res.json({ status: "success", message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function replyToReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { content, username } = req.body;

    const updatedReview = await reviewService.replyToReview(reviewId, {
      content,
      username,
    });

    res.json({
      status: "success",
      message: "Reply added successfully",
      data: updatedReview,
    });
  } catch (error) {
    console.error("Error replying to review:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function updateReply(req, res) {
  try {
    const { reviewId, replyId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ status: "error", message: "Reply content is required" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ status: "error", message: "Review not found" });
    }

    const reply = review.replies.id(replyId);
    if (!reply) {
      return res
        .status(404)
        .json({ status: "error", message: "Reply not found" });
    }

    reply.content = content;
    reply.updated_at = new Date();

    await review.save();

    res.json({ status: "success", message: "Reply updated", data: reply });
  } catch (err) {
    console.error("Update Reply Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

async function deleteReply(req, res) {
  try {
    const { reviewId, replyId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.replies = review.replies.filter((r) => r._id.toString() !== replyId);

    await review.save();

    res.json({ status: "success", message: "Reply deleted" });
  } catch (err) {
    console.error("Lỗi khi xóa reply:", err);
    res.status(500).json({ message: err.message });
  }
}

async function getReviewByUserId(req, res) {
  const { c_id } = req.params;
  try {
    const reviews = await reviewService.getReviewByUserId(c_id);
    res.status(200).json({
      status: "success",
      data: reviews,
    });
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá của người dùng:", error);
    res.status(500).json({
      status: "error",
      message: "Không thể lấy đánh giá của người dùng",
    });
  }
}

module.exports = {
  createReview,
  getReviewsByProduct,
  getAllReviews,
  deleteReviewById,
  replyToReview,
  updateReply,
  deleteReply,
  getReviewByUserId,
};
