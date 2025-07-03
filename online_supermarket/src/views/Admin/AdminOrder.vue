<script setup>
import { ref, computed, onMounted } from "vue";
import orderService from "../../services/order";

const statusMap = {
  pending: "Chờ xác nhận",
  processing: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  canceled: "Đã hủy",
};

const reverseStatusMap = {
  "Chờ xác nhận": "pending",
  "Đã xác nhận": "processing",
  "Đang giao": "shipped",
  "Đã giao": "delivered",
  "Đã hủy": "canceled",
};

const orders = ref([]);
const searchQuery = ref("");
const selectedOrder = ref(null);
const showCancelPopup = ref(false);
const cancelReason = ref("");
const pendingOrder = ref(null);
const isLoading = ref(false);

const filteredOrders = computed(() => {
  if (!searchQuery.value) return orders.value;
  const query = searchQuery.value.toLowerCase();
  return orders.value.filter(
    (order) =>
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.customerName &&
        order.customerName.toLowerCase().includes(query)) ||
      (order.phone && order.phone.includes(query))
  );
});

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const offset = 7 * 60;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vietnamDate = new Date(utc + offset * 60000);
  const day = String(vietnamDate.getDate()).padStart(2, "0");
  const month = String(vietnamDate.getMonth() + 1).padStart(2, "0");
  const year = vietnamDate.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const offset = 7 * 60;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vietnamDate = new Date(utc + offset * 60000);
  const day = String(vietnamDate.getDate()).padStart(2, "0");
  const month = String(vietnamDate.getMonth() + 1).padStart(2, "0");
  const year = vietnamDate.getFullYear();
  const hours = String(vietnamDate.getHours()).padStart(2, "0");
  const minutes = String(vietnamDate.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const getStatusColor = (status) => {
  return {
    backgroundColor: status === "Đã hủy" ? "#dc3545" : "#6399a9",
    textColor: status === "Đã hủy" ? "#dc3545" : "#000000",
  };
};

const getTotal = (products, originalTotal = 0) => {
  if (!products || products.length === 0) return originalTotal;
  return products.reduce((sum, p) => sum + p.quantity * p.price, 0);
};

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const fetchOrders = async () => {
  try {
    isLoading.value = true;
    const response = await orderService.getAllOrder({ page: 1, limit: 10 });
    console.log("API response (getAllOrder):", response);
    if (response.success) {
      orders.value = response.data.orders.map((order) => ({
        id: order._id,
        customerName: order.o_name,
        phone: order.o_phone,
        address: order.o_shipping_address,
        paymentMethod: order.o_payment_method,
        note: order.o_note || "",
        createdAt: order.o_date,
        status: statusMap[order.o_status] || order.o_status,
        statusHistory: order.statusHistory
          ? order.statusHistory.map((entry) => ({
              ...entry,
              status: statusMap[entry.status] || entry.status,
            }))
          : [],
        products: order.orderDetails
          ? order.orderDetails
              .filter((detail) => detail.p_id)
              .map((detail) => ({
                id: detail.p_id._id,
                name: detail.p_id.p_name,
                quantity: detail.order_detail_quantity,
                price: detail.unit_price,
                image:
                  detail.p_id.p_images && detail.p_id.p_images.length > 0
                    ? getProductUrl({ p_images: detail.p_id.p_images })
                    : "https://picsum.photos/50/50",
              }))
          : [],
        totalAmount: order.o_total_amount || 0,
      }));
    } else {
      throw new Error(response.message || "Không thể lấy danh sách đơn hàng.");
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    alert("Không thể tải danh sách đơn hàng: " + error.message);
  } finally {
    isLoading.value = false;
  }
};

const handleStatusChange = async (order, newStatus) => {
  if (newStatus === "Đã hủy") {
    pendingOrder.value = order;
    showCancelPopup.value = true;
  } else {
    await updateStatus(order, newStatus);
  }
};

const updateStatus = async (order, newStatus, reason = "") => {
  try {
    isLoading.value = true;
    const statusData = { status: reverseStatusMap[newStatus] };
    if (newStatus === "Đã hủy") {
      statusData.cancel_reason = reason;
    }
    const response = await orderService.updateOrderStatus(order.id, statusData);
    if (response.success) {
      order.status = newStatus;
      const now = new Date();
      const statusEntry = {
        status: newStatus,
        timestamp: now.toISOString(),
      };
      if (newStatus === "Đã hủy" && reason) {
        statusEntry.cancelReason = reason;
      }
      order.statusHistory.push(statusEntry);
    } else {
      throw new Error(response.message || "Không thể cập nhật trạng thái.");
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
    alert("Không thể cập nhật trạng thái đơn hàng: " + error.message);
    order.status = order.statusHistory[order.statusHistory.length - 1].status;
  } finally {
    isLoading.value = false;
  }
};

const confirmCancel = async () => {
  if (!cancelReason.value.trim()) {
    alert("Vui lòng nhập lý do hủy đơn!");
    return;
  }
  if (pendingOrder.value) {
    await updateStatus(pendingOrder.value, "Đã hủy", cancelReason.value);
    showCancelPopup.value = false;
    cancelReason.value = "";
    pendingOrder.value = null;
  }
};

const cancelCancel = () => {
  showCancelPopup.value = false;
  cancelReason.value = "";
  if (pendingOrder.value) {
    pendingOrder.value.status =
      pendingOrder.value.statusHistory[
        pendingOrder.value.statusHistory.length - 1
      ].status;
  }
  pendingOrder.value = null;
};

const deleteOrder = async (orderId) => {
  if (!orderId) {
    alert("Mã đơn hàng không hợp lệ!");
    return;
  }
  if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) return;
  try {
    isLoading.value = true;
    const response = await orderService.deleteOrder(orderId);
    if (response.success) {
      await fetchOrders();
      alert("Xóa đơn hàng thành công!");
    } else {
      throw new Error(response.message || "Không thể xóa đơn hàng.");
    }
  } catch (error) {
    console.error("Lỗi khi xóa đơn hàng:", error);
    alert("Không thể xóa đơn hàng: " + error.message);
  } finally {
    isLoading.value = false;
  }
};

const canDeleteOrder = (order) => {
  return order.status !== "Đã giao" && order.id;
};

const openDetailModal = async (orderId) => {
  try {
    isLoading.value = true;
    const response = await orderService.getOrderDetail(orderId);
    console.log("API response (getOrderDetail):", response);
    if (response.success) {
      selectedOrder.value = {
        id: response.data._id,
        customerName: response.data.o_name,
        phone: response.data.o_phone,
        total: response.data.o_total_amount,
        address: response.data.o_shipping_address,
        paymentMethod: response.data.o_payment_method,
        note: response.data.o_note || "",
        createdAt: response.data.o_date,
        status: statusMap[response.data.o_status] || response.data.o_status,
        statusHistory: response.data.statusHistory
          ? response.data.statusHistory.map((entry) => ({
              ...entry,
              status: statusMap[entry.status] || entry.status, // Ánh xạ trạng thái
            }))
          : [],
        products: response.data.orderDetails
          ? response.data.orderDetails
              .filter((detail) => detail.p_id)
              .map((detail) => ({
                id: detail.p_id._id,
                name: detail.p_id.p_name,
                quantity: detail.order_detail_quantity,
                price: detail.unit_price,
                image:
                  detail.p_id.p_images && detail.p_id.p_images.length > 0
                    ? getProductUrl({ p_images: detail.p_id.p_images })
                    : "https://picsum.photos/50/50",
              }))
          : [],
      };
    } else {
      throw new Error(response.message || "Không thể lấy chi tiết đơn hàng.");
    }
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
    alert("Không thể lấy chi tiết đơn hàng: " + error.message);
  } finally {
    isLoading.value = false;
  }
};

const closeDetailModal = () => {
  selectedOrder.value = null;
};

const getCancelReason = (order) => {
  if (order.status !== "Đã hủy") return "";
  const cancelEntry = order.statusHistory.find(
    (entry) => entry.status === "Đã hủy" && entry.cancelReason
  );
  return cancelEntry ? cancelEntry.cancelReason : "";
};

const getPaymentMethodText = (method) => {
  return method === "COD"
    ? "Thanh toán khi nhận hàng (COD)"
    : "Thanh toán online (Thẻ ngân hàng)";
};

onMounted(() => {
  fetchOrders();
});
</script>

<template>
  <div class="container-fluid order-container">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Đang tải...</span>
      </div>
    </div>
    <div class="search-bar mb-4">
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          placeholder="Tìm mã đơn, tên khách hàng, số điện thoại"
          v-model="searchQuery"
        />
      </div>
    </div>
    <div class="row">
      <div v-for="order in filteredOrders" :key="order.id" class="col-12 mb-4">
        <div class="order-card card">
          <div class="card-body d-flex">
            <div class="order-content flex-grow-1">
              <div
                class="d-flex justify-content-between align-items-center mb-2"
              >
                <h5 class="order-id mb-0">
                  Mã: {{ order.id || "Không xác định" }}
                </h5>
                <div class="d-flex align-items-center">
                  <span class="created-at me-2">{{
                    formatDate(order.createdAt)
                  }}</span>
                  <select
                    class="form-select status-select"
                    :style="{ color: getStatusColor(order.status).textColor }"
                    v-model="order.status"
                    @change="handleStatusChange(order, $event.target.value)"
                    :disabled="isLoading"
                  >
                    <option value="Chờ xác nhận" class="opt">
                      Chờ xác nhận
                    </option>
                    <option value="Đã xác nhận" class="opt">Đã xác nhận</option>
                    <option value="Đang giao" class="opt">Đang giao</option>
                    <option value="Đã giao" class="opt">Đã giao</option>
                    <option value="Đã hủy" class="opt">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div
                class="products-list mb-3"
                style="max-height: 150px; overflow-y: auto"
              >
                <div v-if="order.products && order.products.length > 0">
                  <div
                    v-for="product in order.products"
                    :key="product.id"
                    class="product-item d-flex align-items-center mb-2"
                  >
                    <img
                      :src="product.image"
                      :alt="product.name"
                      class="product-image me-2"
                    />
                    <div class="product-info flex-grow-1">
                      <div class="product-name">{{ product.name }}</div>
                      <div class="product-details">
                        Số lượng: {{ product.quantity }} | Đơn giá:
                        {{
                          product.price.toLocaleString("vi-VN", {
                            currency: "VND",
                          })
                        }}
                        đ
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-muted">
                  Không có sản phẩm trong đơn hàng.
                </p>
              </div>
              <div class="total-price mb-3">
                <strong>Tổng tiền: </strong>
                {{
                  getTotal(order.products, order.totalAmount).toLocaleString(
                    "vi-VN",
                    {
                      currency: "VND",
                    }
                  )
                }}
                đ
              </div>
              <div v-if="getCancelReason(order)" class="cancel-reason mb-3">
                <strong>Lý do hủy: </strong>{{ getCancelReason(order) }}
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div class="customer-info">
                  <strong>Khách hàng: </strong>{{ order.customerName }} -
                  {{ order.phone }}
                </div>
                <div>
                  <button
                    class="btn btn-detail"
                    @click="openDetailModal(order.id)"
                    :disabled="isLoading"
                  >
                    Chi tiết
                  </button>
                  <button
                    class="btn btn-danger ms-2"
                    @click="deleteOrder(order.id)"
                    :disabled="!canDeleteOrder(order) || isLoading"
                    :title="
                      !canDeleteOrder(order)
                        ? 'Không thể xóa đơn hàng đã giao hoặc không có mã'
                        : 'Xóa đơn hàng'
                    "
                  >
                    {{ isLoading ? "Đang xóa..." : "Xóa" }}
                  </button>
                </div>
              </div>
            </div>
            <div class="timeline ms-3">
              <div
                v-for="(status, index) in order.statusHistory"
                :key="index"
                class="timeline-item"
              >
                <div
                  class="timeline-dot"
                  :style="{
                    backgroundColor: getStatusColor(status.status)
                      .backgroundColor,
                  }"
                ></div>
                <div class="timeline-content">
                  <div class="timeline-status">{{ status.status }}</div>
                  <div
                    v-if="status.cancelReason"
                    class="timeline-cancel-reason"
                  >
                    Lý do: {{ status.cancelReason }}
                  </div>
                  <div class="timeline-time">
                    {{ formatDateTime(status.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showCancelPopup"
      class="modal fade show d-block"
      tabindex="-1"
      style="background: rgba(0, 0, 0, 0.5)"
    >
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Lý do hủy đơn</h5>
            <button
              type="button"
              class="btn-close"
              @click="cancelCancel"
            ></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="cancelReason" class="form-label"
                >Vui lòng nhập lý do:</label
              >
              <textarea
                id="cancelReason"
                class="form-control"
                v-model="cancelReason"
                rows="3"
                placeholder="Nhập lý do hủy đơn..."
                :disabled="isLoading"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="cancelCancel"
              :disabled="isLoading"
            >
              Hủy
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="confirmCancel"
              :disabled="isLoading"
            >
              {{ isLoading ? "Đang xử lý..." : "Xác nhận" }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selectedOrder"
      class="modal fade show d-block"
      tabindex="-1"
      style="background: rgba(0, 0, 0, 0.5)"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Chi tiết đơn hàng {{ selectedOrder.id || "Không xác định" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeDetailModal"
              :disabled="isLoading"
            ></button>
          </div>
          <div class="modal-body">
            <h5 class="text-center">Thông tin khách hàng</h5>
            <p>
              <strong>Ngày tạo đơn:</strong>
              {{ formatDate(selectedOrder.createdAt) }}
            </p>
            <p><strong>Khách hàng:</strong> {{ selectedOrder.customerName }}</p>
            <p><strong>Số điện thoại:</strong> {{ selectedOrder.phone }}</p>
            <p><strong>Địa chỉ:</strong> {{ selectedOrder.address }}</p>
            <p>
              <strong>Hình thức thanh toán:</strong>
              {{ getPaymentMethodText(selectedOrder.paymentMethod) }}
            </p>
            <p v-if="selectedOrder.note" class="order-note">
              <strong>Ghi chú:</strong> {{ selectedOrder.note }}
            </p>
            <p>
              <strong>Trạng thái: </strong>
              <span
                :style="{
                  color: getStatusColor(selectedOrder.status).textColor,
                }"
              >
                {{ selectedOrder.status }}
              </span>
            </p>
            <h5 class="mt-5 text-center">Danh sách sản phẩm</h5>
            <div class="products-list">
              <div
                v-if="
                  selectedOrder.products && selectedOrder.products.length > 0
                "
              >
                <div
                  v-for="product in selectedOrder.products"
                  :key="product.id"
                  class="product-item d-flex align-items-center mb-2"
                >
                  <img
                    :src="product.image"
                    :alt="product.name"
                    class="product-image me-2"
                  />
                  <div class="product-info">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-details">
                      Số lượng: {{ product.quantity }} | Đơn giá:
                      {{
                        product.price.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })
                      }}
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="text-muted">Không có sản phẩm trong đơn hàng.</p>
            </div>
            <p>
              <strong>Tổng tiền:</strong>
              {{
                getTotal(selectedOrder.products).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })
              }}
            </p>

            <h5 class="mt-5 text-center">Tiến trình đơn hàng</h5>

            <div class="timeline">
              <div
                v-for="(status, index) in selectedOrder.statusHistory"
                :key="index"
                class="timeline-item"
              >
                <div
                  class="timeline-dot"
                  :style="{
                    backgroundColor: getStatusColor(status.status)
                      .backgroundColor,
                  }"
                ></div>
                <div class="timeline-content">
                  <div class="timeline-status">{{ status.status }}</div>
                  <div
                    v-if="status.cancelReason"
                    class="timeline-cancel-reason"
                  >
                    Lý do: {{ status.cancelReason }}
                  </div>
                  <div class="timeline-time">
                    {{ formatDateTime(status.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeDetailModal"
              :disabled="isLoading"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.search-bar .input-group {
  margin: 0 auto;
}

.order-card {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.order-id {
  font-weight: bold;
  color: #212529;
}

.created-at {
  font-size: 0.9rem;
  color: #6c757d;
}

.status-select {
  border: 1px solid #6399a9;
  padding: 5px 10px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  width: 150px;
}

.status-select .opt {
  color: black;
}

.product-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.product-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.product-details {
  font-size: 0.85rem;
  color: #6c757d;
}

.total-price {
  font-size: 1rem;
  color: #212529;
}

.cancel-reason {
  font-size: 1rem;
  color: #dc3545;
}

.customer-info {
  font-weight: 500;
  color: #212529;
}

.btn-detail {
  background-color: #6399a9;
  color: white;
}
.btn-detail:hover {
  background-color: #527b8a;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}
.btn-danger:hover {
  background-color: #c82333;
  color: white;
}

.btn-danger:disabled,
.btn-detail:disabled,
.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.timeline {
  width: 200px;
  padding-left: 10px;
  border-left: 2px solid #dee2e6;
}

.timeline-item {
  position: relative;
  margin-bottom: 10px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  left: -16px;
  top: 5px;
}

.timeline-content {
  font-size: 0.85rem;
}

.timeline-status {
  font-weight: 500;
}

.timeline-cancel-reason {
  font-size: 0.8rem;
  color: #dc3545;
}

.timeline-time {
  color: #6c757d;
}

.modal-content {
  border-radius: 8px;
}

.modal-content h5 {
  font-weight: bold;
}

.modal-content .modal-title {
  font-weight: bold;
}

.text-muted {
  color: #6c757d;
}

@media (max-width: 768px) {
  .order-card .card-body {
    flex-direction: column;
  }

  .timeline {
    margin-top: 10px;
    width: 100%;
    border-left: none;
    border-top: 2px solid #dee2e6;
    padding-top: 10px;
  }

  .timeline-dot {
    top: -6px;
    left: 5px;
  }
}
</style>
