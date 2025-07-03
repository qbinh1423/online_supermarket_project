<script setup>
import { ref, onMounted } from "vue";

const totalCustomers = ref(0);
const pendingOrders = ref(0);
const processingOrders = ref(0);
const shippedOrders = ref(0);
const deliveredOrders = ref(0);
const totalProducts = ref(0);
const totalBrands = ref(0);
const totalVouchers = ref(0);

const getToken = () => localStorage.getItem("token");

const fetchBrands = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/brand/count", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy số lượng thương hiệu");
    const data = await response.json();
    totalBrands.value = data.count.toString();
  } catch (error) {
    console.error("Lỗi khi lấy số lượng thương hiệu:", error);
    alert("Không thể tải số lượng thương hiệu: " + error.message);
  }
};

const fetchVouchers = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/voucher/count", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy số lượng voucher");
    const data = await response.json();
    totalVouchers.value = data.count.toString();
  } catch (error) {
    console.error("Lỗi khi lấy số lượng voucher:", error);
    alert("Không thể tải số lượng voucher: " + error.message);
  }
};

const fetchProducts = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/product/count", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy số lượng sản phẩm");
    const data = await response.json();
    totalProducts.value = data.count.toString();
  } catch (error) {
    console.error("Lỗi khi lấy số lượng sản phẩm:", error);
    alert("Không thể tải số lượng sản phẩm: " + error.message);
  }
};

const fetchUsers = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/users/count", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Không thể lấy số lượng khách hàng");
    const data = await response.json();
    totalCustomers.value = data.data.count;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng khách hàng:", error);
    alert("Không thể tải số lượng khách hàng: " + error.message);
  }
};

const fetchOrderStatus = async () => {
  try {
    const statuses = ["pending", "processing", "shipped", "delivered"];
    for (const status of statuses) {
      const response = await fetch(
        `http://localhost:5000/api/order/count/${status}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!response.ok)
        throw new Error(`Không thể lấy số lượng đơn hàng ${status}`);
      const data = await response.json();
      if (!data.success)
        throw new Error(
          data.message || `Lỗi khi lấy số lượng đơn hàng ${status}`
        );

      switch (status) {
        case "pending":
          pendingOrders.value = data.data.count;
          break;
        case "processing":
          processingOrders.value = data.data.count;
          break;
        case "shipped":
          shippedOrders.value = data.data.count;
          break;
        case "delivered":
          deliveredOrders.value = data.data.count;
          break;
      }
    }
  } catch (error) {
    console.error("Lỗi khi lấy số lượng đơn hàng:", error);
    alert("Không thể tải số lượng đơn hàng: " + error.message);
  }
};

onMounted(() => {
  fetchBrands();
  fetchVouchers();
  fetchProducts();
  fetchUsers();
  fetchOrderStatus();
});
</script>
<template>
  <div class="container-fluid dashboard-content">
    <div class="header-content">
      <h1 class="header-title">Dashboard</h1>
    </div>
    <div class="dashboard-grid">
      <div class="card customers">
        <div class="card-header">
          <span class="material-icons-sharp card-icon">group</span>
          <h2 class="card-title">Khách hàng</h2>
        </div>
        <p class="card-value">{{ totalCustomers }}</p>
      </div>
      <div class="card orders">
        <div class="card-header">
          <span class="material-icons-sharp card-icon">receipt_long</span>
          <h2 class="card-title">Đơn hàng</h2>
        </div>
        <div class="card-value">
          <!-- <p>Chờ xử lý: {{ pendingOrders }}</p>
          <p>Đang xử lý: {{ processingOrders }}</p>
          <p>Đang giao: {{ shippedOrders }}</p> -->
          <p>Đã giao: {{ deliveredOrders }}</p>
        </div>
      </div>
      <div class="card products">
        <div class="card-header">
          <span class="material-icons-sharp card-icon">inventory</span>
          <h2 class="card-title">Sản phẩm</h2>
        </div>
        <p class="card-value">{{ totalProducts }}</p>
      </div>
      <div class="card brand">
        <div class="card-header">
          <span class="material-icons-sharp card-icon">storefront</span>
          <h2 class="card-title">Thương hiệu</h2>
        </div>
        <p class="card-value">{{ totalBrands }}</p>
      </div>
      <div class="card voucher">
        <div class="card-header">
          <span class="material-icons-sharp card-icon">local_offer</span>
          <h2 class="card-title">Mã khuyến mãi</h2>
        </div>
        <p class="card-value">{{ totalVouchers }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-content {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.dashboard-content .header-title {
  text-align: center;
  font-weight: bold;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  border-radius: 10px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.3s ease;
  background-color: #e6ecef;
}

.card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  border: none;
  padding: 8px 12px;
  border-radius: 0.25rem;
  text-decoration: none;
}

.card-icon {
  font-size: 32px;
  margin-right: 12px;
  font-family: "Material Icons Sharp" !important;
}

.card-title {
  font-size: 20px;
  font-weight: 500;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
}

.revenue,
.customers,
.orders,
.products,
.brand,
.voucher {
  background-color: #6399a9;
  color: white;
}

@media (max-width: 968px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
