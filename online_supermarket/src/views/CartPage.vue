<script setup>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import { ref, computed, onMounted } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import productService from "../services/product";
import cartService from "../services/cart";
import recommendationService from "../services/recommendation";
import { debounce } from "lodash";

const router = useRouter();
const queryClient = useQueryClient();
const cartProducts = ref([]);
const allProducts = ref([]);
const recommendedProducts = ref([]);
const isLoadingRecommended = ref(false);
const recommendedError = ref(null);
const selectAll = ref(false);
const isLoading = ref(false);
const error = ref(null);

const token = localStorage.getItem("token");

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  try {
    if (
      product &&
      Array.isArray(product.p_images) &&
      product.p_images.length > 0 &&
      typeof product.p_images[0] === "string" &&
      product.p_images[0]
    ) {
      const url = encodeURI(`${baseUrl}${product.p_images[0]}`);
      console.log("Generated Product URL:", url);
      return url;
    }
    console.log("Using default image for product:", product);
    return "/assets/default-product.png";
  } catch (err) {
    console.error("Error generating product URL:", err, product);
    return "/assets/default-product.png";
  }
};

const getCartMutation = useMutation({
  mutationFn: async () => {
    isLoading.value = true;
    const res = await cartService.getCartByUserId();
    console.log("Raw API response:", res);
    return res.data;
  },
  onSuccess: (data) => {
    isLoading.value = false;
    console.log("Raw data from API:", data);
    if (!data || !data.items || !Array.isArray(data.items)) {
      console.error("Invalid data structure:", data);
      cartProducts.value = [];
      error.value = new Error("Cấu trúc dữ liệu không hợp lệ");
      return;
    }
    console.log("Items in data:", data.items);
    cartProducts.value = data.items.map((item, index) => {
      console.log(`Mapping item ${index}:`, item);
      return {
        _id: item._id || `temp-id-${index}`,
        p_id: item.p_id?._id || null,
        name: item.p_id?.p_name || "Unknown Product",
        image: getProductUrl(item.p_id),
        quantity: item.cart_item_quantity || 1,
        price: item.p_id?.p_price ?? 0,
        stock: item.p_id?.p_stock_quantity ?? 0,
        selected: false,
      };
    });
    console.log("Cart products after mapping:", cartProducts.value);
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    isLoading.value = false;
    error.value = error;
    console.error("Cart fetch error:", error);
    cartProducts.value = [];
    alert("Lỗi khi lấy giỏ hàng: " + error.message);
  },
});

const getProductMutation = useMutation({
  mutationFn: async () => {
    const res = await productService.getAllProduct();
    return res;
  },
  onSuccess: (data) => {
    allProducts.value = data.data.products || [];
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
  onError: (error) => {
    console.error("Error fetching products:", error);
    allProducts.value = [];
  },
});

const randomSuggestedProducts = computed(() => {
  if (!allProducts.value || allProducts.value.length === 0) {
    return [];
  }
  const shuffled = [...allProducts.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10).map((product) => ({
    _id: product._id,
    name: product.p_name || "Unknown Product",
    images: product.p_images || [],
    price: product.p_price ?? 0,
    p_stock_quantity: product.p_stock_quantity ?? 0,
  }));
});

const getRecommendedProductsMutation = useMutation({
  mutationFn: async () => {
    isLoadingRecommended.value = true;
    const recommendation = await recommendationService.getRecommendedProducts();
    return recommendation;
  },
  onSuccess: (data) => {
    isLoadingRecommended.value = false;
    if (
      data?.success &&
      Array.isArray(data.products) &&
      data.products.length > 0
    ) {
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

const getRecommendProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.images && product.images.length > 0
      ? encodeURI(`${baseUrl}${product.images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const totalPrice = computed(() => {
  return cartProducts.value
    .filter((product) => product.selected)
    .reduce(
      (total, product) =>
        total + (Number(product.price) || 0) * (product.quantity || 1),
      0
    );
});

function formatPrice(price) {
  if (price == null || isNaN(price)) {
    return "0";
  }
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const updateCartMutation = useMutation({
  mutationFn: async ({ cartItemId, quantity }) => {
    return await cartService.updateCartItem(cartItemId, quantity);
  },
  onMutate: async ({ cartItemId, quantity }) => {
    const previousProducts = [...cartProducts.value];
    const index = cartProducts.value.findIndex((p) => p._id === cartItemId);
    if (index !== -1) {
      cartProducts.value[index].quantity = quantity;
    }
    return { previousProducts };
  },
  onSuccess: () => {
    console.log("Cart item updated successfully");
  },
  onError: (error, context) => {
    console.error("Update cart item error:", error);
    cartProducts.value = context.previousProducts;
    alert(`Số lượng không vượt quá số lượng tồn kho!`);
  },
});

const debouncedUpdateCart = debounce((cartItemId, quantity) => {
  updateCartMutation.mutate({ cartItemId, quantity });
}, 500);

function increaseQuantity(index) {
  if (cartProducts.value[index].quantity < cartProducts.value[index].stock) {
    const newQuantity = cartProducts.value[index].quantity + 1;
    cartProducts.value[index].quantity = newQuantity;
    debouncedUpdateCart(cartProducts.value[index]._id, newQuantity);
    updateTotal();
  } else {
    alert(`Số lượng không vượt quá số lượng tồn kho!`);
  }
}

function decreaseQuantity(index) {
  if (cartProducts.value[index].quantity > 1) {
    const newQuantity = cartProducts.value[index].quantity - 1;
    cartProducts.value[index].quantity = newQuantity;
    debouncedUpdateCart(cartProducts.value[index]._id, newQuantity);
    updateTotal();
  }
}

function restrictQuantity(event, index) {
  let value = parseInt(event.target.value);
  if (isNaN(value) || value < 1) {
    value = 1;
  } else if (value > cartProducts.value[index].stock) {
    value = cartProducts.value[index].stock;
  }
  cartProducts.value[index].quantity = value;
  debouncedUpdateCart(cartProducts.value[index]._id, value);
  updateTotal();
}

function onlyNumber(event) {
  const charCode = event.which ? event.which : event.keyCode;
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

const removeCartMutation = useMutation({
  mutationFn: async (cartItemId) => {
    return await cartService.removeCartItem(cartItemId);
  },
  onSuccess: () => {
    console.log("Cart item removed successfully");
    getCartMutation.mutate();
  },
  onError: (error) => {
    console.error("Remove cart item error:", error);
    alert(`Lỗi khi xóa sản phẩm: ${error.message}`);
  },
});

const checkoutMutation = useMutation({
  mutationFn: async (cartItemIds) => {
    await Promise.all(cartItemIds.map((id) => cartService.removeCartItem(id)));
  },
  onSuccess: () => {
    console.log("Selected products removed from cart");
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    selectAll.value = false;
  },
  onError: (error) => {
    console.error("Checkout error:", error);
    alert(`Lỗi khi xóa sản phẩm khỏi giỏ hàng: ${error.message}`);
  },
});

function deleteProduct(index) {
  const cartItemId = cartProducts.value[index]._id;
  removeCartMutation.mutate(cartItemId);
  updateTotal();
}

function toggleSelectAll() {
  cartProducts.value.forEach((product) => {
    product.selected = selectAll.value;
  });
  updateTotal();
}

function updateTotal() {
  if (!cartProducts.value.some((product) => product.selected)) {
    selectAll.value = false;
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

function checkout() {
  if (totalPrice.value === 0) {
    alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
    return;
  }

  const selectedProducts = cartProducts.value.filter(
    (product) => product.selected
  );
  if (!selectedProducts.length) {
    alert("Vui lòng chọn ít nhất một sản phẩm!");
    return;
  }

  const orderProducts = selectedProducts.map((product) => ({
    p_id: product.p_id,
    name: product.name,
    image: product.image,
    quantity: product.quantity,
    price: product.price,
  }));

  localStorage.setItem("orderProducts", JSON.stringify(orderProducts));
  const selectedCartItemIds = selectedProducts.map((product) => product._id);
  router.push({ name: "order" });
  checkoutMutation.mutate(selectedCartItemIds);
}

const handleAddToCart = async (productId) => {
  try {
    await cartService.addToCart(productId, 1);
    console.log(`Added product ${productId} to cart`);
    getCartMutation.mutate();
  } catch (error) {
    console.error("Error adding to cart:", error);
    alert("Lỗi khi thêm sản phẩm vào giỏ hàng!");
  }
};

onMounted(async () => {
  console.log("Token:", token); // Thêm log để kiểm tra token
  if (!token) {
    alert("Vui lòng đăng nhập để xem giỏ hàng");
    router.push({ name: "login" });
    return;
  }
  try {
    await getProductMutation.mutateAsync();
    await getCartMutation.mutateAsync();

    await getRecommendedProductsMutation.mutateAsync();
  } catch (err) {
    console.error("Error in onMounted:", err);
  }
});
</script>
<template>
  <div class="wrapper">
    <header>
      <AppHeader />
    </header>
    <div class="cartpage">
      <div class="container-fluid cart-container">
        <div class="detail-container">
          <p class="cart-title">Giỏ hàng của bạn</p>
        </div>
        <div class="row">
          <div class="col-lg-9 col-md-12 cart-list-wrapper">
            <div class="container text-center cart-list">
              <div v-if="isLoading">Đang tải giỏ hàng...</div>
              <div v-else-if="error">Lỗi: {{ error.message }}</div>
              <div
                v-else-if="cartProducts.length === 0"
                class="empty-cart-message"
              >
                <p>Không có sản phẩm trong giỏ hàng</p>
              </div>
              <div v-else class="row">
                <div class="col list-product">
                  <div class="row">
                    <div class="row header-row text-center">
                      <div class="col col-1 ms-3">
                        <input
                          type="checkbox"
                          v-model="selectAll"
                          @change="toggleSelectAll"
                        />
                        Chọn tất cả
                      </div>
                      <div class="col col-5">Sản phẩm</div>
                      <div class="col col-2">Số lượng</div>
                      <div class="col col-2">Đơn giá</div>
                      <div class="col col-1">Thao tác</div>
                    </div>
                    <div
                      class="row product-row"
                      v-for="(product, index) in cartProducts"
                      :key="index"
                    >
                      <div class="col col-1 ms-3">
                        <input
                          type="checkbox"
                          v-model="product.selected"
                          @change="updateTotal"
                        />
                      </div>
                      <div class="col col-5 product-col">
                        <img
                          :src="product.image"
                          alt="Product Image"
                          class="product-image"
                          loading="lazy"
                        />
                        <span class="product-name">{{ product.name }}</span>
                      </div>
                      <div class="col col-2">
                        <div class="quantity-control">
                          <button
                            class="quantity-btn decrease"
                            @click="decreaseQuantity(index)"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            class="quantity-input"
                            v-model.number="product.quantity"
                            @input="restrictQuantity($event, index)"
                            @keypress="onlyNumber($event)"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max="200"
                          />
                          <button
                            class="quantity-btn increase"
                            @click="increaseQuantity(index)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div class="col col-2">
                        {{ formatPrice(product.price) }} đ
                      </div>
                      <div class="col col-1">
                        <button
                          class="delete-btn"
                          @click="deleteProduct(index)"
                        >
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-3 col-md-12 total-wrapper">
            <div class="total-section">
              <p class="total-title">
                Tổng tiền: {{ formatPrice(totalPrice) }} đ
              </p>
              <button
                class="checkout-btn"
                @click="checkout"
                :disabled="totalPrice === 0"
              >
                Thanh toán
              </button>
            </div>
          </div>
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
              <div v-else-if="!recommendedProducts.length" class="col-auto">
                <p>Không có sản phẩm gợi ý</p>
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
                >
                  <img
                    :src="getRecommendProductUrl(product)"
                    :alt="product.name || product.p_name || 'Product'"
                  />
                </router-link>
                <div class="product-name">
                  <p>
                    {{ product.name || product.p_name || "Unknown Product" }}
                  </p>
                </div>
                <div class="row price-cart">
                  <div class="price">
                    {{ formatPrice(product.price || product.p_price || 0) }}đ
                  </div>
                  <button
                    class="cart-btn"
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
    <footer>
      <AppFooter />
    </footer>
  </div>
</template>
<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.cartpage {
  overflow-x: hidden;
  flex: 1 0 auto;
}

.cart-container {
  margin: 90px auto 0;
  max-width: 1450px;
}

.cart-list-wrapper {
  padding: 0;
}

.cart-list {
  white-space: nowrap;
}

.cart-list:not(.empty) {
  overflow-x: auto;
}

.empty-cart-message {
  text-align: center;
  padding: 40px;
  font-size: 24px;
  color: #666;
  font-family: "Roboto", sans-serif;
}

.list-product {
  border-radius: 5px;
  padding: 10px;
  white-space: nowrap;
  min-width: 1200px;
  display: inline-block;
}

.header-row,
.product-row {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
}

.header-row {
  font-weight: bold;
  font-size: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #ddd;
}

.product-row {
  padding: 15px 0;
  border-bottom: 1px solid #ddd;
  align-items: center;
}

.product-row:last-child {
  border-bottom: none;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 5px;
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
  width: 50px;
  height: 30px;
  text-align: center;
  font-size: 16px;
  font-family: "Roboto", sans-serif;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.delete-btn {
  color: black;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background-color: #d9363e;
  color: white;
}

.delete-btn i {
  font-size: 16px;
}

.product-col {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 300px;
  max-width: 500px;
}

.product-image {
  width: 80px;
  height: 50px;
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

.col:first-child {
  text-align: left;
}

.col:nth-child(3),
.col:nth-child(4),
.col:nth-child(5) {
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.total-section {
  padding: 20px;
  border-radius: 5px;
  background-color: #f0f0f0;
  width: 100%;
  max-width: 700px;
}

.total-title {
  text-align: left;
  font-size: 20px;
  font-weight: bold;
  font-family: "Roboto", sans-serif;
}

.checkout-btn {
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 10px;
  font-size: 20px;
}

.checkout-btn:hover {
  background-color: #507b88;
}

.checkout-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.detail-container {
  margin: 70px auto 0;
  max-width: 1200px;
}

.suggest-title,
.cart-title {
  font-size: 24px;
  font-weight: bold;
  font-family: "Roboto", sans-serif;
}

.cart-btn {
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  margin: 0 5px;
  width: 25%;
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
  width: 60%;
  text-align: left;
}

.price-cart {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
}

.add-cart-btn {
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  margin: 0 5px;
  width: 25%;
}

@media (max-width: 1268px) {
  .scroll-btn.left {
    left: 0px;
  }

  .scroll-btn.right {
    right: 0px;
  }
}

@media (max-width: 1168px) {
  .scroll-btn.left {
    left: 0px;
  }

  .scroll-btn.right {
    right: 0px;
  }
}

@media (max-width: 992px) {
  .total-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}
</style>
