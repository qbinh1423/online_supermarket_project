<script setup>
import AppHeader from "@/components/AppHeader.vue";
import Slider from "@/components/Slider.vue";
import AdvertiseOne from "@/components/AdvertiseOne.vue";
import AdvertiseTwo from "@/components/AdvertiseTwo.vue";
import AppFooter from "@/components/AppFooter.vue";
import { ref, computed, onMounted } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import brandService from "../services/brand";
import categoryService from "../services/category";
import productService from "../services/product";
import cartService from "../services/cart";
import recommendationService from "../services/recommendation";

const queryClient = useQueryClient();
const brands = ref([]);
const category = ref([]);
const products = ref([]);
const recommendedProducts = ref([]);
const isLoadingRecommended = ref(false);
const recommendedError = ref(null);
const parentCategory = computed(() =>
  category.value.filter((cat) => cat.parent_category_id === null)
);

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
  console.log("Product data before adding:", product);
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

const randomBrands = computed(() => {
  const shuffled = [...brands.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10);
});

const randomTrendingProducts = computed(() => {
  const shuffled = [...products.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10);
});

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

const getBrandMutation = useMutation({
  mutationFn: async () => {
    const res = await brandService.getAllBrands();
    return res;
  },
  onSuccess: (data) => {
    brands.value = data.brands.map((brand) => ({
      _id: brand._id,
      br_name: brand.br_name,
      br_image: brand.br_image,
    }));
    queryClient.invalidateQueries({ queryKey: ["brands"] });
  },
  onError: (error) => {
    console.error("Error fetching brands:", error);
  },
});

const getCategoryMutation = useMutation({
  mutationFn: async () => {
    const res = await categoryService.getAllCategory();
    return res;
  },
  onSuccess: (data) => {
    category.value = data.data;
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  },
  onError: (error) => {
    console.error("Error fetching categories:", error);
  },
});

const getProductMutation = useMutation({
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

const handleAddToCart = (productId) => {
  const selectedProduct =
    products.value.find((p) => p._id === productId) ||
    recommendedProducts.value.find((p) => p._id === productId);
  if (!selectedProduct) {
    alert("Sản phẩm không tồn tại!");
    return;
  }
  if (1 > selectedProduct.p_stock_quantity) {
    alert(`Sản phẩm đã hết hàng!`);
    return;
  }
  addToCartMutation.mutate({ productId, quantity: 1 });
};

const getImageUrl = (brand) => {
  const baseUrl = "http://localhost:5000";
  const url = brand.br_image
    ? `${baseUrl}${brand.br_image}`
    : "/assets/default-brand.png";
  return url;
};

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const getRecommendProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.images && product.images.length > 0
      ? encodeURI(`${baseUrl}${product.images[0]}`)
      : "/assets/default-product.png";
  return url;
};

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

const navigateToCategory = (type) => {
  const formattedType = type.replace(/\s+/g, "-").toLowerCase();
  window.location.href = `/categories/${formattedType}`;
};

onMounted(async () => {
  await getProductMutation.mutateAsync();
  getBrandMutation.mutate();
  getCategoryMutation.mutate();
  getRecommendedProductsMutation.mutate();
});
</script>
<template>
  <div class="homepage">
    <header>
      <AppHeader />
    </header>
    <div>
      <Slider />
    </div>
    <div class="container-fluid home-container">
      <div class="title ms-2">Danh mục phổ biến</div>
      <div class="container text-center categories">
        <div class="row gx-3 gy-4 justify-content-center">
          <div
            class="col-auto custom-col"
            v-for="parent in parentCategory"
            :key="parent._id"
            @click.prevent="navigateToCategory(parent.cate_name)"
          >
            <span>{{ parent.cate_name }}</span>
          </div>
        </div>
      </div>
      <div class="title ms-2 mt-5">Sản phẩm xu hướng</div>
      <div class="container-fluid trending-products position-relative">
        <button
          class="scroll-btn left"
          @click="scrollLeft($event)"
          data-scroll-target="trending"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <button
          class="scroll-btn right"
          @click="scrollRight($event)"
          data-scroll-target="trending"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="scroll-wrapper" data-scroll-area="trending">
          <div class="row flex-nowrap gx-3 gy-4">
            <div
              class="col-auto custom-col-product"
              v-for="product in randomTrendingProducts"
              :key="product._id"
            >
              <router-link
                :to="`/product/${product._id}`"
                class="img-product"
                @click="
                  handleProductClick({
                    image: getProductUrl(product),
                    name: product.p_name,
                    brand: product.p_brand || 'Unknown',
                    category: product.p_category,
                    price: product.p_price || 0,
                  })
                "
              >
                <img :src="getProductUrl(product)" :alt="product.p_name" />
              </router-link>
              <div class="product-name">
                <p>{{ product.p_name }}</p>
              </div>
              <div class="row price-cart">
                <div class="price">
                  {{ (product.p_price || 0).toLocaleString("vi-VN") }}đ
                </div>
                <button class="cart-btn" @click="handleAddToCart(product._id)">
                  <i class="fas fa-cart-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <AdvertiseOne />
    </div>
    <div class="container-fluid home-container">
      <div class="title ms-2 mt-5">Gợi ý cho bạn</div>
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
            <div
              v-else
              class="col-auto custom-col-product"
              v-for="product in recommendedProducts"
              :key="product._id"
            >
              <router-link
                :to="`/product/${product._id}`"
                class="img-product"
                @click="
                  handleProductClick({
                    image: getProductUrl(product),
                    name: product.p_name,
                    brand: product.p_brand || 'Unknown',
                    category: product.p_category,
                    price: product.p_price || 0,
                  })
                "
              >
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
                  }}đ
                </div>
                <button class="cart-btn" @click="handleAddToCart(product._id)">
                  <i class="fas fa-cart-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <AdvertiseTwo />
    </div>
    <div class="container-fluid home-container">
      <div class="title ms-2 mt-5">Thương hiệu</div>
      <div class="container text-center brand">
        <div class="row row-cols-5 justify-content-center">
          <div v-for="brand in randomBrands" :key="brand._id" class="col mt-3">
            <router-link
              :to="{ name: 'brands', params: { br_name: brand.br_name } }"
              class="container-brand"
            >
              <img
                :src="getImageUrl(brand)"
                :alt="brand.br_name"
                class="img-fluid brand-logo"
              />
            </router-link>
          </div>
        </div>
      </div>
    </div>
    <div class="container-fluid services">
      <div class="container text-center">
        <div class="row row-cols-3">
          <div class="col">
            <img src="@/assets/images/Uy tín.png" alt="" />
            <p class="logo-des">Uy tín</p>
          </div>
          <div class="col">
            <img src="@/assets/images/Đổi trả.png" alt="" />
            <p class="logo-des">Đổi trả trong 7 ngày</p>
          </div>
          <div class="col">
            <img src="@/assets/images/Giao hàng nhanh.png" alt="" />
            <p class="logo-des">Giao hàng nhanh chóng</p>
          </div>
        </div>
      </div>
    </div>
    <footer>
      <AppFooter />
    </footer>
  </div>
</template>
<style scoped>
.homepage {
  overflow-x: hidden;
}

.home-container {
  margin-top: 20px;
  height: 100%;
  max-width: 1200px;
  width: 100%;
}

.title {
  font-size: 24px;
  font-weight: bold;
  font-family: "Roboto", sans-serif;
}

.custom-col {
  padding: 15px;
  flex: 1 1 15%;
  border-radius: 10px;
  max-width: 20%;
  margin: 30px 8px 0px 8px;
  min-width: 150px;
  background-color: #f6f9fc;
  display: flex;
  flex-direction: column;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  color: black;
  cursor: pointer;
  transition: 0.2s ease;
}

.custom-col:hover {
  background-color: #e8f2fc;
  color: black;
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
  text-align: left;
  margin-top: 10px;
  word-wrap: break-word;
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
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  margin: 0 5px;
  width: 25%;
}

.cart-btn:hover {
  color: #6399a9;
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

.container-brand {
  border-radius: 5px;
  width: 150px;
  height: 80px;
  display: flex;
  justify-content: center;
  text-decoration: none;
  padding: 10px;
  transition: background-color 0.3s ease;
}

.container-brand:hover {
  background-color: #f6f9fc;
}

.container-brand img {
  object-fit: contain;
  transition: transform 0.3s ease;
}

.container-brand:hover img {
  transform: scale(1.1);
}

.img-fluid {
  max-width: 100%;
  height: 60px;
}

.services {
  padding: 40px 0;
  margin: 5rem 0;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
}

.services .logo-des {
  font-size: 24px;
  font-family: "Roboto", sans-serif;
  font-weight: bold;
}

@media (max-width: 1168px) {
  .scroll-btn.left {
    left: 0px;
  }

  .scroll-btn.right {
    right: 0px;
  }
}
</style>
