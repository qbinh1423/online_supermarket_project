<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import productService from "../services/product";

const router = useRouter();
const products = ref([]);
const queryClient = useQueryClient();
const currentIndex = ref(0);
const direction = ref("right");
let autoSlideInterval = null;
let inactivityTimeout = null;

function getRandomProducts(array, count) {
  if (!array || array.length === 0) return [];
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

const getProductMutation = useMutation({
  mutationFn: async () => {
    const res = await productService.getProductByCategory(
      "trang-trí-phòng-khách"
    );
    return res;
  },
  onSuccess: (data) => {
    const allProducts = data.data.products || [];
    products.value = getRandomProducts(allProducts, 4);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Failed to fetch products:", error.message);
    products.value = [];
  },
});

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product?.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "../assets/no-image.png";
  return url;
};

function nextDot() {
  resetInactivityTimer();
  direction.value = "right";
  if (currentIndex.value < products.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0;
  }
}

function goToSlide(index) {
  resetInactivityTimer();
  direction.value = index > currentIndex.value ? "right" : "left";
  currentIndex.value = index;
}

function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    nextDot();
  }, 5000);
}

function resetInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
  }
  inactivityTimeout = setTimeout(() => {
    startAutoSlide();
  }, 3000);
}

const saveViewedProducts = (products) => {
  localStorage.setItem("viewedProducts", JSON.stringify(products));
};

const loadViewedProducts = () => {
  const savedProducts = localStorage.getItem("viewedProducts");
  return savedProducts ? JSON.parse(savedProducts) : [];
};

const addViewedProduct = (product) => {
  const viewedProducts = loadViewedProducts();
  const isDuplicate = viewedProducts.some(
    (p) => p.name === product.name && p.brand === product.brand
  );
  if (!isDuplicate) {
    const updatedProducts = [product, ...viewedProducts].slice(0, 9);
    saveViewedProducts(updatedProducts);
  }
};

const handleProductClick = (product) => {
  addViewedProduct({
    image: product.image,
    name: product.name,
    brand:
      typeof product.brand === "object"
        ? product.brand.br_name || "Unknown"
        : product.brand,
    price: product.price,
    category:
      typeof product.category === "object"
        ? product.category.cate_name || "Chưa phân loại"
        : product.category,
  });
};

onMounted(() => {
  startAutoSlide();
  getProductMutation.mutate();
});

onUnmounted(() => {
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
  }
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
});
</script>
<template>
  <div class="adv-part-one">
    <div class="black-overlay"></div>
    <div class="row part-one">
      <div class="col-lg-7 col-md-6 col-sm-12 content-on-bg me-lg-5">
        <p>
          TRANG TRÍ PHÒNG KHÁCH<br />HOẶC PHÒNG NGỦ<br />THEO PHONG CÁCH CỦA BẠN
        </p>
        <router-link
          to="/categories/trang-trí-phòng-khách"
          class="detail-btn1 mt-5"
        >
          Chi tiết
        </router-link>
      </div>
      <div class="col-lg-3 col-md-5 col-sm-12 slide-product-one ms-lg-5">
        <div class="slider-content">
          <transition :name="`slide-${direction}`" mode="out-in">
            <div
              v-if="products.length > 0"
              class="slider-item"
              :key="currentIndex"
            >
              <router-link :to="`/product/${products[currentIndex]?._id}`">
                <img
                  v-if="products.length > 0"
                  :src="getProductUrl(products[currentIndex])"
                  alt=""
                  style="cursor: pointer"
                  @click="
                    () => {
                      const product = products[currentIndex];
                      handleProductClick({
                        _id: product._id,
                        image: getProductUrl(product),
                        name: product.p_name,
                        brand: product.p_brand,
                        price: product.p_price,
                        category: product.p_category,
                      });
                      $router.push(`/product/${product._id}`);
                    }
                  "
                />
              </router-link>
              <div class="product-info">
                <p class="product-description">
                  {{ products[currentIndex]?.p_name || "Tên sản phẩm" }}
                </p>
                <p class="product-price">
                  {{
                    products[currentIndex]?.p_price?.toLocaleString("vi-VN") ||
                    "0"
                  }}đ
                </p>
              </div>
            </div>
            <div v-else class="slider-item">
              <img src="../assets/no-image.png" alt="No product" />
              <div class="product-info">
                <p class="product-description">Không có sản phẩm</p>
                <p class="product-price">0đ</p>
              </div>
            </div>
          </transition>
        </div>
        <div class="pagination-dots">
          <span
            v-for="(product, index) in products"
            :key="index"
            class="dot"
            :class="{ active: currentIndex === index }"
            @click="goToSlide(index)"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.adv-part-one {
  margin: 40px auto 0;
  max-width: 1540px;
  background-image: url("@/assets/images/image1.png");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  position: relative;
  font-family: "Roboto", sans-serif;
}

.adv-part-one .part-one {
  padding: 3rem 0 2rem;
  justify-content: center;
}

.black-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.content-on-bg {
  position: relative;
  z-index: 2;
  text-align: left;
  color: white;
  padding: 16px;
  font-size: 36px;
  font-weight: bold;
}

.content-on-bg .detail-btn1 {
  border: 1px solid white;
  border-radius: 10px;
  color: white;
  font-size: 22px;
  text-decoration: none;
  padding: 8px 20px;
  margin-top: 10px;
  transition: 0.3s ease;
}

.detail-btn1:hover {
  background-color: #6399a9;
  border: 1px solid #6399a9;
}

.slide-product-one {
  position: relative;
  z-index: 2;
  color: black;
  background-color: white;
  padding: 8px 20px;
  border-radius: 10px;
  height: 20rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.slide-product-one img {
  width: 100%;
  height: 150px;
  object-fit: contain;
  border-radius: 12px;
}

.slide-product-one .product-description {
  margin-top: 10px;
  width: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20px;
}

.slide-product-one .product-price {
  font-family: "Be Vietnam", sans-serif;
  font-size: 26px;
  font-weight: bold;
}

.scroll-btn-slide {
  position: absolute;
  top: 25%;
  transform: translateY(-50%);
  border: none;
  border-radius: 20%;
  width: 30px;
  height: 30px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  font-size: 16px;
}

.left-btn {
  left: 0px;
}

.right-btn {
  right: 0px;
}

.slider-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.slider-item {
  width: 100%;
  height: 100%;
  position: absolute;
}

.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.pagination-dots {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  background-color: #ccc;
  border-radius: 50%;
  margin: 0 5px;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.dot.active {
  background-color: #000000;
}

@media (max-width: 1168px) {
  .content-on-bg {
    padding: 30px;
  }
}

@media (max-width: 768px) {
  .left-btn {
    left: 20px;
  }
  .right-btn {
    right: 20px;
  }

  .slide-product-one {
    width: 30rem;
  }
}
</style>
