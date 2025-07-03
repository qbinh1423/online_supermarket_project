import { createRouter, createWebHistory } from "vue-router";
import LoginRegister from "@/views/LoginRegister.vue";
import HomePage from "@/views/HomePage.vue";
import DetailPage from "@/views/DetailPage.vue";
import CartPage from "@/views/CartPage.vue";
import CategoriesPage from "@/views/CategoriesPage.vue";
import BrandPage from "../views/BrandPage.vue";
import OrderPage from "@/views/OrderPage.vue";
import UserPage from "@/views/UserPage.vue";
import Error from "@/components/Error.vue";

const HomePageAdmin = () => import("@/views/Admin/HomePageAdmin.vue");

const routes = [
  // Customer
  {
    path: "/",
    name: "shop",
    component: HomePage,
  },
  {
    path: "/login-account",
    name: "login-account",
    component: LoginRegister,
  },
  {
    path: "/categories",
    name: "categories",
    component: CategoriesPage,
  },
  {
    path: "/categories/:cate_name",
    name: "category-type",
    component: CategoriesPage,
    props: true,
  },
  {
    path: "/brands",
    name: "brands",
    component: BrandPage,
  },
  {
    path: "/brands/:br_name",
    name: "brands",
    component: BrandPage,
    props: true,
  },
  {
    path: "/product/:id",
    name: "detail",
    component: DetailPage,
    props: true,
  },
  {
    path: "/cart",
    name: "cart",
    component: CartPage,
  },
  {
    path: "/order",
    name: "order",
    component: OrderPage,
  },
  {
    path: "/account-info",
    redirect: "/user/account-info",
  },
  {
    path: "/user",
    name: "user",
    component: UserPage,
    children: [
      {
        path: "",
        name: "user-default",
        component: UserPage,
        props: { defaultTab: "accountInfo" },
      },
      {
        path: "account-info",
        name: "user-account-info",
        component: UserPage,
        props: { defaultTab: "accountInfo" },
      },
      {
        path: "order-history",
        name: "user-order-history",
        component: UserPage,
        props: { defaultTab: "orderHistory" },
      },
      {
        path: "viewed-products",
        name: "user-viewed-products",
        component: UserPage,
        props: { defaultTab: "viewedProducts" },
      },
      {
        path: "reviews",
        name: "user-reviews",
        component: UserPage,
        props: { defaultTab: "reviews" },
      },
      {
        path: "discounts",
        name: "user-discounts",
        component: UserPage,
        props: { defaultTab: "discounts" },
      },
    ],
  },
  {
    path: "/error",
    name: "error",
    component: Error,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/error",
  },

  // Admin
  {
    path: "/admin",
    name: "admin",
    component: HomePageAdmin,
    children: [
      {
        path: "",
        name: "admin-default",
        component: HomePageAdmin,
        props: { defaultTab: "dashboard" },
      },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: HomePageAdmin,
        props: { defaultTab: "dashboard" },
      },
      {
        path: "customer",
        name: "admin-customer",
        component: HomePageAdmin,
        props: { defaultTab: "customer" },
      },
      {
        path: "order",
        name: "admin-order",
        component: HomePageAdmin,
        props: { defaultTab: "order" },
      },
      {
        path: "product",
        name: "admin-product",
        component: HomePageAdmin,
        props: { defaultTab: "product" },
      },
      {
        path: "category",
        name: "admin-category",
        component: HomePageAdmin,
        props: { defaultTab: "category" },
      },
      {
        path: "brand",
        name: "admin-brand",
        component: HomePageAdmin,
        props: { defaultTab: "brand" },
      },
      {
        path: "voucher",
        name: "admin-voucher",
        component: HomePageAdmin,
        props: { defaultTab: "voucher" },
      },
      {
        path: "rating",
        name: "admin-rating",
        component: HomePageAdmin,
        props: { defaultTab: "rating" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    if (to.name === "login-account" || to.name === "shop") return next();
    return next({ name: "login-account" });
  }

  if (!role) {
    localStorage.removeItem("token");
    return next({ name: "login-account" });
  }

  if (
    role === "admin" &&
    (to.path === "/" || to.name === "shop" || to.fullPath.startsWith("/user"))
  ) {
    return next({ name: "admin-dashboard" });
  }

  if (role !== "admin" && to.fullPath.startsWith("/admin")) {
    return next({ name: "shop" });
  }

  return next();
});

export default router;
