<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import userService from "../services/user";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import { onMounted, onUnmounted } from "vue";
import { loginUserSession } from "@/stores/userState";

export default {
  components: { Form, Field, ErrorMessage },
  setup() {
    const queryClient = useQueryClient();
    const message = ref(null);
    const router = useRouter();
    const isLogin = ref(true);

    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push({ name: "login-account" });
        return;
      }

      try {
        const response = await userService.getUserProfile(token);
        console.log("User info:", response);
        const { c_name, c_role } = response;

        if (!c_name || !c_role) {
          throw new Error("Invalid user data");
        }

        loginUserSession(c_name, token);
        router.push({ name: c_role === "admin" ? "admin-dashboard" : "shop" });
      } catch (error) {
        console.error("CheckAuth error:", error.message);
        localStorage.removeItem("token");
        router.push({ name: "login-account" });
      }
    };

    onMounted(() => {
      checkAuth();
    });
    const account = ref({
      c_name: "",
      c_phone: "",
      c_email: "",
      c_address: "",
      c_password: "",
    });

    const loginInfo = ref({
      c_email: "",
      c_password: "",
    });

    const validationSchema = toTypedSchema(
      z.object({
        c_name: z
          .string()
          .min(2, { message: "Name must be at least 2 characters." }),
        c_address: z
          .string()
          .min(5, { message: "Address must be at least 5 characters." }),
        c_phone: z.string().regex(/^[0-9]{10}$/, {
          message: "It must be 10 digits and start with 0.",
        }),
        c_email: z.string().email({ message: "Please enter a valid email." }),
        c_password: z
          .string()
          .min(6, { message: "Password must be at least 6 characters." }),
      })
    );

    const loginSchema = toTypedSchema(
      z.object({
        c_email: z.string().email({ message: "Please enter a valid email." }),
        c_password: z
          .string()
          .min(6, { message: "Password must be at least 6 characters." }),
      })
    );

    const registerMutation = useMutation({
      mutationFn: async (user) => {
        const response = await userService.registerUser(user);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        const confirmSuccess = confirm("Đăng ký thành công!");
        if (confirmSuccess) {
          router.push({ name: "login-account" });
        }
      },
      onError: (error) => {
        message.value = error.message;
      },
    });

    const loginMutation = useMutation({
      mutationFn: async (credentials) => {
        const response = await userService.loginUser(credentials);
        return response;
      },
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.c_role);
        loginUserSession(data.user.c_name, data.token);
        const role = data.user?.c_role;
        if (role === "admin") {
          router.replace({ name: "admin-dashboard" });
        } else {
          router.replace({ name: "shop" });
        }
        localStorage.setItem("token", data.token);
        loginUserSession(data.user.c_name, data.token);
      },
      onError: (error) => {
        message.value = error.message;
      },
    });

    function register() {
      message.value = null;
      registerMutation.mutate(account.value);
    }

    function login() {
      message.value = null;
      loginMutation.mutate(loginInfo.value);
    }

    const windowWidth = ref(window.innerWidth);

    onMounted(() => {
      const updateWidth = () => (windowWidth.value = window.innerWidth);
      window.addEventListener("resize", updateWidth);
      updateWidth();

      onUnmounted(() => {
        window.removeEventListener("resize", updateWidth);
      });
    });
    return {
      account,
      loginInfo,
      isLogin,
      validationSchema,
      loginSchema,
      register,
      login,
      windowWidth,
    };
  },
};
</script>

<template>
  <div class="login-container d-flex justify-content-center align-items-center">
    <div class="layout-wrapper shadow-lg rounded-5">
      <div
        class="col-md-6 col-12 bg-dark text-white d-flex flex-column justify-content-center align-items-center p-3 dark-part"
        :class="{ 'rounded-0': windowWidth < 768 }"
      >
        <h2 class="fw-bold mb-3">Chào mừng bạn trở lại!</h2>
        <p class="text-center">
          Siêu thị trực tuyến <br />
          Nơi bạn có thể tìm kiếm những sản phẩm thích hợp cho cuộc sống của bạn
        </p>
        <span class="mt-4" v-if="isLogin">Bạn chưa có tài khoản?</span>
        <span class="mt-4" v-else>Bạn đã có tài khoản?</span>
        <button
          class="btn btn-light text-dark mt-2 px-4 py-2 fw-bold rounded-pill"
          @click="isLogin = !isLogin"
        >
          {{ isLogin ? "Đăng ký" : "Đăng nhập" }}
        </button>
      </div>

      <div class="col-md-6 col-12 bg-white p-5 position-relative">
        <transition name="slide-custom" mode="out-in">
          <div
            v-if="isLogin"
            key="login"
            class="form-section d-flex flex-column align-items-center"
          >
            <img
              src="@/assets/images/logo.png"
              alt="Logo"
              class="mb-3"
              style="width: 200px; height: 100px"
            />
            <h4 class="fw-bold mb-4">Đăng nhập</h4>
            <input
              v-model="loginInfo.c_email"
              type="text"
              placeholder="Email"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <input
              v-model="loginInfo.c_password"
              type="password"
              placeholder="Mật khẩu"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <button
              @click="login"
              class="btn btn-dark text-white w-50 py-2 fw-bold rounded-pill"
            >
              Đăng nhập
            </button>
          </div>

          <div
            v-else
            key="register"
            class="form-section d-flex flex-column align-items-center"
          >
            <h4 class="fw-bold mb-4">Đăng ký</h4>
            <input
              v-model="account.c_name"
              type="text"
              placeholder="Họ tên"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <input
              v-model="account.c_phone"
              type="text"
              placeholder="Số điện thoại"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <input
              v-model="account.c_email"
              type="email"
              placeholder="Email"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <input
              v-model="account.c_password"
              type="password"
              placeholder="Mật khẩu"
              class="form-control mb-3 rounded-3 py-2 px-3 bg-light"
            />
            <button
              @click="register"
              class="btn btn-dark text-white w-50 py-2 fw-bold rounded-pill mb-2"
            >
              Đăng ký
            </button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
}

.layout-wrapper {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 900px;
  max-height: 500px;
}

.dark-part {
  padding: 30px;
  text-align: center;
}

.col-md-6 {
  height: 100%;
}

.bg-dark,
.bg-white {
  min-height: 500px;
}

@media (min-width: 768px) {
  .dark-part {
    border-top-right-radius: 100px;
    border-bottom-right-radius: 100px;
  }

  .bg-white {
    overflow: hidden;
  }
}

@media (max-width: 767px) {
  .layout-wrapper {
    flex-direction: column;
    max-height: none;
  }

  .dark-part {
    border-radius: 0;
    min-height: 300px;
    order: 2;
  }

  .bg-white {
    min-height: 350px;
    order: 1;
  }

  .login-container {
    padding: 10px;
  }
}

.slide-custom-enter-active,
.slide-custom-leave-active {
  transition: all 0.4s ease;
}

.slide-custom-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-custom-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

body {
  font-family: "Roboto", sans-serif;
}

.form-section {
  width: 100%;
}

input.form-control {
  width: 100%;
  max-width: 300px;
}
</style>
