<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import userService from "@/services/user.js";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import Swal from "sweetalert2";

const route = useRoute();
const router = useRouter();

const userInfo = ref({
  fullName: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
});

const isEditing = ref(false);
const showPasswordPopup = ref(false);
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const dateError = ref("");

const originalUserInfo = ref({ ...userInfo.value });

const formatDateToDisplay = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseDateToISO = (displayDate) => {
  if (!displayDate) return "";
  const [day, month, year] = displayDate.split("/");
  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year))
    return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const formattedBirthDate = computed({
  get() {
    return formatDateToDisplay(userInfo.value.birthDate);
  },
  set(value) {
    userInfo.value.birthDate = parseDateToISO(value);
  },
});

const validateDateInput = (dateStr) => {
  if (!dateStr) {
    dateError.value = "";
    return;
  }
  const [day, month, year] = dateStr.split("/");
  const date = new Date(`${year}-${month}-${day}`);
  const minDate = new Date("1800-01-01");
  const maxDate = new Date();

  if (
    isNaN(date.getTime()) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1800 ||
    date < minDate ||
    date > maxDate
  ) {
    dateError.value =
      "Ngày sinh không hợp lệ! Vui lòng chọn ngày từ 01/01/1800 đến nay.";
    formattedBirthDate.value = "";
  } else {
    dateError.value = "";
  }
};

async function fetchUserInfo() {
  try {
    const data = await userService.getUserProfile();
    const user = data.user;
    userInfo.value = {
      fullName: user.c_name || "",
      phone: user.c_phone || "",
      email: user.c_email || "",
      address: user.c_address || "",
      birthDate: user.c_date
        ? new Date(user.c_date).toISOString().split("T")[0]
        : "",
    };
    originalUserInfo.value = { ...userInfo.value };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
  }
}

function cancelResetPassword() {
  showPasswordPopup.value = false;
  oldPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

async function resetPassword() {
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu!",
    });
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Mật khẩu mới và xác nhận mật khẩu không khớp!",
    });
    return;
  }
  if (newPassword.value.length < 6) {
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Mật khẩu mới phải có ít nhất 6 ký tự!",
    });
    return;
  }

  try {
    await userService.resetPassword({
      c_email: userInfo.value.email,
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });
    Swal.fire({
      icon: "success",
      title: "Thành công",
      text: "Mật khẩu đã được đổi thành công!",
      timer: 1500,
      showConfirmButton: false,
    });
    showPasswordPopup.value = false;
    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Mật khẩu cũ không đúng. Vui lòng nhập lại.",
    });
  }
}

async function saveInfo() {
  if (
    JSON.stringify(userInfo.value) === JSON.stringify(originalUserInfo.value)
  ) {
    Swal.fire({
      icon: "info",
      title: "Thông báo",
      text: "Không có thay đổi để lưu!",
    });
    return;
  }

  if (userInfo.value.phone && !/^[0-9]{10}$/.test(userInfo.value.phone)) {
    alert("Số điện thoại phải có 10 chữ số!");
    return;
  }
  if (!userInfo.value.fullName || userInfo.value.fullName.trim().length < 2) {
    alert("Họ tên phải có ít nhất 2 ký tự!");
    return;
  }
  if (dateError.value) {
    alert("Vui lòng chọn ngày sinh hợp lệ!");
    return;
  }

  try {
    const updateData = {
      c_name: userInfo.value.fullName,
      c_phone: userInfo.value.phone,
      c_address: userInfo.value.address,
      c_date: userInfo.value.birthDate
        ? new Date(userInfo.value.birthDate)
        : null,
    };

    await userService.updateUser(updateData);
    isEditing.value = false;
    originalUserInfo.value = { ...userInfo.value };
    Swal.fire({
      icon: "success",
      title: "Thành công",
      text: "Thông tin đã được lưu thành công!",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Lỗi khi lưu thông tin:", error);
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Không thể lưu thông tin: " + error.message,
    });
    if (
      error.message.includes("Token không hợp lệ") ||
      error.message.includes("Không tìm thấy token")
    ) {
      router.push("/login-account");
    }
  }
}

onMounted(() => {
  if (route.name === "user-account-info" || route.name === "user-default") {
    fetchUserInfo();
    flatpickr(".birth-date-input", {
      dateFormat: "d/m/Y",
      allowInput: false,
      disableMobile: true,
    });
  }
});
</script>

<template>
  <div
    class="tab-content"
    v-if="route.name === 'user-account-info' || route.name === 'user-default'"
  >
    <h2>Thông tin tài khoản</h2>
    <div class="info-row">
      <label>Họ tên:</label>
      <input
        type="text"
        v-model="userInfo.fullName"
        :readonly="!isEditing"
        placeholder="Chưa có thông tin"
        class="form-control"
      />
    </div>
    <div class="info-row">
      <label>Điện thoại:</label>
      <input
        type="text"
        v-model="userInfo.phone"
        :readonly="!isEditing"
        placeholder="Chưa có thông tin"
        class="form-control"
      />
    </div>
    <div class="info-row">
      <label>Email:</label>
      <input
        type="email"
        v-model="userInfo.email"
        :readonly="true"
        placeholder="Chưa có thông tin"
        class="form-control no-cursor"
      />
    </div>
    <div class="info-row">
      <label>Địa chỉ:</label>
      <input
        type="text"
        v-model="userInfo.address"
        :readonly="!isEditing"
        placeholder="Chưa có thông tin"
        class="form-control"
      />
    </div>
    <div class="info-row date-input-wrapper">
      <label>Ngày sinh:</label>
      <input
        type="text"
        v-model="formattedBirthDate"
        :readonly="true"
        placeholder="DD/MM/YYYY"
        class="form-control birth-date-input"
      />
      <span v-if="dateError" class="error-message">{{ dateError }}</span>
    </div>
    <div class="info-row">
      <label>Mật khẩu:</label>
      <div class="password-field">
        <button
          class="change-password-btn fas fa-edit"
          @click="showPasswordPopup = true"
        ></button>
      </div>
    </div>
    <div class="action-buttons">
      <button v-if="!isEditing" class="edit-btn" @click="isEditing = true">
        Chỉnh sửa
      </button>
      <button v-if="isEditing" class="save-btn" @click="saveInfo">Lưu</button>
    </div>
    <div class="password-popup" v-if="showPasswordPopup">
      <div class="popup-content">
        <h3>Đổi mật khẩu</h3>
        <div class="info-row-password">
          <label>Mật khẩu cũ:</label>
          <div class="password-input">
            <input
              :type="showOldPassword ? 'text' : 'password'"
              v-model="oldPassword"
              placeholder="Nhập mật khẩu cũ"
              class="form-control no-reveal"
            />
            <button
              class="toggle-password-btn"
              @click="showOldPassword = !showOldPassword"
              title="Ẩn/Hiện mật khẩu"
            >
              <i
                :class="showOldPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
              ></i>
            </button>
          </div>
        </div>
        <div class="info-row-password">
          <label>Mật khẩu mới:</label>
          <div class="password-input">
            <input
              :type="showNewPassword ? 'text' : 'password'"
              v-model="newPassword"
              placeholder="Nhập mật khẩu mới"
              class="form-control no-reveal"
            />
            <button
              class="toggle-password-btn"
              @click="showNewPassword = !showNewPassword"
              title="Ẩn/Hiện mật khẩu"
            >
              <i
                :class="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
              ></i>
            </button>
          </div>
        </div>
        <div class="info-row-password">
          <label>Xác nhận mật khẩu:</label>
          <div class="password-input">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="confirmPassword"
              placeholder="Nhập xác nhận mật khẩu"
              class="form-control no-reveal"
            />
            <button
              class="toggle-password-btn"
              @click="showConfirmPassword = !showConfirmPassword"
              title="Ẩn/Hiện mật khẩu"
            >
              <i
                :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
              ></i>
            </button>
          </div>
        </div>
        <div class="popup-buttons">
          <button class="cancel-btn" @click="cancelResetPassword">Hủy</button>
          <button class="confirm-btn" @click="resetPassword">Xác nhận</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 20px;
  font-size: 20px;
  color: #333;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.info-row label {
  width: 140px;
  font-weight: bold;
  font-size: 16px;
}

.info-row input {
  flex: 1;
  padding: 8px;
  border-radius: 5px;
  font-size: 16px;
}

.info-row input:read-only {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  cursor: pointer;
}

.info-row .no-cursor {
  cursor: default;
  caret-color: transparent;
  user-select: none;
}

.info-row .no-cursor:focus {
  outline: none;
}

.date-input-wrapper {
  position: relative;
}

.birth-date-input {
  padding-right: 30px;
}

.birth-date-input + .flatpickr-calendar {
  z-index: 1000;
}

.date-input-wrapper::after {
  content: "\f073";
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #6399a9;
  pointer-events: none;
}

.error-message {
  color: red;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.info-row-password {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.info-row-password label {
  width: 200px;
  font-weight: bold;
}

.password-field {
  display: flex;
  flex: 1;
  gap: 10px;
}

.change-password-btn {
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.change-password-btn:hover {
  background-color: #507b88;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.edit-btn,
.save-btn {
  background-color: #6399a9;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 16px;
}

.edit-btn:hover,
.save-btn:hover {
  background-color: #507b88;
}

.password-popup {
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
  max-width: 600px;
}

.popup-content h3 {
  margin-bottom: 15px;
  font-weight: bold;
  text-align: center;
}

.password-input {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 5px;
}

.password-input input.no-reveal {
  -webkit-appearance: none;
  appearance: none;
}

.password-input input.no-reveal::-ms-reveal,
.password-input input.no-reveal::-ms-clear,
.password-input input.no-reveal::-webkit-clear-button,
.password-input input.no-reveal::-webkit-reveal {
  display: none;
}

.toggle-password-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6399a9;
  font-size: 16px;
  padding: 5px;
  transition: color 0.3s ease;
}

.toggle-password-btn:hover {
  color: #507b88;
}

.popup-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.cancel-btn,
.confirm-btn {
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-btn {
  background-color: #d4575d;
  color: white;
}

.cancel-btn:hover {
  background-color: #b82c32;
}

.confirm-btn {
  background-color: #28a745;
  color: white;
}

.confirm-btn:hover {
  background-color: #218838;
}
</style>
