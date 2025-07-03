<script setup>
import { ref, onMounted } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import reviewService from "../services/review";
import { useRouter } from "vue-router";

const reviews = ref([]);
const router = useRouter();

const fetchUserReviews = useMutation({
  mutationFn: async () => {
    const res = await reviewService.getReviewsByUserId();
    console.log("Full raw response from API:", res);
    return res.data;
  },
  onSuccess: (data) => {
    console.log("onSuccess received:", data);
    reviews.value = Array.isArray(data) ? data : [];
    console.log("Final reviews.value:", reviews.value);
  },
  onError: (error) => {
    console.error("Error loading user reviews:", error.message);
    alert("Lỗi khi tải đánh giá: " + error.message);
  },
});

const getFullImageUrl = (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") return "";
  if (relativePath.startsWith("http") || relativePath.startsWith("blob:")) {
    return relativePath;
  }
  return `http://localhost:5000${encodeURI(relativePath)}`;
};

onMounted(() => {
  const token = localStorage.getItem("token");
  console.log("Token:", token);
  if (!token) {
    alert("Vui lòng đăng nhập để xem đánh giá");
    router.push({ name: "login" });
    return;
  }
  fetchUserReviews.mutate();
});
</script>
<template>
  <div class="tb-content">
    <h2>Đánh giá sản phẩm</h2>
    <div class="review-list">
      <div v-if="reviews.length === 0" class="no-reviews">
        Chưa có đánh giá nào.
      </div>
      <div
        v-else
        class="review-item"
        v-for="(review, index) in reviews"
        :key="index"
      >
        <div class="product-details">
          <div class="product-image">
            <img
              :src="getFullImageUrl(review.p_id?.p_images?.[0])"
              alt="Product Image"
              class="product-img"
            />
          </div>
          <div class="product-info">
            <div class="product-name">{{ review.p_id?.p_name }}</div>
          </div>
          <div class="product-price">
            {{ review.p_id?.p_price?.toLocaleString("vi-VN") }} đ
          </div>
        </div>
        <div class="review-details">
          <div class="rating">
            <span v-for="star in 5" :key="star" class="star">
              <i
                :class="
                  star <= review.stars ? 'fas fa-star filled' : 'fas fa-star'
                "
              ></i>
            </span>
          </div>
          <div class="reviewer-name">{{ review.name }}</div>
          <div class="review-content">{{ review.content }}</div>
          <div
            class="review-images"
            v-if="review.images && review.images.length > 0"
          >
            <img
              v-for="(image, imgIndex) in review.images"
              :key="imgIndex"
              :src="getFullImageUrl(image)"
              alt="Review Image"
              class="review-img"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 20px;
  font-size: 16px;
  color: #333;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.review-list {
  min-height: 200px;
}

.no-reviews {
  text-align: center;
  font-size: 18px;
  color: #666;
  padding: 20px;
}

.review-item {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.product-details {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.product-image {
  flex-shrink: 0;
}

.product-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 5px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.product-quantity {
  font-size: 14px;
  color: #666;
}

.product-price {
  font-size: 16px;
  font-weight: bold;
  color: #d4575d;
}

.review-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rating {
  display: flex;
  gap: 3px;
}

.star {
  font-size: 16px;
  color: #ddd;
}

.star .filled {
  color: #f5c518;
}

.reviewer-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.review-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.review-images {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.review-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 5px;
}
</style>
