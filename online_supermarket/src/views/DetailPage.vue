<script setup>
import { ref, onMounted, nextTick, computed, watch } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import productService from "../services/product";
import cartService from "../services/cart";
import reviewService from "../services/review";
import recommendationService from "../services/recommendation";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import { debounce } from "lodash";

const quantity = ref(1);
const activeTab = ref("description");
const isExpanded = ref(false);
const contentHeight = ref(0);
const contentRef = ref(null);

const queryClient = useQueryClient();
const route = useRoute();
const router = useRouter();
const product = ref(null);
const products = ref([]);
const recommendedProducts = ref([]);
const isLoadingRecommended = ref(false);
const recommendedError = ref(null);

const mainImage = ref("");
const imageError = ref(false);

const rating = ref(0);
const reviewerName = ref("");
const reviewContent = ref("");
const reviewImages = ref([]);
const reviews = ref([]);

// const saveViewedProducts = (products) => {
//   localStorage.setItem("viewedProducts", JSON.stringify(products));
// };

// const loadViewedProducts = () => {
//   const savedProducts = localStorage.getItem("viewedProducts");
//   return savedProducts ? JSON.parse(savedProducts) : [];
// };

// const addViewedProduct = (product) => {
//   const viewedProducts = loadViewedProducts();
//   const isDuplicate = viewedProducts.some(
//     (p) => p.name === product.name && p.brand === product.brand
//   );
//   if (!isDuplicate) {
//     const updatedProducts = [product, ...viewedProducts].slice(0, 9);
//     saveViewedProducts(updatedProducts);
//   }
// };

// const handleProductClick = (product) => {
//   console.log("Product data before adding:", product);
//   addViewedProduct({
//     image: product.image,
//     name: product.name,
//     brand:
//       typeof product.brand === "object"
//         ? product.brand.br_name || "Unknown"
//         : product.brand,
//     price: product.price,
//     category:
//       typeof product.category === "object"
//         ? product.category.cate_name || "Chưa phân loại"
//         : product.category,
//   });
// };

const randomSuggestedProducts = computed(() => {
  const shuffled = [...products.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10).map((product) => ({
    _id: product._id,
    name: product.p_name,
    images: product.p_images,
    price: product.p_price,
    p_stock_quantity: product.p_stock_quantity,
  }));
});

const getProductMutation = useMutation({
  mutationFn: async () => {
    const id = route.params.id;
    const response = await productService.getProductById(id);
    return response;
  },
  onSuccess: (data) => {
    product.value = data.data;
    if (product.value.p_images && product.value.p_images.length > 0) {
      mainImage.value = getFullImageUrl(product.value.p_images[0]);
      imageError.value = false;
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Error fetching product:", error);
    alert("Không thể tải thông tin sản phẩm!");
  },
});

const getAllProductsMutation = useMutation({
  mutationFn: async () => {
    const res = await productService.getAllProduct();
    return res;
  },
  onSuccess: (data) => {
    products.value = data.data.products;
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Error fetching products:", error);
  },
});

const getRecommendedProductsMutation = useMutation({
  mutationFn: async () => {
    isLoadingRecommended.value = true;
    const recommendation = await recommendationService.getRecommendedProducts();
    return recommendation;
  },
  onSuccess: (data) => {
    isLoadingRecommended.value = false;
    if (data.success && data.products.length > 0) {
      recommendedProducts.value = data.products;
      recommendedError.value = null;
    } else {
      recommendedProducts.value = randomSuggestedProducts.value;
      recommendedError.value = null;
    }
    queryClient.invalidateQueries({ queryKey: ["recommendedProducts"] });
  },
  onError: (error) => {
    isLoadingRecommended.value = false;
    recommendedProducts.value = randomSuggestedProducts.value;
    recommendedError.value = null;
  },
});

function handleImageError() {
  imageError.value = true;
  console.error("Không thể tải ảnh chính:", mainImage.value);
}

function increaseQuantity() {
  if (quantity.value < product.value?.p_stock_quantity) {
    quantity.value++;
  } else {
    alert(
      `Số lượng không vượt quá số lượng tồn kho (${product.value?.p_stock_quantity})!`
    );
  }
}

function decreaseQuantity() {
  if (quantity.value > 1) {
    quantity.value--;
  }
}

function handleQuantityInput(event) {
  let value = parseInt(event.target.value);
  if (isNaN(value) || value < 1) {
    quantity.value = 1;
  } else if (value > product.value?.p_stock_quantity) {
    quantity.value = product.value?.p_stock_quantity;
    alert(
      `Số lượng không vượt quá số lượng tồn kho (${product.value?.p_stock_quantity})!`
    );
  } else {
    quantity.value = value;
  }
}

function onlyNumber(event) {
  const charCode = event.which ? event.which : event.keyCode;
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

function scrollLeft(event) {
  const targetKey = event.currentTarget.dataset.scrollTarget;
  const scrollWrapper = document.querySelector(
    `[data-scroll-area="${targetKey}"]`
  );
  if (scrollWrapper) {
    const scrollAmount =
      scrollWrapper.querySelector(".custom-col-product")?.offsetWidth || 200;
    scrollWrapper.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  }
}

function scrollRight(event) {
  const targetKey = event.currentTarget.dataset.scrollTarget;
  const scrollWrapper = document.querySelector(
    `[data-scroll-area="${targetKey}"]`
  );
  if (scrollWrapper) {
    const scrollAmount =
      scrollWrapper.querySelector(".custom-col-product")?.offsetWidth || 200;
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
}

function setActiveTab(tab) {
  activeTab.value = tab;
  isExpanded.value = tab === "reviews";
  nextTick(() => {
    checkContentHeight();
  });
}
function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function checkContentHeight() {
  if (contentRef.value) {
    contentHeight.value = contentRef.value.scrollHeight;
  } else {
    console.log("contentRef is null");
  }
}

function setRating(star) {
  rating.value = star;
}

const handleImageUpload = (event) => {
  const files = Array.from(event.target.files);
  const remainingSlots = 3 - reviewImages.value.length;

  if (files.length > remainingSlots) {
    alert(`Bạn chỉ có thể tải lên tối đa 3 ảnh.`);
    return;
  }

  reviewImages.value = [...reviewImages.value, ...files];
};

function getPreviewUrl(image) {
  if (image instanceof File) {
    return URL.createObjectURL(image);
  }
  return "";
}

function removeImage(index) {
  reviewImages.value.splice(index, 1);
}

const submitReview = async () => {
  if (
    !route.params.id ||
    rating.value < 1 ||
    rating.value > 5 ||
    !reviewerName.value.trim() ||
    !reviewContent.value.trim()
  ) {
    alert(
      "Vui lòng điền đầy đủ thông tin: số sao (1-5), họ tên, nội dung đánh giá!"
    );
    return;
  }

  const formData = new FormData();
  formData.append("p_id", route.params.id);
  formData.append("name", reviewerName.value.trim());
  formData.append("content", reviewContent.value.trim());
  formData.append("stars", rating.value.toString());

  reviewImages.value.forEach((file, index) => {
    if (file instanceof File) {
      formData.append("images", file);
      console.log(`Image ${index}:`, file.name, file.size);
    }
  });

  console.log("FormData contents:");
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value instanceof File ? value.name : value);
  }

  try {
    const response = await reviewService.addReview(formData);
    console.log("Review response:", response);
    if (response.status === "success") {
      alert("Đánh giá của bạn đã được gửi!");
      reviews.value.unshift(response.data);
      rating.value = 0;
      reviewerName.value = "";
      reviewContent.value = "";
      reviewImages.value.forEach((image) => {
        if (image instanceof File) {
          URL.revokeObjectURL(getPreviewUrl(image));
        }
      });
      reviewImages.value = [];
    } else {
      alert(
        `Gửi đánh giá thất bại: ${response.message || "Lỗi không xác định"}`
      );
    }
  } catch (err) {
    console.error("Lỗi khi gửi đánh giá:", err);
    const errorMessage =
      err.response?.data?.message || "Lỗi hệ thống. Vui lòng thử lại sau.";
    alert(`Lỗi: ${errorMessage}`);
  }
};

const fetchReviews = async () => {
  try {
    const response = await reviewService.getReviewByProduct(route.params.id);
    if (response.status === "success") {
      reviews.value = response.data;
    } else {
      console.warn("Không thể lấy đánh giá sản phẩm.");
    }
  } catch (error) {
    console.error("Lỗi khi tải đánh giá:", error);
  }
};

const getFullImageUrl = (relativePath) => {
  return `http://localhost:5000${encodeURI(relativePath)}`;
};

const getRecommendProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.images && product.images.length > 0
      ? encodeURI(`${baseUrl}${product.images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const changeMainImage = (imagePath) => {
  mainImage.value = getFullImageUrl(imagePath);
  imageError.value = false;
};

const addToCartMutation = useMutation({
  mutationFn: async ({ productId, quantity }) => {
    const res = await cartService.addToCart(productId, quantity);
    return res;
  },
  onSuccess: (data) => {
    alert("Đã thêm sản phẩm vào giỏ hàng!");
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    alert(`Lỗi khi thêm vào giỏ hàng: ${error.message}`);
  },
});

const updateCartMutation = useMutation({
  mutationFn: async ({ cartItemId, quantity }) => {
    return await cartService.updateCartItem(cartItemId, quantity);
  },
  onSuccess: () => {
    alert("Đã thêm sản phẩm vào giỏ hàng!");
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    alert(`Lỗi khi cập nhật giỏ hàng: ${error.message}`);
  },
});

const debouncedUpdateCart = debounce((cartItemId, quantity) => {
  updateCartMutation.mutate({ cartItemId, quantity });
}, 500);

const handleAddToCart = async (productId) => {
  const selectedProduct =
    product.value?._id === productId
      ? product.value
      : recommendedProducts.value.find((p) => p._id === productId);
  if (!selectedProduct) {
    alert("Sản phẩm không tồn tại!");
    return;
  }
  if (quantity.value > selectedProduct.p_stock_quantity) {
    alert(
      `Số lượng không vượt quá số lượng tồn kho (${selectedProduct.p_stock_quantity})!`
    );
    return;
  }
  try {
    const cartResponse = await cartService.getCart();
    const cartItems = cartResponse.data.items || [];
    const existingItem = cartItems.find((item) => item.p_id?._id === productId);

    if (existingItem) {
      const newQuantity = existingItem.cart_item_quantity + quantity.value;
      if (newQuantity > selectedProduct.p_stock_quantity) {
        alert(
          `Tổng số lượng không vượt quá số lượng tồn kho (${selectedProduct.p_stock_quantity})!`
        );
        return;
      }
      debouncedUpdateCart(existingItem._id, newQuantity);
    } else {
      addToCartMutation.mutate({ productId, quantity: quantity.value });
    }
  } catch (error) {
    alert(`Lỗi khi kiểm tra giỏ hàng: ${error.message}`);
  }
};

const handleCheckout = () => {
  if (quantity.value < 1) {
    alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
    return;
  }

  if (quantity.value > product.value?.p_stock_quantity) {
    alert(
      `Số lượng không vượt quá số lượng tồn kho (${product.value?.p_stock_quantity})!`
    );
    return;
  }

  const orderProduct = {
    p_id: product.value?._id,
    name: product.value?.p_name,
    image: product.value?.p_images?.[0]
      ? getFullImageUrl(product.value.p_images[0])
      : "",
    quantity: quantity.value,
    price: product.value?.p_price,
  };

  console.log("Order product to send:", orderProduct);
  localStorage.setItem("orderProducts", JSON.stringify([orderProduct]));
  router.push({ name: "order" });
};

const fetchProduct = async (id) => {
  if (id) {
    await getProductMutation.mutateAsync(id);
  }
};

onMounted(async () => {
  await getAllProductsMutation.mutateAsync();
  await fetchProduct(route.params.id);
  await getProductMutation.mutateAsync();
  await getRecommendedProductsMutation.mutateAsync();
  fetchReviews();
  await nextTick(() => {
    checkContentHeight();
  });
});

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      fetchProduct(newId);
    }
  }
);
</script>

<template>
  <div>
    <header><AppHeader /></header>
  </div>
  <div class="detailpage">
    <div class="container-fluid detail-container">
      <div class="category">
        <router-link to="/" class="fas fa-home"></router-link>
        <span class="fas fa-chevron-right"></span>
        <router-link
          v-if="product?.p_category"
          :to="`/categories/${product.p_category.cate_name}`"
        >
          {{ product.p_category.cate_name }}
        </router-link>
        <span class="fas fa-chevron-right"></span>
        <router-link
          v-if="product?.p_subcategory"
          :to="`/categories/${product.p_subcategory.cate_name}`"
        >
          {{ product.p_subcategory.cate_name }}
        </router-link>
      </div>
      <div class="product">
        <div class="container text-center">
          <div class="row">
            <div class="col col-lg-7 col-md-12 col-sm-12">
              <div class="image-container">
                <div class="img1">
                  <img
                    v-if="!imageError"
                    :src="mainImage"
                    alt="Main Product Image"
                    class="img-fluid main-image"
                    @error="handleImageError"
                  />
                  <div v-else class="image-error">Không thể tải ảnh.</div>
                </div>
                <div
                  class="row row-cols-lg-5 row-cols-md-5 row-cols-sm-5 gap-lg-3 gap-md-3 gap-sm-2 justify-content-center"
                >
                  <div
                    v-for="(img, index) in product?.p_images"
                    :key="index"
                    class="col img2"
                  >
                    <img
                      :src="getFullImageUrl(img)"
                      :alt="`Ảnh ${index + 1}`"
                      class="img-fluid thumbnail"
                      @click="changeMainImage(img)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              class="col col-lg-5 col-md-12 col-sm-12 mt-lg-0 mt-md-2 mt-sm-2 detail"
            >
              <div class="title">{{ product?.p_name }}</div>
              <div class="rate">
                <img src="@/assets/images/star.png" alt="" />5.0
              </div>
              <div class="price mt-4">
                {{ product?.p_price.toLocaleString("vi-VN") }} đ
              </div>
              <div class="status mt-2">
                Trạng thái: Còn hàng ({{ product?.p_stock_quantity }})
              </div>
              <div class="quantity mt-4">
                <p>Số lượng</p>
                <div class="quantity-control">
                  <button
                    class="quantity-btn decrease"
                    @click="decreaseQuantity"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    class="quantity-input"
                    v-model.number="quantity"
                    @input="handleQuantityInput"
                    @keypress="onlyNumber($event)"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    class="quantity-btn increase"
                    @click="increaseQuantity"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="btn-container">
                <button class="cart-btn" @click="handleAddToCart(product._id)">
                  <i class="fas fa-cart-plus"></i>
                  <span>Thêm giỏ hàng</span>
                </button>
                <button class="cart-btn" @click="handleCheckout">
                  <i class="fas fa-cart-shopping"></i>
                  <span>Thanh toán</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="tabs-section container-fluid">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'description' }"
          @click="setActiveTab('description')"
        >
          Mô tả
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'specifications' }"
          @click="setActiveTab('specifications')"
        >
          Thông số
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'reviews' }"
          @click="setActiveTab('reviews')"
        >
          Đánh giá
        </button>
      </div>
      <div class="tab-content" :class="{ expanded: isExpanded }">
        <div
          v-if="activeTab === 'description'"
          ref="contentRef"
          class="content"
        >
          <p>
            {{ product?.p_description || "Không có mô tả sản phẩm." }}
          </p>
        </div>
        <div
          v-if="activeTab === 'specifications'"
          ref="contentRef"
          class="content"
        >
          <ul>
            <li v-for="spec in product?.p_specifications" :key="spec._id">
              <strong>{{ spec.key }}:</strong> {{ spec.value }}
            </li>
            <li v-if="!product?.p_specifications?.length">
              Không có thông số kỹ thuật.
            </li>
          </ul>
        </div>
        <div v-if="activeTab === 'reviews'" ref="contentRef" class="content">
          <div class="add-review">
            <div class="star-rating">
              <p class="mt-2">Chất lượng sản phẩm:</p>
              <span
                v-for="star in 5"
                :key="star"
                class="star"
                :class="{ filled: star <= rating }"
                @click="setRating(star)"
              >
                ★
              </span>
            </div>
            <input
              type="text"
              v-model="reviewerName"
              placeholder="Họ tên"
              class="review-input"
            />
            <textarea
              v-model="reviewContent"
              placeholder="Nhập đánh giá của bạn"
              class="review-textarea"
            ></textarea>
            <div class="image-upload">
              <label for="image-input" class="image-upload-label">
                <i class="fas fa-camera"></i> Thêm ảnh (tối đa 3 ảnh)
              </label>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                @change="handleImageUpload"
                class="image-input"
              />
              <div class="image-preview" v-if="reviewImages.length">
                <div
                  v-for="(image, index) in reviewImages"
                  :key="index"
                  class="image-preview-item"
                >
                  <img :src="getPreviewUrl(image)" alt="Preview" />
                  <button
                    class="remove-image-btn fas fa-xmark"
                    @click="removeImage(index)"
                  ></button>
                </div>
              </div>
            </div>
            <button class="submit-btn" @click="submitReview">Đăng</button>
          </div>
          <h3 class="mt-5">Đánh giá sản phẩm</h3>
          <div
            v-for="(review, index) in reviews"
            :key="index"
            class="review-item"
          >
            <div class="star-rating">
              <span
                v-for="star in 5"
                :key="star"
                class="star"
                :class="{ filled: star <= review.stars }"
                >★</span
              >
            </div>
            <p>
              <strong>{{ review.name }}:</strong> {{ review.content }}
            </p>
            <small class="text-muted">{{
              new Date(review.created_at).toLocaleString()
            }}</small>
            <div
              class="review-images"
              v-if="review.images && review.images.length"
            >
              <img
                v-for="(image, imgIndex) in review.images"
                :key="imgIndex"
                :src="getFullImageUrl(image)"
                alt="Review Image"
              />
            </div>
            <div
              v-if="review.replies && review.replies.length"
              class="review-replies mt-2 ps-3"
            >
              <div
                v-for="(reply, rIndex) in review.replies"
                :key="rIndex"
                class="reply-item border-start ps-2 mt-4"
              >
                <p class="mb-1"><strong>Admin:</strong> {{ reply.content }}</p>
                <small class="text-muted">{{
                  new Date(reply.created_at).toLocaleString()
                }}</small>
              </div>
            </div>
          </div>
        </div>
        <button
          v-show="contentHeight > 400 && !isExpanded"
          class="expand-btn"
          @click="toggleExpand"
        >
          Xem thêm
        </button>
      </div>
    </div>
    <div class="container-fluid detail-container mb-5">
      <div class="suggest-title ms-2">Gợi ý cho bạn</div>
      <div class="container-fluid suggested-products position-relative">
        <button
          class="scroll-btn left"
          @click="scrollLeft($event)"
          data-scroll-target="suggested"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <button
          class="scroll-btn right"
          @click="scrollRight($event)"
          data-scroll-target="suggested"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="scroll-wrapper" data-scroll-area="suggested">
          <div class="row flex-nowrap gx-3 gy-4">
            <div v-if="isLoadingRecommended" class="col-auto">
              <p>Đang tải sản phẩm gợi ý...</p>
            </div>
            <div v-else-if="recommendedProducts.length === 0" class="col-auto">
              <p>Không có sản phẩm gợi ý</p>
            </div>
            <div
              v-else
              class="col-auto custom-col-product"
              v-for="product in recommendedProducts"
              :key="product._id"
            >
              <router-link :to="`/product/${product._id}`" class="img-product">
                <img
                  :src="getRecommendProductUrl(product)"
                  :alt="product.name || product.p_name"
                />
              </router-link>
              <div class="product-name">
                <p>{{ product.name || product.p_name }}</p>
              </div>
              <div class="row price-cart">
                <div class="price">
                  {{
                    (product.price || product.p_price || 0).toLocaleString(
                      "vi-VN"
                    )
                  }}
                  đ
                </div>
                <button
                  class="cart-btn-icon"
                  @click="handleAddToCart(product._id)"
                >
                  <i class="fas fa-cart-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div><AppFooter /></div>
</template>

<style scoped>
.detailpage {
  overflow-x: hidden;
}

.detail-container {
  margin: 70px auto 0;
  max-width: 1200px;
}

.category {
  padding: 20px;
}

.category a,
.category span {
  margin-right: 10px;
}

.category a:last-child,
.category span:last-child {
  margin-right: 0;
}

.category a {
  text-decoration: none;
  color: black;
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.img1 {
  background-color: #f0f0f0;
  border-radius: 5px;
  margin-bottom: 15px;
  overflow: hidden;
  width: 100%;
  max-width: 600px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

.img2 {
  background-color: #f0f0f0;
  border-radius: 5px;
  width: 107px;
  height: 107px;
}

.thumbnail {
  width: 107px;
  height: 107px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.thumbnail:hover {
  transform: scale(1.05);
}

.quantity {
  margin-top: 10px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
}

.quantity-btn {
  width: 30px;
  height: 30px;
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.quantity-btn:hover {
  background-color: #507b88;
}

.quantity-input {
  width: 60px;
  height: 30px;
  text-align: center;
  font-size: 16px;
  font-family: "Roboto", sans-serif;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.product .detail {
  text-align: left;
  font-family: "Roboto", sans-serif;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product .title {
  font-size: 36px;
  font-weight: bold;
}

.product .rate {
  font-size: 18px;
}

.product .rate img {
  width: 20px;
  height: 20px;
  margin: 0 5px 5px 0;
}

.product .price {
  font-size: 26px;
  font-family: "Be Vietnam", sans-serif;
}

.btn-container {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.tabs-section {
  max-width: 1200px;
  margin: 30px auto;
  padding: 0 20px;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  width: 200px;
  height: 40px;
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  background-color: #f5f5f5;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-btn:hover {
  background-color: #e0e0e0;
}

.tab-btn.active {
  background-color: #6399a9;
  color: white;
}

.tab-content {
  padding: 20px;
  background-color: #f0f0f0;
  height: 400px;
  border-radius: 5px;
  position: relative;
  overflow: hidden;
  transition: height 0.3s ease;
}

.tab-content.expanded {
  height: auto;
}

.content {
  text-align: justify;
}

.expand-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  font-family: "Roboto", sans-serif;
  font-size: 14px;
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  z-index: 10;
}

.expand-btn:hover {
  background-color: #507b88;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: #cadbe2;
  border: none;
  border-radius: 20%;
  width: 40px;
  height: 40px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  font-size: 18px;
}

.scroll-btn.left {
  left: -40px;
}

.scroll-btn.right {
  right: -40px;
}

.scroll-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.scroll-wrapper::-webkit-scrollbar {
  height: 8px;
}

.scroll-wrapper::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
}

.custom-col-product {
  flex: 0 0 20%;
  width: 200px;
  height: 350px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
  padding: 10px;
  box-sizing: border-box;
}

.custom-col-product .img-product {
  background-color: #f6f9fc;
  border-radius: 8px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.custom-col-product img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-name {
  width: 100%;
  word-wrap: break-word;
  overflow: hidden;
  white-space: normal;
  text-align: left;
  margin-top: 10px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price {
  font-size: 20px;
  font-weight: 500;
  width: 60%;
  text-align: left;
}

.price-cart {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
}

.cart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 15px;
  font-family: "Roboto", sans-serif;
  font-size: 14px;
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width: 150px;
}

.cart-btn:hover {
  background-color: #507b88;
}

.cart-btn-icon {
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  margin: 0 5px;
  width: 25%;
}

.cart-btn-icon:hover {
  color: #6399a9;
}

.suggest-title {
  font-size: 24px;
  font-weight: bold;
  font-family: "Roboto", sans-serif;
}

.review-item {
  margin-bottom: 15px;
}

.star-rating {
  display: flex;
  gap: 5px;
  margin: 30px 0 5px;
}

.star {
  font-size: 24px;
  color: #ccc;
  cursor: pointer;
}

.star.filled {
  color: #ffd700;
}

.add-review {
  margin-top: 20px;
  padding: 15px;
  border-radius: 5px;
}

.add-review p {
  margin: 0 0 5px;
}

.review-input,
.review-textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-family: "Roboto", sans-serif;
  font-size: 18px;
}

.review-textarea {
  height: 80px;
  resize: none;
}

.image-upload {
  margin: 10px 0;
}

.image-upload-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background-color: #6399a9;
  color: white;
  border-radius: 5px;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.image-upload-label:hover {
  background-color: #507b88;
}

.image-input {
  display: none;
}

.image-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.image-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  margin-top: 10px;
  background-color: white;
  border-radius: 5px;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 5px;
}

.review-images {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.review-images img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 5px;
  background-color: white;
}

.remove-image-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.submit-btn {
  float: right;
  padding: 8px 16px;
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-family: "Roboto", sans-serif;
  font-size: 18px;
}

.submit-btn:hover {
  background-color: #507b88;
}
</style>
