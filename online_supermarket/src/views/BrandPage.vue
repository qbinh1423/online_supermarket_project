<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import productService from "../services/product";
import cartService from "../services/cart";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const products = ref([]);
const route = useRoute();
const router = useRouter();
const brand = ref(null);
const queryClient = useQueryClient();
const brandName = ref(route.params.br_name);

const selectedBrands = ref([]);
const maxPrice = ref(100000000);

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

const fetchProductByBrand = useMutation({
  mutationFn: async () => {
    return await productService.getProductByBrand(brandName.value);
  },
  onSuccess: (res) => {
    console.log("Full response:", JSON.stringify(res, null, 2));
    const data = res.data.data || res.data;
    products.value = Array.isArray(data.products) ? data.products : [];
    brand.value = data.brand || null;
    console.log("Products by brand:", products.value);
    console.log("Brand:", brand.value);
    console.log("Filtered products:", filteredProducts.value);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Lỗi khi fetch sản phẩm:", error.message);
    products.value = [];
    brand.value = null;
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

const getBrandUrl = (brand) => {
  const baseUrl = "http://localhost:5000";
  const url = brand.br_image
    ? `${baseUrl}${brand.br_image}`
    : "/assets/default-brand.png";
  return url;
};

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

const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

onMounted(() => {
  fetchProductByBrand.mutate(brandName.value);
  console.log("Route params:", route.params);
});
</script>

<template>
  <div class="page-wrapper">
    <header>
      <AppHeader />
    </header>
    <main class="main-content">
      <div class="brandspage">
        <div class="container-fluid brands-container">
          <div class="brand">
            <router-link to="/" class="fas fa-home"></router-link>
            <span class="fas fa-chevron-right"></span>
            <span>{{ brand?.br_name || "Thương hiệu" }}</span>
          </div>
          <div class="row">
            <div class="col-md-3 filter-section">
              <div class="row">
                <div class="col-lg-12 col-md-12 col-sm-6 filter-group">
                  <img
                    :src="getBrandUrl(brand)"
                    alt="Brand Logo"
                    class="img-fluid"
                  />
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
                      0 - {{ formatPrice(maxPrice) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-9 product-grid">
              <div v-if="filteredProducts.length > 0" class="row">
                <div
                  v-for="product in filteredProducts"
                  :key="product._id"
                  class="col-lg-3 col-md-4 col-sm-6 mb-4"
                >
                  <div class="product-card">
                    <div class="img-container">
                      <router-link :to="'/product/' + product._id">
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
                      <p class="price">{{ formatPrice(product.p_price) }}</p>
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

.brandspage {
  overflow-x: hidden;
}

.brands-container {
  max-width: 1200px;
  margin: 100px auto 0;
  background-color: white;
}

.brand {
  padding: 20px;
}

.brand a,
.brand span {
  margin-right: 10px;
}

.brand a:last-child,
.brand span:last-child {
  margin-right: 0;
}

.brand a {
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

@media (max-width: 768px) {
  .filter-section {
    margin-bottom: 20px;
  }

  .product-card {
    margin-bottom: 20px;
  }
}
</style>
