<script setup>
import { useRouter } from "vue-router";
import LogoImage from "@/assets/images/logo.png";
import { userState, logoutUserSession } from "@/stores/userState";
import { ref, onMounted, onUnmounted } from "vue";

const router = useRouter();
const isDropdownOpen = ref(false);

const handleLogout = () => {
  logoutUserSession();
  router.push("/login-account");
};

onMounted(() => {
  const dropdown = document.querySelector(".login-dropdown");
  if (dropdown) {
    const dropdownMenu = dropdown.querySelector(".dropdown-menu");
    dropdown.addEventListener("mouseenter", () => {
      isDropdownOpen.value = true;
      dropdownMenu.classList.add("show");
    });
    dropdown.addEventListener("mouseleave", () => {
      if (
        !dropdownMenu.classList.contains("show") ||
        !dropdown.classList.contains("show")
      ) {
        isDropdownOpen.value = false;
        dropdownMenu.classList.remove("show");
      }
    });
    dropdown.addEventListener("click", (e) => {
      if (e.target.closest(".custom-dropdown-toggle")) {
        isDropdownOpen.value = !isDropdownOpen.value;
      }
    });
  }
});

onUnmounted(() => {
  const dropdown = document.querySelector(".login-dropdown");
  if (dropdown) {
    dropdown.removeEventListener("mouseenter", () => {});
    dropdown.removeEventListener("mouseleave", () => {});
    dropdown.removeEventListener("click", () => {});
  }
});
</script>

<template>
  <div class="app-container">
    <nav class="navbar navbar-expand-lg fixed-top">
      <div class="container-fluid container">
        <span class="navbar-brand me-auto">
          <img :src="LogoImage" alt="Logo" class="logo-img" />
        </span>

        <div class="navbar-right">
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
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="fas fa-user me-1"></i>
              {{ userState.name }}
            </button>
            <ul class="dropdown-menu">
              <li>
                <a class="dropdown-item" @click.prevent="handleLogout">
                  Đăng xuất
                </a>
              </li>
            </ul>
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

.login-btn {
  background: none;
  border: none;
  border-radius: 50px;
  font-size: 18px;
  text-decoration: none;
  padding: 8px 20px;
  margin: 0 5px;
  cursor: pointer;
  color: black;
}

.login-btn:hover {
  color: #6399a9;
}

.navbar-right {
  display: flex;
  align-items: center;
}

.dropdown-menu {
  display: block;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  cursor: pointer;
  border: none;
}

.dropdown-menu.show {
  opacity: 1;
  transform: translateY(0);
}

.dropdown-menu .dropdown-item {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  color: red;
}

.dropdown-menu .dropdown-item:hover {
  border: 1px solid red;
  border-radius: 10px;
  color: white;
  background-color: red;
  transition: all 0.3s ease;
}
</style>
