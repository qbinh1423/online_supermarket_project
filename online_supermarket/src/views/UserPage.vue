<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import AccountInfo from "@/components/AccountInfo.vue";
import OrderHistory from "@/components/OrderHistory.vue";
import ViewedProducts from "@/components/ViewedProducts.vue";
import Reviews from "@/components/Reviews.vue";
import Discounts from "@/components/Discounts.vue";
import userService from "@/services/user.js";

const activeTab = ref("accountInfo");
const route = useRoute();
const router = useRouter();
const userInfo = ref({
  fullName: "",
});
const originalUserInfo = ref({ ...userInfo.value });

const pathToTabMap = {
  "/user/account-info": "accountInfo",
  "/user/order-history": "orderHistory",
  "/user/viewed-products": "viewedProducts",
  "/user/reviews": "reviews",
  "/user/discounts": "discounts",
};

const getTabFromRoute = (path) => {
  return pathToTabMap[path] || "accountInfo";
};

const tabComponents = {
  accountInfo: AccountInfo,
  orderHistory: OrderHistory,
  viewedProducts: ViewedProducts,
  reviews: Reviews,
  discounts: Discounts,
};

function changeTab(tab) {
  activeTab.value = tab;
  const path = Object.keys(pathToTabMap).find(
    (key) => pathToTabMap[key] === tab
  );
  if (path) {
    router.push(path);
  }
}

async function fetchUserInfo() {
  try {
    const data = await userService.getUserProfile();
    const user = data.user;
    userInfo.value = {
      fullName: user.c_name || "User",
    };
    originalUserInfo.value = { ...userInfo.value };
  } catch (error) {
    console.error("Lỗi khi lấy tên người dùng:", error);
    alert("Không thể tải tên người dùng: " + error.message);
  }
}

onMounted(() => {
  activeTab.value = getTabFromRoute(route.path);
  fetchUserInfo();
});
</script>

<template>
  <div class="wrapper">
    <header><AppHeader /></header>
    <div class="accountpage">
      <div class="container-fluid account-container">
        <div class="row">
          <div class="col-lg-3 col-md-3 col-sm-12 sidebar">
            <div class="account-info">
              <i class="fas fa-user-circle fa-3x"></i>
              <h4>{{ userInfo.fullName }}</h4>
            </div>
            <div class="nav-tabs">
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'accountInfo' }"
                to="/user/account-info"
                @click="changeTab('accountInfo')"
              >
                Thông tin tài khoản
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'orderHistory' }"
                to="/user/order-history"
                @click="changeTab('orderHistory')"
              >
                Lịch sử mua hàng
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'viewedProducts' }"
                to="/user/viewed-products"
                @click="changeTab('viewedProducts')"
              >
                Sản phẩm đã xem
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'reviews' }"
                to="/user/reviews"
                @click="changeTab('reviews')"
              >
                Đánh giá sản phẩm
              </router-link>
              <router-link
                class="tab-btn"
                :class="{ active: activeTab === 'discounts' }"
                to="/user/discounts"
                @click="changeTab('discounts')"
              >
                Mã giảm giá
              </router-link>
            </div>
          </div>
          <div class="col-lg-7 col-md-8 col-sm-12 content">
            <transition name="fade" mode="out-in">
              <component :is="tabComponents[activeTab]"></component>
            </transition>
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

.accountpage {
  overflow-x: hidden;
  flex: 1 0 auto;
}

.account-container {
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

.account-info {
  text-align: center;
  margin-bottom: 20px;
}

.account-info i {
  color: #6399a9;
}

.account-info h4 {
  margin: 10px 0;
  font-size: 20px;
  font-weight: bold;
}

.nav-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-btn {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
  text-decoration: none;
  color: black;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.tab-btn.active,
.tab-btn:hover {
  background-color: #6399a9;
  color: white;
  border-color: #6399a9;
}

.content {
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
  .content {
    padding-top: 20px;
    margin-top: 20px;
  }
}
</style>
