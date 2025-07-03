<script setup>
import { ref, computed, watch } from "vue";
import { useMutation } from "@tanstack/vue-query";
import orderService from "../services/order";

const orders = ref([]);
const activeStatusTab = ref("pending");
const searchQuery = ref("");

const fetchOrders = useMutation({
  mutationFn: (status) => orderService.getOrdersByStatus(status),
  onSuccess: (data) => {
    if (!Array.isArray(data)) {
      console.warn("Không có dữ liệu đơn hàng hợp lệ", data);
      orders.value = [];
      return;
    }

    orders.value = data.map((order) => ({
      id: order._id,
      date: new Date(order.o_date).toLocaleDateString("vi-VN"),
      status: order.o_status,
      cancelReason: order.o_cancel_reason || "",
      items: Array.isArray(order.orderDetails)
        ? order.orderDetails.map((detail) => {
            console.log("Detail data:", detail);
            const productImage =
              detail?.p_id?.p_images && detail.p_id.p_images.length > 0
                ? `http://localhost:5000${detail.p_id.p_images[0]}`
                : detail?.p_id?.p_image || "https://via.placeholder.com/80";
            return {
              productName: detail?.p_id?.p_name ?? "Không rõ tên",
              productImage: productImage,
              quantity: detail?.order_detail_quantity ?? 0,
              price: detail?.unit_price ?? 0,
            };
          })
        : [],
    }));
    console.log("Dữ liệu đơn hàng fetch được:", data);
  },
  onError: (error) => {
    console.error("Lỗi khi lấy đơn hàng:", error);
  },
});

const filteredOrders = computed(() => {
  if (!Array.isArray(orders.value)) return [];
  return orders.value.filter((order) => {
    const matchesStatus = order.status === activeStatusTab.value;
    const matchesSearch = searchQuery.value
      ? order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        order.items.some((item) =>
          item.productName
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())
        )
      : true;
    return matchesStatus && matchesSearch;
  });
});

watch(activeStatusTab, (newStatus) => {
  fetchOrders.mutate(newStatus);
});

fetchOrders.mutate(activeStatusTab.value);

function changeStatusTab(status) {
  activeStatusTab.value = status;
}

function getStatusText(status) {
  const statusMap = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    delivered: "Đã giao",
    canceled: "Đã hủy",
  };
  return statusMap[status] || "";
}
</script>
<template>
  <div class="tab-content">
    <div class="status-tabs">
      <button
        class="status-tab"
        :class="{ active: activeStatusTab === 'pending' }"
        @click="changeStatusTab('pending')"
      >
        Chờ xác nhận
      </button>
      <button
        class="status-tab"
        :class="{ active: activeStatusTab === 'processing' }"
        @click="changeStatusTab('processing')"
      >
        Đã xác nhận
      </button>
      <button
        class="status-tab"
        :class="{ active: activeStatusTab === 'shipped' }"
        @click="changeStatusTab('shipped')"
      >
        Đang giao
      </button>
      <button
        class="status-tab"
        :class="{ active: activeStatusTab === 'delivered' }"
        @click="changeStatusTab('delivered')"
      >
        Đã giao
      </button>
      <button
        class="status-tab"
        :class="{ active: activeStatusTab === 'canceled' }"
        @click="changeStatusTab('canceled')"
      >
        Đã hủy
      </button>
    </div>
    <div class="search-bar">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Tìm kiếm theo mã đơn hoặc tên sản phẩm"
        class="form-control"
      />
    </div>
    <div class="order-list">
      <div v-if="filteredOrders?.length === 0">Không có đơn hàng</div>
      <div
        v-else
        class="order-item"
        v-for="order in filteredOrders"
        :key="order.id"
      >
        <div class="order-header">
          <span class="order-id">Mã đơn: {{ order.id }}</span>
          <div class="order-date-status">
            <span class="order-date">Ngày đặt: {{ order.date }}</span>
            <span class="order-status">{{ getStatusText(order.status) }}</span>
          </div>
        </div>
        <div class="order-details">
          <div
            v-for="(item, index) in order.items"
            :key="index"
            class="order-item-details"
          >
            <div class="product-image">
              <img
                :src="item.productImage"
                alt="Product Image"
                class="product-img"
              />
            </div>
            <div class="product-info">
              <div class="product-name">{{ item.productName }}</div>
              <div class="product-quantity">Số lượng: {{ item.quantity }}</div>
            </div>
            <div class="product-price">
              {{ item.price.toLocaleString("vi-VN") }} đ
            </div>
          </div>
        </div>
        <div class="order-total">
          <span
            >Tổng tiền:
            {{
              order.items
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toLocaleString("vi-VN")
            }}
            đ</span
          >
        </div>
        <div
          v-if="order.status === 'canceled' && order.cancelReason"
          class="cancel-reason"
        >
          <strong>Lý do hủy:</strong> {{ order.cancelReason }}
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

.status-tabs {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow: hidden;
}

.status-tab {
  flex: 1;
  background-color: white;
  border: none;
  border-right: 1px solid #ddd;
  padding: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-tab:last-child {
  border-right: none;
}

.status-tab:first-child {
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}

.status-tab:last-child {
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
}

.status-tab.active,
.status-tab:hover {
  background-color: #6399a9;
  color: white;
  border-color: #6399a9;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar input {
  width: 100%;
  max-width: 800px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.order-list {
  min-height: 200px;
}

.no-orders {
  text-align: center;
  font-size: 18px;
  color: #666;
  padding: 20px;
}

.order-item {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 10px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: bold;
}

.order-date-status {
  display: flex;
  gap: 10px;
}

.order-id {
  color: #6399a9;
}

.order-date {
  color: #666;
}

.order-status {
  font-weight: bold;
  color: #28a745;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.order-item-details {
  display: flex;
  align-items: center;
  gap: 15px;
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
  width: 90%;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-quantity {
  font-size: 14px;
  color: #666;
}

.product-price {
  font-size: 16px;
  font-weight: bold;
}

.order-total {
  text-align: right;
  font-size: 16px;
  font-weight: bold;
  color: #d4575d;
}

.cancel-reason {
  margin-top: 10px;
  font-size: 14px;
  color: #dc3545;
  font-weight: 500;
}
</style>
