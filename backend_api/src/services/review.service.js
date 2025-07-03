const Review = require("../models/review");
const Product = require("../models/product");

async function createReview(data) {
  try {
    console.log("Saving review with c_id:", data.c_id);
    const review = new Review(data);
    await review.save();
    return review;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
}

async function getReviewsByProductId(p_id) {
  try {
    return await Review.find({ p_id }).sort({ created_at: -1 });
  } catch (error) {
    throw new Error("Không thể lấy đánh giá sản phẩm");
  }
}

const getAllReviews = async () => {
  try {
    const reviews = await Review.find().lean();

    const products = await Product.find().lean();

    const formattedReviews = reviews.map((review) => ({
      _id: review._id,
      p_id: review.p_id,
      c_id: review.c_id,
      name: review.name,
      content: review.content,
      stars: review.stars,
      images: review.images || [],
      replies: review.replies || [],
      created_at: review.created_at,
    }));

    return {
      review: formattedReviews,
      totalItems: reviews.length,
      totalPages: 1,
      currentPage: 1,
    };
  } catch (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }
};

async function deleteReviewById(id) {
  return await Review.findByIdAndDelete(id);
}

async function replyToReview(reviewId, replyData) {
  const { content, username = "Admin" } = replyData;

  if (!content) {
    throw new Error("Reply content is required");
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error("Review not found");
  }

  review.replies.push({
    content,
    username,
    created_at: new Date(),
  });

  await review.save();
  return review;
}

async function updateReply(reviewId, replyIndex, newContent) {
  const review = await Review.findById(reviewId);
  if (
    typeof replyIndex !== "number" ||
    replyIndex < 0 ||
    replyIndex >= review.replies.length
  ) {
    throw new Error("Invalid reply index");
  }

  review.replies[replyIndex].content = newContent;
  review.replies[replyIndex].updated_at = new Date();

  await review.save();
  return review;
}

async function deleteReply(reviewId, replyIndex) {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error("Review not found");

  if (
    typeof replyIndex !== "number" ||
    replyIndex < 0 ||
    replyIndex >= review.replies.length
  ) {
    throw new Error("Invalid reply index");
  }

  review.replies.splice(replyIndex, 1);
  await review.save();

  return review;
}

async function getReviewByUserId(c_id) {
  try {
    return await Review.find({ c_id })
      .populate("p_id")
      .sort({ created_at: -1 });
  } catch (error) {
    throw new Error("Không thể lấy đánh giá của người dùng");
  }
}

module.exports = {
  createReview,
  getReviewsByProductId,
  getAllReviews,
  deleteReviewById,
  replyToReview,
  updateReply,
  deleteReply,
  getReviewByUserId,
};
