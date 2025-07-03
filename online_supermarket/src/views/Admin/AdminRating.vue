<script setup>
import { ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import reviewService from "../../services/review";
import productService from "../../services/product";

const BASE_URL = "http://localhost:5000"; 

const products = ref([]);
const queryClient = useQueryClient();

const { data: productData, isLoading: isProductLoading, error: productError } = useQuery({
  queryKey: ["products"],
  queryFn: () => productService.getAllProduct(),
  onError: (error) => {
    console.error("Error fetching products:", error.message, error.stack);
  },
});

const { data: reviewData, isLoading: isReviewLoading, error: reviewError } = useQuery({
  queryKey: ["reviews"],
  queryFn: () => reviewService.getAllReview(),
  onError: (error) => {
    console.error("Error fetching reviews:", error.message, error.stack);
  },
});

watch([productData, reviewData], ([productsRaw, reviewsRaw]) => {
  if (!productsRaw || !reviewsRaw?.data?.review) {
    console.log("Missing product or review data:", { productsRaw, reviewsRaw });
    products.value = [];
    return;
  }

  const rawProducts = Array.isArray(productsRaw)
    ? productsRaw
    : productsRaw.data?.products || productsRaw.data || [];

  const reviews = reviewsRaw.data.review;
  const productMap = {};

  reviews.forEach((review) => {
    const productId = review.p_id;

    if (!productMap[productId]) {
      const product = rawProducts.find((p) => (p._id || p.id) === productId) || {
        id: productId,
        p_name: `Product ${productId}`,
        p_images: null,
      };

      productMap[productId] = {
        id: product._id || product.id,
        name: product.p_name || product.name || `Product ${productId}`,
        image: product.p_images?.[0] || null,
        reviews: [],
        reviewCount: 0,
        averageRating: 0,
      };
    }

    productMap[productId].reviews.push({
      id: review._id,
      name: review.name,
      rating: review.stars,
      comment: review.content,
      image: review.images?.[0] || null,
      images: review.images || [],
      created_at: review.created_at || new Date().toISOString(),
      replies: review.replies || [],
    });
    console.log("Review replies:", review.replies);
  });

  products.value = Object.values(productMap)
    .filter((product) => product.reviews.length > 0)
    .map((product) => {
      const reviewCount = product.reviews.length;
      const averageRating =
        reviewCount > 0
          ? (
              product.reviews.reduce((sum, r) => sum + r.rating, 0) /
              reviewCount
            ).toFixed(1)
          : 0;

      return {
        ...product,
        reviewCount,
        averageRating,
      };
    });
});

const getProductUrl = (image) => {
  if (!image) return "/assets/placeholder.png";
  return encodeURI(`${BASE_URL}${image}`);
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return "/assets/placeholder.png";

  if (imagePath.startsWith("http") || imagePath.startsWith("blob:")) {
    return imagePath; 
  }

  const baseUrl = "http://localhost:5000";
  return encodeURI(`${baseUrl}${imagePath}`);
};



const handleImageLoad = (url) => {
  console.log(`Image loaded successfully: ${url}`);
};

const handleImageError = (url, errorEvent) => {
  console.error(`Image failed to load: ${url}`, errorEvent);
};



const selectedProduct = ref(null);
const replyingReviewId = ref(null);
const replyContent = ref("");
const editingReplyId = ref(null);
const editReplyContent = ref("");

const showReviews = (product) => {
  selectedProduct.value = product;
};

const closePopup = () => {
  selectedProduct.value = null;
  replyingReviewId.value = null;
  replyContent.value = "";
  editingReplyId.value = null;
  editReplyContent.value = "";
};

const deleteReviewMutation = useMutation({
  mutationFn: async (reviewId) => {
    return reviewService.deleteReview(reviewId);
  },
  onSuccess: (_, reviewId) => {
    const product = products.value.find((p) =>
      p.reviews.some((r) => r.id === reviewId)
    );

    if (product) {
      product.reviews = product.reviews.filter((r) => r.id !== reviewId);
      product.reviewCount = product.reviews.length;
      product.averageRating =
        product.reviewCount > 0
          ? (
              product.reviews.reduce((sum, r) => sum + r.rating, 0) /
              product.reviewCount
            ).toFixed(1)
          : 0;
    }

    alert("Đã xóa đánh giá thành công.");
  },
  onError: (err) => {
    console.error("Xóa đánh giá thất bại:", err);
    alert("Không thể xóa đánh giá. Vui lòng thử lại.");
  },
});

const deleteReview = (reviewId) => {
  if (confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) {
    deleteReviewMutation.mutate(reviewId);
  }
};

const startReply = (reviewId) => {
  replyingReviewId.value = reviewId;
  replyContent.value = "";
  editingReplyId.value = null;
};

const submitReplyMutation = useMutation({
  mutationFn: async ({ productId, reviewId, content }) => {
    return reviewService.replyToReview(reviewId, content);
  },
  onSuccess: async (data, { productId, reviewId, content }) => {
    const product = products.value.find((p) => p.id === productId);
    const review = product?.reviews.find((r) => r.id === reviewId);

    if (review) {
      const newReply = data?.data?.replies?.at(-1);
      if (newReply) {
        review.replies.push(newReply);
      } else {
        review.replies.push({
          _id: crypto.randomUUID(), 
          username: "Admin",
          content,
          created_at: new Date().toISOString(),
        });
      }
    }

    replyingReviewId.value = null;
    replyContent.value = "";
  },
  onError: (error) => {
    console.error("Error submitting reply:", error);
    alert("Không thể gửi phản hồi. Vui lòng thử lại!");
  },
});

const submitReply = (productId, reviewId) => {
  if (!replyContent.value.trim()) {
    alert("Vui lòng nhập nội dung phản hồi!");
    return;
  }
  submitReplyMutation.mutate({ productId, reviewId, content: replyContent.value });
};

const cancelReply = () => {
  replyingReviewId.value = null;
  replyContent.value = "";
};

const startEditReply = (reviewId, replyId, content) => {
  editingReplyId.value = `${reviewId}-${replyId}`;
  editReplyContent.value = content;
  replyingReviewId.value = null;
};

const saveEditReplyMutation = useMutation({
  mutationFn: async ({ reviewId, replyId, content }) => {
    return reviewService.updateReply(reviewId, replyId, content);
  },
  onSuccess: (_, { productId, reviewId, replyId, content }) => {
    const product = products.value.find((p) => p.id === productId);
    const review = product?.reviews.find((r) => r.id === reviewId);
    const reply = review?.replies.find((r) => r._id === replyId);
    if (reply) reply.content = content;

    editingReplyId.value = null;
    editReplyContent.value = "";
  },
  onError: (err) => {
    alert("Không thể cập nhật phản hồi.");
    console.error(err);
  },
});

const saveEditReply = (productId, reviewId, replyId) => {
  if (!editReplyContent.value.trim()) {
    alert("Vui lòng nhập nội dung phản hồi!");
    return;
  }
  saveEditReplyMutation.mutate({
    productId,
    reviewId,
    replyId,
    content: editReplyContent.value,
  });
};

const cancelEditReply = () => {
  editingReplyId.value = null;
  editReplyContent.value = "";
};

const deleteReplyMutation = useMutation({
  mutationFn: async ({ reviewId, replyId }) => {
    return reviewService.deleteReply(reviewId, replyId);
  },
  onSuccess: (_, { productId, reviewId, replyId }) => {
    const product = products.value.find((p) => p.id === productId);
    const review = product?.reviews.find((r) => r.id === reviewId);
    if (review) {
      review.replies = review.replies.filter((r) => r._id.toString() !== replyId);
    }
  },
  onError: (err) => {
    alert("Xóa phản hồi thất bại.");
    console.error(err);
  },
});

const deleteReply = (productId, reviewId, replyId) => {
  if (confirm("Bạn có chắc chắn muốn xóa phản hồi này không?")) {
    deleteReplyMutation.mutate({ productId, reviewId, replyId });
  }
};

</script>

<template>
  <div class="container-fluid rating-container">
    <div class="header-content">
      <h1 class="header-title">Quản lý đánh giá sản phẩm</h1>
    </div>
    <div class="product-list">
      <div
        v-for="product in products"
        :key="product.id"
        class="product-item"
        @click="showReviews(product)"
      >
        <img
          v-if="product.image"
          :src="getProductUrl(product.image)"
          alt="Product Image"
          class="product-image"
          @load="handleImageLoad(getProductUrl(product.image))"
          @error="e => { handleImageError(getProductUrl(product.image), e); e.target.src = '/assets/placeholder.png'; }"
        />
        <div class="product-info">
          <h3 class="product-name">{{ product.name }}</h3>
          <div class="rating-info">
            <div class="stars">
              <span
                v-for="n in 5"
                :key="n"
                class="star"
                :class="{ filled: n <= Math.round(product.averageRating) }"
              >
                ★
              </span>
            </div>
            <span class="review-count">({{ product.reviewCount }} đánh giá)</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="selectedProduct" class="popup-overlay">
      <div class="popup-content">
        <h2>{{ selectedProduct.name }}</h2>
        <button class="close-btn" @click="closePopup">×</button>
        <div class="reviews-list">
          <div
            v-for="review in selectedProduct.reviews"
            :key="review.id"
            class="review-item"
          >
            <div class="review-content">
              <div class="review-header">
                <span class="username">{{ review.name }}</span>
                <div class="stars">
                  <span
                    v-for="n in 5"
                    :key="n"
                    class="star"
                    :class="{ filled: n <= review.rating }"
                  >
                    ★
                  </span>
                </div>
              </div>
              <p class="comment">{{ review.comment }}</p>
              <div v-if="review.images && review.images.length">
                <img
                  v-for="(img, index) in review.images"
                  :key="index"
                  :src="getImageUrl(img)"
                  alt="Review Image"
                  class="comment-image"
                  @load="handleImageLoad(getImageUrl(img))"
                  @error="e => { handleImageError(getImageUrl(img), e); e.target.src = '/assets/placeholder.png'; }"
                />
              </div>
              <div v-if="review.replies && review.replies.length > 0" class="replies-list">
                <div
                  v-for="reply in review.replies"
                  :key="reply._id"
                  class="reply-item"
                >
                  <div v-if="editingReplyId !== `${review.id}-${reply._id}`">
                    <span class="reply-username">{{ reply.username }}:</span>
                    <p class="reply-content">{{ reply.content }}</p>
                    <span class="reply-date">{{ new Date(reply.created_at).toLocaleDateString('vi-VN') }}</span>
                    <i
                      class="fas fa-edit edit-icon"
                      @click="startEditReply(review.id, reply._id, reply.content)"
                    ></i>
                    <i
                      class="fas fa-trash delete-icon"
                      @click="deleteReply(selectedProduct.id, review._id, reply._id)"
                    ></i>
                  </div>
                  <div v-else class="edit-reply-form">
                    <textarea
                      v-model="editReplyContent"
                      class="reply-textarea"
                    ></textarea>
                    <div class="reply-actions">
                      <button
                        class="save-reply-btn"
                        @click="saveEditReply(selectedProduct.id, review.id, reply._id)"
                      >
                        Lưu
                      </button>
                      <button class="cancel-reply-btn" @click="cancelEditReply">
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="replyingReviewId === review.id" class="reply-form">
                <textarea
                  v-model="replyContent"
                  placeholder="Nhập phản hồi của bạn..."
                  class="reply-textarea"
                ></textarea>
                <div class="reply-actions">
                  <button
                    class="submit-reply-btn"
                    @click="submitReply(selectedProduct.id, review.id)"
                  >
                    Gửi
                  </button>
                  <button class="cancel-reply-btn" @click="cancelReply">
                    Hủy
                  </button>
                </div>
              </div>
              <div class="review-actions">
                <button
                  class="delete-btn"
                  @click="deleteReview(review.id)"
                >
                  <span class="material-icons-sharp">delete</span>
                </button>
                <button class="reply-btn" @click="startReply(review.id)">
                  Trả lời
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.rating-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.header-title {
  text-align: center;
  font-weight: bold;
  margin-bottom: 20px;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
}

.product-item:hover {
  background: #e0e0e0;
}

.product-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 5px;
  margin-right: 20px;
}

.product-info {
  flex: 1;
}

.product-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
}

.stars {
  color: #ccc;
}

.star.filled {
  color: #f39c12;
}

.review-count {
  color: #666;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  border-radius: 10px;
  padding: 20px;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.popup-content h2{
  font-weight: bold;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.review-item {
  display: flex;
  gap: 15px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.review-content {
  flex: 1;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.username {
  font-weight: 500;
}

.comment {
  margin: 5px 0;
}

.comment-image {
  max-width: 100px;
  margin-top: 10px;
  border-radius: 5px;
}

.replies-list {
  margin-top: 10px;
  padding-left: 20px;
  border-left: 2px solid #ddd;
  max-width: 100%;
}

.reply-item {
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 100%;
}

.reply-username {
  font-weight: 500;
  color: #1890ff;
  flex-shrink: 0;
}

.reply-content {
  margin-left: 5px;
  max-width: 700px;
  overflow-wrap: break-word;
  white-space: normal;
}

.edit-icon {
  cursor: pointer;
  color: #1890ff;
  font-size: 1rem;
  margin-left: 10px;
  flex-shrink: 0;
}

.edit-icon:hover {
  color: #40a9ff;
}

.delete-icon {
  cursor: pointer;
  color: #ff4d4f;
  font-size: 1rem;
  margin-left: 10px;
  flex-shrink: 0;
}

.delete-icon:hover {
  color: #ff7875;
}

.reply-form,
.edit-reply-form {
  margin-top: 10px;
  width: 100%;
}

.reply-textarea {
  width: 100%;
  max-width: 730px;
  min-height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.reply-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.submit-reply-btn,
.save-reply-btn {
  background: #1890ff;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-reply-btn {
  background: #ccc;
  color: black;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.review-actions {
  display: flex;
  justify-content: end;
  gap: 10px;
  margin-top: 10px;
}

.delete-btn,
.reply-btn {
  padding: 6px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  color: #212529;
  transition: all 0.3s ease;
  margin: 0 4px;
}

.delete-btn:hover {
  background: #dc3545;
  color: #ffffff;
  border-color: #dc3545;
}
.reply-btn:hover {
  background: #6399a9;
  color: #ffffff;
  border-color: #6399a9;
}
</style>
