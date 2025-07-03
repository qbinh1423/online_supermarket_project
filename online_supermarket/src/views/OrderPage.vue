<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import orderService from "../services/order";
import voucherService from "../services/voucher";
import userService from "../services/user";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const router = useRouter();

const products = ref([]);
const fullName = ref("");
const userId = ref(null);
const phoneNumber = ref("");
const address = ref("");
const paymentMethod = ref("COD");
const note = ref("");
const phoneError = ref("");
const discountCode = ref("");
const discountAmount = ref(0);
const showDiscountPopup = ref(false);
const vouchers = ref([]);
const error = ref(null);

const shippingFee = 40000;
const maxQuantity = 200;

async function placeOrder() {
  if (!fullName.value || !phoneNumber.value || !address.value) {
    alert("Vui lòng điền đầy đủ thông tin họ tên, số điện thoại và địa chỉ!");
    return;
  }
  if (phoneError.value) {
    alert("Số điện thoại không hợp lệ!");
    return;
  }
  if (!products.value.length) {
    alert("Vui lòng chọn ít nhất một sản phẩm!");
    return;
  }

  try {
    const orderData = {
      c_id: userId.value,
      o_name: fullName.value,
      o_phone: phoneNumber.value,
      o_shipping_address: address.value,
      v_name: discountCode.value || "",
      o_payment_method: paymentMethod.value,
    };

    const orderResponse = await orderService.createOrder(orderData);
    const orderId = orderResponse.data._id;
    console.log("Order ID:", orderId); // Debug

    for (const product of products.value) {
      if (!product.p_id || !product.quantity) {
        console.error("Invalid product data:", product);
        throw new Error("Sản phẩm không hợp lệ: Thiếu p_id hoặc quantity!");
      }
      const orderItemData = {
        order_id: orderId,
        p_id: product.p_id,
        order_detail_quantity: product.quantity,
      };
      console.log("Order Item Data:", orderItemData); // Debug
      const orderItemResponse = await orderService.addOrderItem(orderItemData);
      console.log("Order Item Response:", orderItemResponse);
    }
    localStorage.removeItem("orderProducts");
    alert(
      `Đơn hàng đã được đặt thành công! Tổng tiền: ${formatPrice(
        totalPrice.value
      )} đ`
    );
    router.push({ name: "shop" });
  } catch (error) {
    console.error("Place order error:", error);
    alert(`Lỗi khi đặt hàng: ${error.message}`);
  }
}

function applyDiscount(voucher) {
  discountCode.value = voucher.v_name;
  discountAmount.value = voucher.v_price;
  showDiscountPopup.value = false;
}

function increaseQuantity(index) {
  if (products.value[index].quantity < maxQuantity) {
    products.value[index].quantity++;
  }
}

function decreaseQuantity(index) {
  if (products.value[index].quantity > 1) {
    products.value[index].quantity--;
  }
}

function handleQuantityInput(event, index) {
  let value = parseInt(event.target.value);
  if (isNaN(value) || value < 1) {
    products.value[index].quantity = 1;
    alert("Số lượng sản phẩm tối thiểu là 1");
  } else if (value > maxQuantity) {
    products.value[index].quantity = maxQuantity;
    alert("Số lượng sản phẩm tối đa là 200");
  } else {
    products.value[index].quantity = value;
  }
}

function onlyNumber(event) {
  const charCode = event.which ? event.which : event.keyCode;
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

function deleteProduct(index) {
  products.value.splice(index, 1);
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function validatePhoneNumber() {
  const phonePattern = /^0\d{9}$/;
  if (!phonePattern.test(phoneNumber.value)) {
    phoneError.value = "Số điện thoại không hợp lệ";
  } else {
    phoneError.value = "";
  }
}

const subtotal = computed(() => {
  return products.value.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );
});

const totalPrice = computed(() => {
  return subtotal.value + shippingFee - discountAmount.value;
});

onMounted(async () => {
  try {
    const response = await userService.getUserProfile();
    if (!response || !response._id) {
      console.warn("User profile not found or invalid response:", response);
      userId.value = null;
    } else {
      userId.value = response._id;
      console.log("User ID loaded:", userId.value);
    }
  } catch (error) {
    console.error("Failed to fetch user profile:", error.message);
    userId.value = null;
  }
  const storedProducts = localStorage.getItem("orderProducts");
  if (storedProducts) {
    const parsedProducts = JSON.parse(storedProducts);
    if (Array.isArray(parsedProducts)) {
      products.value = parsedProducts.filter(
        (p) => p.p_id && p.quantity && p.quantity > 0
      ); // Lọc sản phẩm hợp lệ
      console.log("Order products loaded:", products.value);
    } else {
      products.value = [];
      console.warn("Invalid order products in localStorage:", parsedProducts);
      error.value = "Dữ liệu sản phẩm không hợp lệ";
    }
  } else {
    products.value = [];
    console.warn("No order products found in localStorage");
    error.value = "Không có sản phẩm nào được chọn để thanh toán";
  }
  try {
    const response = await voucherService.getAllVouchers();
    const currentDate = new Date();
    console.log("Voucher response:", response);
    if (Array.isArray(response)) {
      vouchers.value = response.filter((voucher) => {
        const expiryDate = new Date(voucher.v_expiry_date);
        const isValid = expiryDate > currentDate;
        console.log(
          `Voucher ${voucher.v_name}: expiry=${voucher.v_expiry_date}, valid=${isValid}`
        );
        return isValid;
      });
    } else {
      vouchers.value = [];
      console.warn("No valid voucher data returned:", response);
    }
    console.log("Valid vouchers:", vouchers.value);
  } catch (err) {
    error.value = err.message;
    vouchers.value = [];
    console.error("Error fetching vouchers:", err);
  }
});
</script>
<template>
  <div class="wrapper">
    <header>
      <AppHeader />
    </header>
    <div class="order-page">
      <div class="container-fluid order-container">
        <div class="row">
          <div class="col-lg-7 col-md-7 col-auto">
            <h2 class="section-title">Thông tin nhận hàng</h2>
            <div class="shipping-info">
              <div class="form-group mb-3">
                <label for="fullName" class="form-label title">Họ tên</label>
                <input
                  type="text"
                  class="form-control"
                  id="fullName"
                  v-model="fullName"
                  placeholder="Nhập họ tên"
                />
              </div>
              <div class="form-group mb-3">
                <label for="phoneNumber" class="form-label title"
                  >Số điện thoại</label
                >
                <input
                  type="text"
                  class="form-control"
                  id="phoneNumber"
                  v-model="phoneNumber"
                  placeholder="Nhập số điện thoại"
                  @input="validatePhoneNumber"
                  @keypress="onlyNumber"
                  maxlength="10"
                  pattern="[0-9]*"
                  inputmode="numeric"
                />
                <small v-if="phoneError" class="text-danger">{{
                  phoneError
                }}</small>
              </div>
              <div class="form-group mb-3">
                <label for="address" class="form-label title">Địa chỉ</label>
                <input
                  type="text"
                  class="form-control"
                  id="address"
                  v-model="address"
                  placeholder="Nhập địa chỉ"
                />
              </div>
              <div class="form-group mb-3">
                <label class="form-label title">Hình thức thanh toán</label>
                <div>
                  <div class="form-check">
                    <input
                      type="radio"
                      class="form-check-input"
                      id="cod"
                      value="COD"
                      v-model="paymentMethod"
                    />
                    <label class="form-check-label" for="cod"
                      >Thanh toán trực tiếp (COD)</label
                    >
                  </div>
                  <div class="form-check">
                    <input
                      type="radio"
                      class="form-check-input"
                      id="banking"
                      value="Banking"
                      v-model="paymentMethod"
                    />
                    <label class="form-check-label" for="banking"
                      >Thanh toán online (Banking)</label
                    >
                  </div>
                </div>
              </div>
              <div class="form-group mb-3">
                <label for="note" class="form-label title">Ghi chú</label>
                <textarea
                  class="form-control"
                  id="note"
                  v-model="note"
                  rows="3"
                  placeholder="Nhập ghi chú nếu có"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="col-lg-5 col-md-5 col-auto">
            <h2 class="section-title">Danh sách sản phẩm</h2>
            <div class="product-list">
              <div v-if="!products.length" class="empty-products-message">
                Không có sản phẩm nào để thanh toán
              </div>
              <div
                class="product-item"
                v-for="(product, index) in products"
                :key="product.p_id"
              >
                <img
                  :src="product.image"
                  alt="Product Image"
                  class="product-image"
                />
                <div class="product-details">
                  <p class="product-name">{{ product.name }}</p>
                  <p class="product-price">
                    {{ formatPrice(product.price) }} đ
                  </p>
                </div>
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
                    @input="handleQuantityInput($event, index)"
                    @keypress="onlyNumber($event)"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    class="quantity-btn increase"
                    @click="increaseQuantity(index)"
                  >
                    +
                  </button>
                </div>
                <button class="delete-btn" @click="deleteProduct(index)">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <div class="order-summary">
              <div class="summary-item">
                <span>Tiền hàng:</span>
                <span>{{ formatPrice(subtotal) }} đ</span>
              </div>
              <div class="summary-item">
                <span>Phí vận chuyển:</span>
                <span>{{ formatPrice(shippingFee) }} đ</span>
              </div>
              <div class="summary-item discount-section">
                <span>Mã khuyến mãi:</span>
                <div class="discount-input">
                  <input
                    type="text"
                    class="form-control discount-code-input"
                    v-model="discountCode"
                    placeholder="Thêm mã khuyến mãi"
                    readonly
                  />
                  <button
                    class="select-discount-btn fas fa-plus"
                    @click="showDiscountPopup = true"
                  ></button>
                </div>
              </div>
              <div class="summary-item total">
                <span>Tổng tiền:</span>
                <span>{{ formatPrice(totalPrice) }} đ</span>
              </div>
              <div class="text-center mt-3">
                <button class="order-btn" @click="placeOrder">Đặt hàng</button>
              </div>
            </div>
            <div class="discount-popup" v-if="showDiscountPopup">
              <div class="popup-content">
                <h3>Chọn mã khuyến mãi</h3>
                <div v-if="error" class="text-danger">{{ error }}</div>
                <div v-if="!vouchers.length">Không có voucher hợp lệ</div>
                <div
                  class="discount-option"
                  v-for="voucher in vouchers"
                  :key="voucher.v_name"
                  @click="applyDiscount(voucher)"
                >
                  <span>{{ voucher.v_description }}</span>
                  <span>(Mã: {{ voucher.v_name }})</span>
                </div>
                <button class="close-popup" @click="showDiscountPopup = false">
                  Đóng
                </button>
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

.order-page {
  overflow-x: hidden;
  flex: 1 0 auto;
}

.order-container {
  margin: 70px auto 0;
  max-width: 1450px;
  padding: 20px;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  font-family: "Roboto", sans-serif;
  margin-bottom: 20px;
}

.title {
  font-weight: bold;
  font-family: "Roboto", sans-serif;
}

.shipping-info {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 5px;
}

.form-control {
  width: 100% !important;
  max-width: 100%;
}

.text-danger {
  color: #d9363e;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.product-list {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.empty-products-message {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #666;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #ddd;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 80px;
  height: 50px;
  object-fit: contain;
  margin-right: 15px;
}

.product-details {
  flex: 1;
}

.product-name {
  font-size: 14px;
  margin: 0;
  word-wrap: break-word;
  overflow: hidden;
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-overflow: ellipsis;
}

.product-price {
  font-size: 14px;
  color: #333;
  margin: 0;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: 15px;
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

.order-summary {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 16px;
}

.summary-item.total {
  font-weight: bold;
  font-size: 18px;
  color: #d9363e;
}

.discount-section {
  align-items: center;
}

.discount-input {
  display: flex;
  gap: 10px;
  width: 60%;
}

.discount-code-input {
  pointer-events: none;
  background-color: #fff;
  cursor: default;
  font-size: 14px;
}

.select-discount-btn {
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.select-discount-btn:hover {
  background-color: #507b88;
}

.order-btn {
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 5px;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width: 100%;
  max-width: 200px;
}

.order-btn:hover {
  background-color: #507b88;
}

.discount-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.discount-option {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.discount-option:hover {
  background-color: #f5f5f5;
}

.close-popup {
  background-color: #d9363e;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 5px 15px;
  cursor: pointer;
  margin-top: 10px;
}

.close-popup:hover {
  background-color: #b82c32;
}

@media (max-width: 991px) {
  .product-image {
    width: 60px;
    height: 40px;
  }

  .product-name {
    font-size: 12px;
  }

  .product-price {
    font-size: 12px;
  }

  .quantity-btn {
    width: 25px;
    height: 25px;
    font-size: 16px;
  }

  .quantity-input {
    width: 40px;
    height: 25px;
    font-size: 14px;
  }

  .delete-btn {
    padding: 3px 8px;
  }

  .delete-btn i {
    font-size: 14px;
  }

  .summary-item {
    font-size: 14px;
  }

  .summary-item.total {
    font-size: 16px;
  }
}

@media (max-width: 767px) {
  .shipping-info {
    padding: 15px;
  }

  .product-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #ddd;
  }

  .product-image {
    width: 50px;
    height: 30px;
    margin-right: 10px;
  }

  .product-details {
    flex: 1;
    min-width: 0;
    margin-right: 10px;
  }

  .quantity-control {
    margin-right: 10px;
  }

  .delete-btn {
    padding: 3px 6px;
  }

  .discount-input {
    display: flex;
    align-items: center;
    width: 50%;
  }

  .discount-code-input {
    font-size: 12px;
  }
}
</style>
