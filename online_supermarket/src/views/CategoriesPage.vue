<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import productService from "../services/product";
import cartService from "../services/cart";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const queryClient = useQueryClient();
const selectedBrands = ref([]);
const maxPrice = ref(100000000);
const brandSearch = ref("");
const products = ref([]);
const category = ref(null);
const route = useRoute();
const router = useRouter();
const brands = ref([]);
const cateName = ref(route.params.cate_name);

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

const getBreadcrumbCategories = (currentCategory) => {
  const breadcrumbs = [];
  let current = currentCategory;

  while (current) {
    breadcrumbs.unshift({
      cate_name: current.cate_name,
      _id: current._id,
    });
    current = current.parent_category_id;
  }

  return breadcrumbs;
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
    const res = await cartService.updateCartItem(cartItemId, quantity);
    return res;
  },
  onSuccess: () => {
    alert("Đã cập nhật giỏ hàng!");
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    alert(`Lỗi khi cập nhật giỏ hàng: ${error.message}`);
  },
});

const debouncedUpdateCart = (cartItemId, quantity) => {
  updateCartMutation.mutate({ cartItemId, quantity });
};

const handleAddToCart = async (productId) => {
  const selectedProduct = products.value.find((p) => p._id === productId);
  if (!selectedProduct) {
    alert("Sản phẩm không tồn tại!");
    return;
  }
  if (1 > selectedProduct.p_stock_quantity) {
    alert(`Sản phẩm đã hết hàng!`);
    return;
  }
  try {
    const cartResponse = await cartService.getCart();
    const cartItems = cartResponse.data.items || [];
    const existingItem = cartItems.find((item) => item.p_id?._id === productId);

    if (existingItem) {
      const newQuantity = existingItem.cart_item_quantity + 1;
      if (newQuantity > selectedProduct.p_stock_quantity) {
        alert(
          `Tổng số lượng không vượt quá số lượng tồn kho (${selectedProduct.p_stock_quantity})!`
        );
        return;
      }
      debouncedUpdateCart(existingItem._id, newQuantity);
    } else {
      addToCartMutation.mutate({ productId, quantity: 1 });
    }
  } catch (error) {
    alert(`Lỗi khi kiểm tra giỏ hàng: ${error.message}`);
  }
};

const handleCheckout = (productId) => {
  const selectedProduct = products.value.find((p) => p._id === productId);
  if (!selectedProduct) {
    alert("Sản phẩm không tồn tại!");
    return;
  }

  if (1 > selectedProduct.p_stock_quantity) {
    alert(`Sản phẩm đã hết hàng!`);
    return;
  }

  const orderProduct = {
    p_id: selectedProduct._id,
    name: selectedProduct.p_name,
    image: getProductUrl(selectedProduct),
    quantity: 1,
    price: selectedProduct.p_price,
  };

  console.log("Order product to send:", orderProduct);

  localStorage.setItem("orderProducts", JSON.stringify([orderProduct]));

  router.push({ name: "order" });
};

const fetchProductsByCategory = useMutation({
  mutationFn: async (cateName) => {
    return await productService.getProductByCategory(cateName.value);
  },
  onSuccess: (res) => {
    products.value = Array.isArray(res.data.products) ? res.data.products : [];
    console.log("Category từ API:", res.data.category);
    console.log("Cha của category:", res.data.category?.parent_category_id);
    console.log(
      "Cha của cha:",
      res.data.category?.parent_category_id?.parent_category_id
    );

    category.value = res.data.category || null;

    const allBrands = products.value
      .map((p) => p.p_brand?.br_name)
      .filter((b) => typeof b === "string" && b.trim() !== "");

    brands.value = [...new Set(allBrands)];
    console.log("Category:", category.value);

    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Error fetching products by category:", error);
    category.value = null;
  },
});

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const filteredBrands = computed(() => {
  return brands.value
    .filter((brand) => typeof brand === "string")
    .filter((brand) =>
      brand.toLowerCase().includes(brandSearch.value.toLowerCase())
    );
});

const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const matchesBrand =
      selectedBrands.value.length === 0 ||
      selectedBrands.value.includes(product.p_brand?.br_name) ||
      selectedBrands.value.some((brand) =>
        product.p_name.toLowerCase().includes(brand.toLowerCase())
      );
    const matchesPrice = product.p_price <= maxPrice.value;
    return matchesBrand && matchesPrice;
  });
});

const resetFilters = () => {
  selectedBrands.value = [];
  maxPrice.value = 100000000;
  brandSearch.value = "";
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
  }).format(price);
};

const breadcrumbCategories = computed(() => {
  return category.value ? getBreadcrumbCategories(category.value) : [];
});

watch(
  () => route.params.cate_name,
  (newName) => {
    cateName.value = newName;
    fetchProductsByCategory.mutate(cateName);
  }
);

onMounted(() => {
  fetchProductsByCategory.mutate(cateName);
});
</script>

<template>
  <div class="page-wrapper">
    <header>
      <AppHeader />
    </header>
    <main class="main-content">
      <div class="categoriespage">
        <div class="container-fluid categories-container">
          <div class="category">
            <router-link to="/" class="fas fa-home"></router-link>
            <span class="fas fa-chevron-right"></span>
            <template v-for="(cat, index) in breadcrumbCategories" :key="index">
              <router-link
                :to="`/categories/${cat.cate_name
                  .replace(/\s+/g, '-')
                  .toLowerCase()}`"
                class="breadcrumb-link"
              >
                {{ cat.cate_name }}
              </router-link>
              <span
                v-if="index < breadcrumbCategories.length - 1"
                class="fas fa-chevron-right"
              ></span>
            </template>
          </div>
          <div class="row">
            <div class="col-md-3 filter-section">
              <div class="row">
                <div class="col-lg-12 col-md-12 col-sm-6 filter-group">
                  <h4>Thương Hiệu</h4>
                  <input
                    type="text"
                    class="form-control mb-2"
                    v-model="brandSearch"
                    placeholder="Tìm kiếm thương hiệu..."
                  />
                  <button class="btn btn-sm mb-3" @click="resetFilters">
                    Xóa bộ lọc
                  </button>
                  <div class="brand-list">
                    <div
                      v-for="brand in filteredBrands"
                      :key="brand"
                      class="form-check"
                    >
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :id="'brand-' + brand"
                        :value="brand"
                        v-model="selectedBrands"
                      />
                      <label class="form-check-label" :for="'brand-' + brand">{{
                        brand
                      }}</label>
                    </div>
                  </div>
                </div>
                <div class="col-lg-12 col-md-12 col-sm-6 filter-group">
                  <h4>Khoảng Giá (VNĐ)</h4>
                  <div class="price-range">
                    <input
                      type="range"
                      class="form-range"
                      min="0"
                      max="100000000"
                      step="100000"
                      v-model.number="maxPrice"
                    />
                    <div class="price-display">
                      0 - {{ formatPrice(maxPrice) }} đ
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-9 product-grid">
              <div class="row">
                <div
                  v-for="product in filteredProducts"
                  :key="product._id"
                  class="col-lg-3 col-md-4 col-sm-6 mb-4"
                >
                  <div class="product-card">
                    <div class="img-container">
                      <router-link :to="`/product/${product._id}`">
                        <img
                          :src="getProductUrl(product)"
                          :alt="product.p_name"
                          class="product-image"
                          @click="
                            handleProductClick({
                              image: getProductUrl(product),
                              name: product.p_name,
                              brand: product.p_brand || 'Unknown',
                              category: product.p_category,
                              price: product.p_price || 0,
                            })
                          "
                        />
                      </router-link>
                    </div>
                    <div class="product-info">
                      <h5>{{ product.p_name }}</h5>
                      <p class="price">{{ formatPrice(product.p_price) }} đ</p>
                      <div class="button-group">
                        <button
                          class="btn btn-sm"
                          @click="handleAddToCart(product._id)"
                        >
                          <i class="fas fa-cart-plus"></i>
                        </button>
                        <button
                          class="btn btn-sm"
                          @click="handleCheckout(product._id)"
                        >
                          Mua ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <footer>
      <AppFooter />
    </footer>
  </div>
</template>
<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1 0 auto;
}

.categoriespage {
  overflow-x: hidden;
}

.categories-container {
  max-width: 1200px;
  margin: 100px auto 0;
  background-color: white;
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

.filter-section {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  height: 500px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group h4 {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.brand-list {
  max-height: 200px;
  overflow-y: auto;
}

.form-check {
  margin: 8px;
  display: flex;
  align-items: center;
}

.form-check-input {
  margin-right: 8px;
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #6399a9;
  border-color: #6399a9;
}

.form-check-label {
  cursor: pointer;
}

.price-range {
  padding: 10px 0;
}

.price-display {
  margin-top: 10px;
  font-weight: bold;
}

.product-card {
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.img-container {
  background-color: #f6f9fc;
  border-radius: 8px;
  padding: 10px;
  height: 100%;
  margin-bottom: 20px;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 150px;
  object-fit: contain;
  margin-bottom: 10px;
  transition: transform 0.3s ease;
}

.product-image:hover {
  transform: scale(1.1);
}

.product-info h5 {
  font-size: 1rem;
  margin-bottom: 5px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price {
  font-weight: bold;
  margin-bottom: 10px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn {
  padding: 5px 10px;
  font-size: 0.875rem;
  background-color: #6399a9;
  color: white;
}

.btn:hover {
  background-color: #507b88;
}

footer {
  flex-shrink: 0;
  width: 100%;
  background-color: #f8f9fa;
}

@media (max-width: 768px) {
  .filter-section {
    margin-bottom: 20px;
  }

  .product-card {
    margin-bottom: 20px;
  }
}
</style>
