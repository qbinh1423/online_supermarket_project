<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import categoryService from "../services/category";
import productService from "../services/product";
import { userState, logoutUserSession } from "@/stores/userState";
import { nextTick } from "vue";
import LogoImage from "@/assets/images/logo.png";
import NoImage from "@/assets/images/no-image.png";

const router = useRouter();
const searchBarVisible = ref(false);
const offcanvasVisible = ref(false);
const searchBar = ref(null);
const offcanvasToggle = ref(null);
const searchToggleBtn = ref(null);
const closeBtn = ref(null);
const searchQuery = ref("");
const imageFile = ref(null);
const imageUrl = ref("");
const previewImage = ref("");
const searchType = ref("text");
const isLoading = ref(false);
const category = ref([]);
const allProducts = ref([]);
const queryClient = useQueryClient();
const parentCategory = computed(() =>
  category.value.filter((cat) => cat.parent_category_id === null)
);

const childrenMap = computed(() => {
  const map = {};
  category.value.forEach((cat) => {
    const parentId = cat.parent_category_id?._id || null;
    if (parentId) {
      if (!map[parentId]) {
        map[parentId] = [];
      }
      map[parentId].push(cat);
    }
  });
  return map;
});

const getCategoryMutation = useMutation({
  mutationFn: async () => {
    const response = await categoryService.getAllCategory();
    return response;
  },
  onSuccess: (data) => {
    category.value = [...data.data];
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    nextTick(() => {
      setupDropdowns();
    });
  },
});

const fetchAllProducts = async () => {
  try {
    const response = await productService.getAllProduct();
    console.log("API response:", response);
    if (!response.data?.products || !Array.isArray(response.data.products)) {
      console.error("Dữ liệu API không hợp lệ:", response.data);
      allProducts.value = [];
      return;
    }
    allProducts.value = response.data.products.map((product) => ({
      _id: product._id,
      name: product.p_name,
      image: getProductUrl(product),
      brand: product.p_brand?.br_name || "Unknown",
      category: product.p_category?.cate_name || "Unknown",
    }));
  } catch (error) {
    console.error("Lỗi khi fetch sản phẩm:", error.message);
    allProducts.value = [];
  }
};

const filteredProducts = computed(() => {
  if (!searchQuery.value?.trim() || searchType.value !== "text") return [];
  return allProducts.value.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const imageSearchResults = ref([]);

const navigateToProduct = (id) => {
  searchBarVisible.value = false;
  searchQuery.value = "";
  imageFile.value = null;
  imageUrl.value = "";
  previewImage.value = "";
  imageSearchResults.value = [];
  searchType.value = "text";
  window.location.href = `/product/${id}`;
};

const checkZoomOrWidth = () => {
  offcanvasVisible.value =
    window.devicePixelRatio >= 2 || window.innerWidth <= 967;
};

const toggleSearchBar = () => {
  searchBarVisible.value = !searchBarVisible.value;
  if (!searchBarVisible.value) {
    searchQuery.value = "";
    imageFile.value = null;
    imageUrl.value = "";
    previewImage.value = "";
    imageSearchResults.value = [];
    searchType.value = "text";
  }
};

const navigateToCategory = (type) => {
  const formattedType = type.replace(/\s+/g, "-").toLowerCase();
  window.location.href = `/categories/${formattedType}`;
};

const setupDropdowns = () => {
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    const dropdownToggle = dropdown.querySelector(".custom-dropdown-toggle");
    const dropdownMenu = dropdown.querySelector(".dropdown-menu");

    const showMenu = () => dropdownMenu.classList.add("show-submenu");
    const hideMenu = () => dropdownMenu.classList.remove("show-submenu");

    dropdownToggle.addEventListener("mouseenter", showMenu);
    dropdown.addEventListener("mouseleave", hideMenu);

    dropdown._eventListeners = dropdown._eventListeners || [];
    dropdown._eventListeners.push({
      element: dropdownToggle,
      type: "mouseenter",
      listener: showMenu,
    });
    dropdown._eventListeners.push({
      element: dropdown,
      type: "mouseleave",
      listener: hideMenu,
    });
  });

  const dropdownParents = document.querySelectorAll(".dropdown-item-parent");
  dropdownParents.forEach((parent) => {
    const dropdownItem = parent.querySelector(".dropdown-item");
    const submenu = parent.querySelector(".dropdown-menu-child");

    const showSubmenu = () => {
      document.querySelectorAll(".dropdown-menu-child").forEach((menu) => {
        menu.classList.remove("show-submenu");
      });
      if (submenu) submenu.classList.add("show-submenu");
    };

    const hideSubmenu = () => {
      if (submenu) submenu.classList.remove("show-submenu");
    };

    dropdownItem.addEventListener("mouseenter", showSubmenu);
    parent.addEventListener("mouseleave", hideSubmenu);

    parent._eventListeners = parent._eventListeners || [];
    parent._eventListeners.push({
      element: dropdownItem,
      type: "mouseenter",
      listener: showSubmenu,
    });
    parent._eventListeners.push({
      element: parent,
      type: "mouseleave",
      listener: hideSubmenu,
    });
  });
};

const cleanupDropdowns = () => {
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    if (dropdown._eventListeners) {
      dropdown._eventListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
      });
      dropdown._eventListeners = [];
    }
  });

  const dropdownParents = document.querySelectorAll(".dropdown-item-parent");
  dropdownParents.forEach((parent) => {
    if (parent._eventListeners) {
      parent._eventListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
      });
      parent._eventListeners = [];
    }
  });
};

const handleImageDrop = (e) => {
  e.preventDefault();
  const dropZone = e.target.closest(".image-drop-zone");
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      alert("Chỉ hỗ trợ định dạng JPG, PNG, GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File ảnh quá lớn (tối đa 5MB)");
      return;
    }
    imageFile.value = file;
    console.log("File ảnh kéo/thả:", file);
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result;
      searchByImage();
    };
    reader.readAsDataURL(file);
  } else {
    imageSearchResults.value = [];
    alert("Vui lòng chọn file ảnh hợp lệ");
  }
};

const handleImageSelect = (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      alert("Chỉ hỗ trợ định dạng JPG, PNG, GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File ảnh quá lớn (tối đa 5MB)");
      return;
    }
    imageFile.value = file;
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result;
      searchByImage();
    };
    reader.readAsDataURL(file);
  } else {
    imageSearchResults.value = [];
    alert("Vui lòng chọn file ảnh hợp lệ");
  }
};

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const searchByImage = async () => {
  console.log("Starting image search", {
    imageFile: imageFile.value,
    imageUrl: imageUrl.value,
  });
  if (!imageFile.value && !imageUrl.value) {
    console.error("Không có file hoặc URL để tìm kiếm");
    return;
  }
  searchType.value = "image";
  imageSearchResults.value = [];
  isLoading.value = true;
  try {
    const results = await productService.searchByImage(
      imageFile.value,
      imageUrl.value
    );
    const allProducts = await productService.getAllProduct();
    const brandMap = allProducts.data.products.reduce((map, p) => {
      map[p.p_brand?._id || p.p_brand] = p.p_brand?.br_name || "Unknown";
      return map;
    }, {});
    const categoryMap = allProducts.data.products.reduce((map, p) => {
      map[p.p_category?._id || p.p_category] =
        p.p_category?.cate_name || "Không xác định";
      return map;
    }, {});

    imageSearchResults.value = results.map((result) => ({
      id: result.id,
      name: result.name,
      image: result.image,
      brand: brandMap[result.brand] || "Unknown",
      category: categoryMap[result.category] || "Không xác định",
      similarity: result.similarity,
      label: result.label,
    }));
    console.log("Image search results:", imageSearchResults.value);
  } catch (error) {
    console.error("Search error:", error.message);
    if (error.message.includes("Internal Server Error")) {
      alert(
        "Lỗi server khi xử lý URL. Vui lòng thử lại với file ảnh hoặc URL khác."
      );
    } else {
      alert(error.message);
    }
    imageSearchResults.value = [];
  } finally {
    isLoading.value = false;
  }
};

const clearImageInput = () => {
  imageFile.value = null;
  previewImage.value = "";
  if (!imageUrl.value) {
    imageSearchResults.value = [];
  } else {
    searchByImage();
  }
};

const searchByText = async () => {
  searchType.value = "text";
  imageSearchResults.value = [];
  previewImage.value = "";
  imageFile.value = null;
  imageUrl.value = "";
};

onMounted(() => {
  checkZoomOrWidth();
  window.addEventListener("resize", checkZoomOrWidth);

  if (searchToggleBtn.value && closeBtn.value && searchBar.value) {
    searchToggleBtn.value.addEventListener("click", toggleSearchBar);
    closeBtn.value.addEventListener("click", toggleSearchBar);
  }

  const offcanvasElement = document.getElementById("staticBackdrop");
  if (offcanvasElement) {
    new bootstrap.Offcanvas(offcanvasElement);
  }

  setupDropdowns();

  getCategoryMutation.mutate();
  fetchAllProducts();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkZoomOrWidth);
  cleanupDropdowns();

  if (searchToggleBtn.value && closeBtn.value) {
    searchToggleBtn.value.removeEventListener("click", toggleSearchBar);
    closeBtn.value.removeEventListener("click", toggleSearchBar);
  }
});

const handleLogout = () => {
  localStorage.removeItem("token");
  logoutUserSession();
  router.push({ name: "shop" });
};
</script>
<template>
  <div class="app-container">
    <nav class="navbar navbar-expand-lg fixed-top">
      <div class="container-fluid container">
        <router-link class="navbar-brand me-auto" to="/">
          <img :src="LogoImage" alt="Logo" class="logo-img" />
        </router-link>
        <button
          ref="offcanvasToggle"
          class="offcanvas-toggle"
          :class="{ show: offcanvasVisible }"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#staticBackdrop"
          aria-controls="staticBackdrop"
        >
          <i class="fas fa-bars"></i>
        </button>
        <div
          class="offcanvas offcanvas-start"
          data-bs-backdrop="static"
          tabindex="-1"
          id="staticBackdrop"
          aria-labelledby="staticBackdropLabel"
        >
          <div class="offcanvas-header">
            <h5 class="offcanvas-title" id="staticBackdropLabel">
              <router-link to="/">
                <img :src="LogoImage" alt="Logo" class="logo-img-offcanvas" />
              </router-link>
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            ></button>
          </div>
          <div class="offcanvas-body">
            <router-link to="/" class="offcanvas-link mt-3"
              >Trang chủ</router-link
            >
            <div class="dropdown mt-3">
              <button
                class="dropdown-toggle custom-dropdown-toggle"
                type="button"
                aria-expanded="false"
              >
                Danh mục
              </button>
              <ul class="dropdown-menu">
                <li
                  class="dropdown-item-parent"
                  v-for="parent in parentCategory"
                  :key="parent._id"
                >
                  <a
                    class="dropdown-item"
                    href="#"
                    @click.prevent="navigateToCategory(parent.cate_name)"
                  >
                    <span>{{ parent.cate_name }}</span>
                    <i
                      v-if="
                        childrenMap[parent._id] &&
                        childrenMap[parent._id].length
                      "
                      class="fas fa-angle-right"
                    ></i>
                  </a>
                  <ul
                    class="dropdown-menu-child"
                    v-if="
                      childrenMap[parent._id] && childrenMap[parent._id].length
                    "
                  >
                    <li
                      v-for="child in childrenMap[parent._id]"
                      :key="child._id"
                    >
                      <router-link
                        class="dropdown-item"
                        :to="`/categories/${child.cate_name
                          .replace(/\s+/g, '-')
                          .toLowerCase()}`"
                      >
                        {{ child.cate_name }}
                      </router-link>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="navbar-right">
          <div
            ref="searchBar"
            class="search-bar"
            id="search-bar"
            :class="{ 'show-search': searchBarVisible }"
          >
            <div class="search-form">
              <div class="search-tabs">
                <button
                  :class="{ active: searchType === 'text' }"
                  @click="searchByText"
                >
                  Tìm bằng tên
                </button>
                <button
                  :class="{ active: searchType === 'image' }"
                  @click="
                    searchType = 'image';
                    searchQuery = '';
                  "
                >
                  Tìm bằng ảnh
                </button>
                <div class="tab-slider"></div>
              </div>
              <div v-if="searchType === 'text'" class="search-text">
                <input
                  v-model="searchQuery"
                  class="form-control me-2 search-input"
                  type="search"
                  placeholder="Tìm kiếm sản phẩm..."
                  aria-label="Search"
                  @input="searchByText"
                />
                <button class="btn btn-light search-btn" @click="searchByText">
                  <i class="fas fa-search"></i>
                </button>
              </div>
              <div v-else class="search-image">
                <div class="search-url-container">
                  <input
                    v-model="imageUrl"
                    class="form-control me-2 search-input"
                    type="text"
                    placeholder="Nhập URL hình ảnh"
                    @change="searchByImage"
                  />
                  <div
                    class="image-drop-zone"
                    @dragover.prevent="$event.target.classList.add('dragover')"
                    @dragleave="$event.target.classList.remove('dragover')"
                    @drop="handleImageDrop"
                    @click="$refs.fileInput.click()"
                  >
                    <div class="file-input">
                      <i class="fas fa-image mt-2"></i>
                      <input
                        ref="fileInput"
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        style="display: none"
                        @change="handleImageSelect"
                      />
                    </div>
                  </div>
                  <button
                    class="btn btn-light search-btn"
                    @click="searchByImage"
                  >
                    <i class="fas fa-search"></i>
                  </button>
                </div>
              </div>
              <div class="image-container">
                <img
                  v-if="previewImage"
                  :src="previewImage"
                  class="preview-image"
                  alt="Xem trước"
                /><button
                  v-if="previewImage"
                  class="btn btn-light search-btn"
                  @click="clearImageInput"
                >
                  <i class="fas fa-remove rmv-btn"></i>
                </button>
              </div>
            </div>
            <i ref="closeBtn" class="close-btn fas fa-times"></i>
            <div
              v-if="searchType === 'text' && searchQuery.trim()"
              class="search-results"
            >
              <router-link
                v-for="product in filteredProducts"
                :key="product._id"
                :to="`/product/${product._id}`"
                class="search-result-item"
                @click="searchBarVisible = false"
              >
                <img
                  :src="product.image"
                  :alt="product.name"
                  class="result-image"
                  @error="product.image = NoImage"
                />
                <span class="result-name">
                  <b>{{ product.name }}</b> <br />
                  <small
                    >Thương hiệu: {{ product.brand || "Không xác định" }}, Danh
                    mục: {{ product.category || "Không xác định" }}</small
                  >
                </span>
              </router-link>
              <p v-if="!filteredProducts.length" class="no-results">
                Không tìm thấy sản phẩm cần tìm
              </p>
            </div>
            <div
              v-if="searchType === 'image' && (imageFile || imageUrl)"
              class="search-results"
            >
              <div
                v-for="result in imageSearchResults"
                :key="result.id"
                class="search-result-item"
                @click.prevent="navigateToProduct(result.id)"
              >
                <img
                  :src="result.image"
                  :alt="result.name"
                  class="result-image"
                  @error="result.image = NoImage"
                />
                <span class="result-name">
                  <b>{{ result.name }}</b> <br />
                  <small
                    >Thương hiệu: {{ result.brand || "Không xác định" }}, Danh
                    mục: {{ result.category || "Không xác định" }}</small
                  >
                </span>
              </div>
              <p
                v-if="!imageSearchResults.length && (imageFile || imageUrl)"
                class="no-results"
              >
                Không tìm thấy sản phẩm cần tìm
              </p>
            </div>
          </div>
          <button
            ref="searchToggleBtn"
            class="search-toggle-btn"
            title="Tìm kiếm"
          >
            <i class="fas fa-search"></i>
            <span class="d-none d-md-inline ms-2"></span>
          </button>
          <router-link to="/cart" class="cart-btn" title="Giỏ hàng">
            <i class="fas fa-shopping-cart"></i>
            <span class="d-none d-md-inline"></span>
          </router-link>
          <div>
            <router-link
              v-if="!userState.isLoggedIn"
              to="/login-account"
              class="login-btn"
              title="Tài khoản"
            >
              <i class="fas fa-user me-1"></i>
              Đăng nhập
            </router-link>
            <div v-else class="dropdown login-dropdown">
              <button
                class="login-btn custom-dropdown-toggle"
                type="button"
                title="Tài khoản"
              >
                <i class="fas fa-user me-1"></i>
                {{ userState.name }}
              </button>
              <ul class="dropdown-menu login-dropdown-menu">
                <li>
                  <router-link class="dropdown-item" to="/user/account-info">
                    Tài khoản
                  </router-link>
                </li>
                <li>
                  <a class="dropdown-item logout" @click="handleLogout">
                    Đăng xuất
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>
<style scoped>
.navbar {
  background-color: white;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-img {
  width: 150px;
  height: 50px;
  object-fit: contain;
}

.logo-img-offcanvas {
  width: 120px;
  height: 40px;
  object-fit: contain;
}

.login-btn {
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 18px;
  text-decoration: none;
  padding: 8px 20px;
  margin: 0 5px;
  color: black;
}

.login-btn:hover {
  color: #6399a9;
}

.cart-btn {
  background: none;
  border: none;
  color: black;
  font-size: 18px;
  padding: 5px;
  margin: 0 5px;
  transition: color 0.3s;
}

.cart-btn:hover {
  color: #6399a9;
}

.offcanvas-toggle {
  display: none;
  background: none;
  border: none;
  color: black;
  font-size: 18px;
  padding: 5px;
  margin-left: 10px;
  transition: color 0.3s;
  order: -1;
}

.offcanvas-toggle.show {
  display: inline-block;
}

.navbar-right {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1001;
}

.offcanvas-link,
.custom-dropdown-toggle {
  display: inline-block;
  padding: 10px 15px;
  color: black;
  text-decoration: none;
  line-height: 1.5;
  vertical-align: middle;
  font-size: 18px;
}

.custom-dropdown-toggle {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}

.custom-dropdown-toggle:hover,
.offcanvas-link:hover {
  color: #6399a9;
}

.dropdown-menu {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 150px;
  display: none;
  flex-direction: column;
  min-width: max-content;
  background-color: #fff;
  z-index: 1000;
  transition: transform 0.5s ease, opacity 0.3s ease;
}

.dropdown-menu:hover {
  transform: scale(1.03);
}

.dropdown-menu.show-submenu {
  display: block;
  opacity: 1;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  align-items: center;
  padding: 8px 15px;
  color: black;
  width: auto;
  white-space: nowrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.dropdown-item span {
  margin-right: 10px;
  flex-grow: 0;
}

.dropdown-item i {
  flex-shrink: 0;
}

.dropdown-item:hover {
  background-color: #6399a9;
  color: white;
}

.dropdown-menu-child {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: 0;
  padding-left: 0;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: white;
  display: none;
  z-index: 1000;
  height: 500px;
  overflow-y: auto;
}

.dropdown-menu-child.show-submenu {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.dropdown-menu-child li {
  list-style: none;
}

.dropdown-item.logout:hover {
  background-color: red;
  color: white;
}

.search-toggle-btn {
  background: none;
  border: none;
  color: black;
  font-size: 18px;
  padding: 5px;
  margin: 0 10px;
  justify-content: center;
  transition: color 0.3s;
}

.search-toggle-btn:hover {
  color: #6399a9;
}

.search-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1100;
  background-color: #14298f1a;
  backdrop-filter: blur(24px);
  padding: 1rem 1.5rem 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s;
}

.search-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-inline: 0;
  border-radius: 10px;
  transform: translateY(-1rem);
  transition: transform 0.4s;
  width: 100%;
  max-width: 1140px;
  margin: 0 auto;
}

.search-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
}

.search-tabs button {
  padding: 8px 16px;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  border-radius: 5px;
  position: relative;
  z-index: 1;
  transition: color 0.3s;
}

.search-tabs button.active {
  background: #6399a9;
  color: white;
}

.search-tabs .slider {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: #6399a9;
  transition: transform 0.3s ease;
  width: 50%;
  transform: translateX(0);
}

.search-tabs button:nth-child(2).active ~ .slider {
  transform: translateX(100%);
}

.search-url-container {
  display: flex;
  width: 100%;
  background-color: white;
  border-radius: 5px;
}

.search-url-container .search-input {
  border: none;
}

.search-url-container .search-btn {
  padding: 0.5rem 1rem;
}

.search-text,
.search-image {
  display: flex;
  width: 100%;
  column-gap: 0.5rem;
}

.search-image .file-input {
  padding: 1rem;
  border-radius: 5px;
  font-size: 18px;
}

.search-image .file-input:hover {
  color: #6399a9;
  transition: color 0.3s;
}

.search-input {
  width: 100%;
  max-width: 1140px;
  padding-block: 1rem;
  background-color: white;
  color: var(--text-color);
}

.search-input::placeholder {
  color: var(--text-color);
}

.search-btn {
  background: none;
  border: none;
  color: black;
  font-size: 18px;
  padding: 5px;
  transition: color 0.3s;
}

.search-btn:hover {
  background-color: inherit;
  color: #6399a9;
}

.show-search {
  opacity: 1;
  pointer-events: initial;
}

.show-search .search-form {
  transform: translateY(0);
}

.close-btn {
  position: absolute;
  top: 2rem;
  right: 2rem;
  font-size: 20px;
  color: var(--text-color);
  cursor: pointer;
}

.close-btn:hover {
  color: #6399a9;
}

.search-results {
  display: block;
  padding: 1rem;
  background-color: white;
  border-radius: 10px;
  width: 100%;
  max-width: 1140px;
  height: 60%;
  margin: 1rem auto;
  box-sizing: border-box;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  transition: transform 0.2s ease;
  cursor: pointer;
}

.search-result-item:hover {
  transform: scale(1.01);
}

.result-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-right: 10px;
}

.result-name {
  font-size: 17px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex-grow: 1;
}

.no-results {
  color: #666;
  font-size: 16px;
  text-align: center;
  padding: 5px;
  width: 100%;
}

.image-drop-box {
  border: 2px dashed #ccc;
  padding: 10px;
  margin-bottom: 10px;
  text-align: center;
  cursor: pointer;
  background-color: #f9f9f9;
}

.image-drop-box.dragover {
  background-color: #e0e0f0;
}

.preview-image {
  width: 100%;
  max-width: 150px;
  max-height: 200px;
  object-fit: contain;
  padding: 1rem;
}

.image-container {
  background-color: white;
  border-radius: 10px;
  margin: 15px 0 0;
  position: relative;
}

.image-container .rmv-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .dropdown-menu {
    display: block;
    width: 100%;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    border-left: 1px solid #ccc;
  }

  .dropdown-menu-child {
    display: 90px;
    position: static;
    margin: 0 auto;
    width: auto;
    background-color: #f8f9f0;
    padding-bottom: 5px;
    border-radius: 0px;
  }

  .search-results {
    display: 100%;
    width: auto;
    padding: 0.5rem;
    margin: 0 auto;
    height: auto;
  }

  .search-result {
    padding: 5px;
    margin-bottom: 0px;
  }

  .result-image {
    width: 60px;
    height: 60px;
    margin-right: 5px;
  }

  .result-name {
    font-size: 12px;
  }
}

@media (min-width: 1267px) {
  .search-form {
    transform: translateY(0);
    padding: 0 3rem 0 0;
  }
}
</style>
