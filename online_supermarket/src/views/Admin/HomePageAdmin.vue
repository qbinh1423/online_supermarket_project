<script setup>
import AdminHeader from "../../components/AdminHeader.vue";
import AdminCustomer from "./AdminCustomer.vue";
import AdminDashboard from "./AdminDashboard.vue";
import AdminOrder from "./AdminOrder.vue";
import AdminProduct from "./AdminProduct.vue";
import AdminCategory from "./AdminCategory.vue";
import AdminBrand from "./AdminBrand.vue";
import AdminVoucher from "./AdminVoucher.vue";
import AdminRating from "./AdminRating.vue";
import { ref } from "vue";

const activeTab = ref("dashboard");

const tabComponents = {
  dashboard: AdminDashboard,
  customer: AdminCustomer,
  order: AdminOrder,
  product: AdminProduct,
  category: AdminCategory,
  brand: AdminBrand,
  voucher: AdminVoucher,
  rating: AdminRating,
};

function changeTab(tab) {
  activeTab.value = tab;
}
</script>

<template>
  <div class="wrapper">
    <header>
      <AdminHeader />
    </header>
    <div class="adminpage">
      <div class="container-fluid dashboard-container">
        <div class="row">
          <aside class="col-lg-2 col-md-12 col-sm-12 sidebar">
            <nav class="nav-tabs">
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'dashboard' }"
                to="/admin/dashboard"
                @click="changeTab('dashboard')"
              >
                <span class="material-icons-sharp sidebar-icon">dashboard</span>
                Dashboard
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'customer' }"
                to="/admin/customer"
                @click="changeTab('customer')"
              >
                <span class="material-icons-sharp sidebar-icon">group</span>
                Tài khoản
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'order' }"
                to="/admin/order"
                @click="changeTab('order')"
              >
                <span class="material-icons-sharp sidebar-icon"
                  >receipt_long</span
                >
                Đơn hàng
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'product' }"
                to="/admin/product"
                @click="changeTab('product')"
              >
                <span class="material-icons-sharp sidebar-icon">inventory</span>
                Sản phẩm
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'category' }"
                to="/admin/category"
                @click="changeTab('category')"
              >
                <span class="material-icons-sharp sidebar-icon">category</span>
                Danh mục
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'brand' }"
                to="/admin/brand"
                @click="changeTab('brand')"
              >
                <span class="material-icons-sharp sidebar-icon"
                  >storefront</span
                >
                Thương hiệu
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'voucher' }"
                to="/admin/voucher"
                @click="changeTab('voucher')"
              >
                <span class="material-icons-sharp sidebar-icon"
                  >local_offer</span
                >
                Mã khuyến mãi
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'rating' }"
                to="/admin/rating"
                @click="changeTab('rating')"
              >
                <span class="material-icons-sharp sidebar-icon"
                  >thumb_up</span
                >
                Đánh giá sản phẩm
              </router-link>
            </nav>
          </aside>
          <main class="col-lg-9 col-md-12 col-sm-12 main-panel">
            <transition name="fade" mode="out-in">
              <component :is="tabComponents[activeTab]"></component>
            </transition>
          </main>
        </div>
      </div>
    </div>
    <footer>
      <AdminFooter />
    </footer>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.adminpage {
  overflow-x: hidden;
  flex: 1 0 auto;
}

.dashboard-container {
  margin: 80px auto 0;
  max-width: 1800px;
  padding: 20px;
}

.row {
  justify-content: center;
  gap: 1rem;
}

.sidebar {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 5px;
  height: 90%;
}

.nav-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-btn {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 10px;
  text-decoration: none;
  color: #000;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.tab-btn.active,
.tab-btn:hover {
  background-color: #6399a9;
  color: #fff;
}

.sidebar-icon {
  font-size: 24px;
  margin-right: 12px;
  font-family: "Material Icons Sharp" !important;
}

.main-panel {
  background-color: #f8f9fa;
  border-radius: 5px;
  min-height: 400px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .sidebar,
  .main-panel {
    margin-bottom: 20px;
  }
  .main-panel {
    padding-top: 20px;
    margin-top: 20px;
  }
}
</style>
