<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

const vouchers = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const itemsPerPage = 5;
const editVoucherId = ref(null);
const showEditOverlay = ref(false);
let createdAtPicker,
  expiryDatePicker,
  editCreatedAtPicker,
  editExpiryDatePicker;

const addForm = ref({
  code: "",
  price: "",
  description: "",
  quantity: "",
  createdAt: "",
  expiryDate: "",
});
const editForm = ref({});

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));

const paginatedVouchers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return vouchers.value.slice(start, end);
});

const visiblePages = computed(() => {
  const maxPages = 5;
  const total = totalPages.value;
  const current = currentPage.value;
  const pages = [];

  if (total <= maxPages) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let startPage = Math.max(1, current - Math.floor(maxPages / 2));
  let endPage = startPage + maxPages - 1;

  if (endPage > total) {
    endPage = total;
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push("...");
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < total) {
    if (endPage < total - 1) pages.push("...");
    pages.push(total);
  }

  return pages;
});

const setPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseDateToISO = (ddmmyyyy) => {
  if (!ddmmyyyy) return null;
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

const getVietnamDate = () => {
  const now = new Date();
  const offset = 7 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vietnamDate = new Date(utc + offset * 60000);
  vietnamDate.setHours(0, 0, 0, 0);
  return vietnamDate;
};

const validateQuantity = (value) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0;
};

const validateCreatedAt = (date) => {
  if (!date) return false;
  const today = getVietnamDate();
  const created = new Date(parseDateToISO(date));
  created.setHours(0, 0, 0, 0);
  return created <= today;
};

const validateExpiryDate = (createdAt, expiryDate) => {
  if (!createdAt || !expiryDate) return false;
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(createdAt) || !dateRegex.test(expiryDate)) return false;
  const created = new Date(parseDateToISO(createdAt));
  const expiry = new Date(parseDateToISO(expiryDate));
  return expiry >= created;
};

const getVoucherStatus = (expiryDate) => {
  const today = getVietnamDate();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (expiry < today) {
    return { text: "Hết hạn", color: "red" };
  } else if (diffDays <= 3) {
    return { text: "Sắp hết hạn", color: "orange" };
  } else {
    return { text: "Còn hạn", color: "green" };
  }
};

const getToken = () => localStorage.getItem("token");

const fetchVouchers = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/voucher", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy danh sách voucher");
    const data = await response.json();
    vouchers.value = data.map((voucher) => {
      const createdAt = new Date(voucher.v_create_date).toISOString();
      const expiryDate = new Date(voucher.v_expiry_date).toISOString();
      return {
        id: voucher._id,
        code: voucher.v_name,
        price: voucher.v_price,
        description: voucher.v_description,
        quantity: voucher.v_stock_quantity,
        createdAt,
        expiryDate,
        status: getVoucherStatus(expiryDate),
      };
    });
    totalItems.value = vouchers.value.length;
  } catch (error) {
    console.error("Lỗi khi lấy voucher:", error);
    alert("Không thể tải danh sách voucher: " + error.message);
    totalItems.value = vouchers.value.length;
  }
};

const handleAddSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const code = form.voucherCode.value.trim();
  const description = form.voucherDescription.value.trim();
  const quantity = form.voucherQuantity.value.trim();
  const price = form.voucherPrice.value.trim();
  const createdAt = form.voucherCreatedAt.value;
  const expiryDate = form.voucherExpiryDate.value;

  if (!code) return alert("Mã khuyến mãi không được để trống!");
  if (!description) return alert("Mô tả không được để trống!");
  if (!validateQuantity(quantity))
    return alert("Số lượng phải là số không âm!");
  if (!validateCreatedAt(createdAt))
    return alert("Thời gian tạo không được muộn hơn ngày hiện tại!");
  if (!validateExpiryDate(createdAt, expiryDate))
    return alert("Thời gian hết hạn phải sau hoặc bằng thời gian tạo!");

  try {
    const response = await fetch("http://localhost:5000/api/voucher/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        v_name: code,
        v_price: price,
        v_description: description,
        v_stock_quantity: parseInt(quantity, 10),
        v_create_date: createdAt,
        v_expiry_date: expiryDate,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể thêm voucher");
    }
    const newVoucher = await response.json();
    vouchers.value.push({
      id: newVoucher._id,
      code: newVoucher.v_name,
      price: newVoucher.v_price,
      description: newVoucher.v_description,
      quantity: newVoucher.v_stock_quantity,
      createdAt: newVoucher.v_create_date,
      expiryDate: newVoucher.v_expiry_date,
      status: getVoucherStatus(newVoucher.v_expiry_date),
    });
    totalItems.value = vouchers.value.length;
    form.reset();
    addForm.value = {
      code: "",
      price: "",
      description: "",
      quantity: "",
      createdAt: "",
      expiryDate: "",
    };
    alert("Thêm voucher thành công!");
  } catch (error) {
    console.error("Lỗi khi thêm voucher:", error);
    alert("Lỗi khi thêm voucher: " + error.message);
  }
};

const openEditForm = (voucher) => {
  editVoucherId.value = voucher.id;
  editForm.value = {
    code: voucher.code,
    price: voucher.price,
    description: voucher.description,
    quantity: voucher.quantity.toString(),
    createdAt: formatDate(voucher.createdAt),
    expiryDate: formatDate(voucher.expiryDate),
  };
  showEditOverlay.value = true;

  editCreatedAtPicker?.destroy();
  editExpiryDatePicker?.destroy();
  editCreatedAtPicker = flatpickr("#editVoucherCreatedAt", {
    dateFormat: "d/m/Y",
    defaultDate: editForm.value.createdAt,
    onChange: (selectedDates, dateStr) => {
      editForm.value.createdAt = dateStr;
    },
  });
  editExpiryDatePicker = flatpickr("#editVoucherExpiryDate", {
    dateFormat: "d/m/Y",
    defaultDate: editForm.value.expiryDate,
    onChange: (selectedDates, dateStr) => {
      editForm.value.expiryDate = dateStr;
    },
  });
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const code = form.editVoucherCode.value.trim();
  const description = form.editVoucherDescription.value.trim();
  const quantity = form.editVoucherQuantity.value.trim();
  const price = form.editVoucherPrice.value.trim();
  const createdAt = form.editVoucherCreatedAt.value;
  const expiryDate = form.editVoucherExpiryDate.value;

  if (!code) return alert("Mã khuyến mãi không được để trống!");
  if (!description) return alert("Mô tả không được để trống!");
  if (!validateQuantity(quantity))
    return alert("Số lượng phải là số không âm!");
  if (!validateCreatedAt(createdAt))
    return alert("Thời gian tạo không được muộn hơn ngày hiện tại!");
  if (!validateExpiryDate(createdAt, expiryDate))
    return alert("Thời gian hết hạn phải sau hoặc bằng thời gian tạo!");

  try {
    const response = await fetch(
      `http://localhost:5000/api/voucher/update/${editVoucherId.value}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          v_name: code,
          v_description: description,
          v_stock_quantity: parseInt(quantity, 10),
          v_price: price,
          v_create_date: createdAt,
          v_expiry_date: expiryDate,
        }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể cập nhật voucher");
    }
    const updatedVoucher = await response.json();
    vouchers.value = vouchers.value.map((voucher) =>
      voucher.id === editVoucherId.value
        ? {
            id: updatedVoucher._id,
            code: updatedVoucher.v_name,
            description: updatedVoucher.v_description,
            quantity: updatedVoucher.v_stock_quantity,
            price: updatedVoucher.v_price,
            createdAt: updatedVoucher.v_create_date,
            expiryDate: updatedVoucher.v_expiry_date,
            status: getVoucherStatus(updatedVoucher.v_expiry_date),
          }
        : voucher
    );
    totalItems.value = vouchers.value.length;
    showEditOverlay.value = false;
    editForm.value = {};
    alert("Cập nhật voucher thành công!");
  } catch (error) {
    console.error("Lỗi khi cập nhật voucher:", error);
    alert("Lỗi khi cập nhật voucher: " + error.message);
  }
};

const closeEditOverlay = () => {
  showEditOverlay.value = false;
  editForm.value = {};
  editCreatedAtPicker?.destroy();
  editExpiryDatePicker?.destroy();
};

const deleteVoucher = async (id) => {
  if (!confirm("Bạn có chắc muốn xóa voucher này?")) return;

  const token = getToken();
  if (!token) return alert("Vui lòng đăng nhập!");

  try {
    const response = await fetch(
      `http://localhost:5000/api/voucher/remove/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể xóa voucher");
    }
    vouchers.value = vouchers.value.filter((v) => v.id !== id);
    totalItems.value = vouchers.value.length;
    alert("Xóa voucher thành công!");
  } catch (error) {
    console.error("Lỗi khi xóa voucher:", error);
    alert("Lỗi khi xóa voucher: " + error.message);
  }
};

onMounted(() => {
  createdAtPicker = flatpickr("#voucherCreatedAt", {
    dateFormat: "d/m/Y",
    onChange: (dateStr) => {
      addForm.value.createdAt = dateStr;
    },
  });
  expiryDatePicker = flatpickr("#voucherExpiryDate", {
    dateFormat: "d/m/Y",
    onChange: (dateStr) => {
      addForm.value.expiryDate = dateStr;
    },
  });

  fetchVouchers();
});

onUnmounted(() => {
  createdAtPicker?.destroy();
  expiryDatePicker?.destroy();
  editCreatedAtPicker?.destroy();
  editExpiryDatePicker?.destroy();
});
</script>

<template>
  <div class="container-fluid voucher-container">
    <div class="header-content">
      <h1 class="header-title">Quản lý khuyến mãi</h1>
    </div>
    <main>
      <form id="addVoucherForm" class="voucher-form" @submit="handleAddSubmit">
        <div class="form-grid">
          <div>
            <label for="voucherCode">Mã khuyến mãi</label>
            <input
              type="text"
              id="voucherCode"
              placeholder="Mã khuyến mãi"
              v-model="addForm.code"
              required
            />
          </div>
          <div>
            <label for="voucherQuantity">Số lượng</label>
            <input
              type="number"
              id="voucherQuantity"
              placeholder="Số lượng"
              v-model="addForm.quantity"
              min="0"
              required
            />
          </div>
          <div class="full-width">
            <label for="voucherPrice">Giá tiền giảm</label>
            <input
              type="number"
              id="voucherPrice"
              placeholder="Giá tiền giảm"
              v-model="addForm.price"
              required
            />
          </div>
          <div class="full-width">
            <label for="voucherDescription">Mô tả</label>
            <input
              type="text"
              id="voucherDescription"
              placeholder="Mô tả"
              v-model="addForm.description"
              required
            />
          </div>
          <div class="date-group">
            <div class="date-input">
              <label for="voucherCreatedAt">Thời gian tạo</label>
              <div class="input-wrapper">
                <input
                  type="text"
                  id="voucherCreatedAt"
                  class="flatpickr"
                  placeholder="dd/mm/yyyy"
                  v-model="addForm.createdAt"
                  autocomplete="off"
                  required
                />
                <span class="material-icons-sharp calendar-icon">event</span>
              </div>
            </div>
            <div class="date-input">
              <label for="voucherExpiryDate">Thời gian hết hạn</label>
              <div class="input-wrapper">
                <input
                  type="text"
                  id="voucherExpiryDate"
                  class="flatpickr"
                  placeholder="dd/mm/yyyy"
                  v-model="addForm.expiryDate"
                  autocomplete="off"
                  required
                />
                <span class="material-icons-sharp calendar-icon">event</span>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" class="create-btn">Thêm</button>
      </form>

      <div
        id="editVoucherOverlay"
        class="overlay"
        :style="{ display: showEditOverlay ? 'flex' : 'none' }"
      >
        <div class="overlay-content">
          <h3>Chỉnh sửa voucher</h3>
          <form
            id="editVoucherForm"
            class="voucher-form"
            @submit="handleEditSubmit"
          >
            <div class="form-grid">
              <div>
                <label for="editVoucherCode">Mã khuyến mãi</label>
                <input
                  type="text"
                  id="editVoucherCode"
                  v-model="editForm.code"
                  required
                />
              </div>
              <div>
                <label for="editVoucherQuantity">Số lượng</label>
                <input
                  type="number"
                  id="editVoucherQuantity"
                  v-model="editForm.quantity"
                  min="0"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editVoucherPrice">Giá tiền giảm</label>
                <input
                  type="number"
                  id="editVoucherPrice"
                  placeholder="Giá tiền giảm"
                  v-model="editForm.price"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editVoucherDescription">Mô tả</label>
                <input
                  type="text"
                  id="editVoucherDescription"
                  v-model="editForm.description"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editVoucherCreatedAt">Thời gian tạo</label>
                <input
                  type="text"
                  id="editVoucherCreatedAt"
                  class="flatpickr"
                  placeholder="dd/mm/yyyy"
                  v-model="editForm.createdAt"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editVoucherExpiryDate">Thời gian hết hạn</label>
                <input
                  type="text"
                  id="editVoucherExpiryDate"
                  class="flatpickr"
                  placeholder="dd/mm/yyyy"
                  v-model="editForm.expiryDate"
                  required
                />
              </div>
            </div>
            <div class="overlay-buttons">
              <button type="submit">Cập nhật</button>
              <button type="button" @click="closeEditOverlay">Đóng</button>
            </div>
          </form>
        </div>
      </div>
      <table id="voucherTable">
        <thead>
          <tr>
            <th class="col-code">Tên mã</th>
            <th class="col-price">Giá tiền</th>
            <th class="col-description">Mô tả</th>
            <th class="col-quantity">Số lượng</th>
            <th class="col-created">Thời gian tạo</th>
            <th class="col-expiry">Thời gian hết hạn</th>
            <th class="col-status">Trạng thái</th>
            <th class="col-action">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="voucher in paginatedVouchers" :key="voucher.id">
            <td>{{ voucher.code }}</td>
            <td>{{ voucher.price }}</td>
            <td class="description">{{ voucher.description }}</td>
            <td>{{ voucher.quantity }}</td>
            <td>{{ formatDate(voucher.createdAt) }}</td>
            <td>{{ formatDate(voucher.expiryDate) }}</td>
            <td :style="{ color: voucher.status.color }">
              {{ voucher.status.text }}
            </td>
            <td>
              <button class="edit-btn" @click="openEditForm(voucher)">
                <span class="material-icons-sharp">edit</span>
              </button>
              <button class="delete-btn" @click="deleteVoucher(voucher.id)">
                <span class="material-icons-sharp">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button
          id="prevPage"
          class="pagination-btn"
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
        >
          Trước
        </button>
        <span id="pageNumbers" class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            :class="{ active: currentPage === page }"
            @click="setPage(page)"
          >
            {{ page }}
          </button>
        </span>
        <button
          id="nextPage"
          class="pagination-btn"
          :disabled="currentPage === totalPages"
          @click="setPage(currentPage + 1)"
        >
          Sau
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.voucher-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.voucher-container .header-title {
  text-align: center;
  font-weight: bold;
}

.voucher-form {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.date-group {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.date-input {
  position: relative;
}

.input-wrapper {
  position: relative;
}

.calendar-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #6399a9;
  font-size: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid .full-width {
  grid-column: span 2;
}

.form-grid label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 6px;
  color: #212529;
}

.form-grid input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  color: #212529;
  background: #f8f9fa;
  transition: border-color 0.3s ease;
}

.form-grid input:focus {
  border-color: #6399a9;
  outline: none;
  box-shadow: 0 0 5px rgba(99, 153, 169, 0.2);
}

.form-grid input[type="number"] {
  -moz-appearance: textfield;
}

.form-grid input::-webkit-outer-spin-button,
.form-grid input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.create-btn {
  margin: 20px auto 0;
  border-radius: 10px;
  color: white;
  background-color: #6399a9;
  width: 120px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.create-btn:hover {
  background-color: #527b8a;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.overlay-content {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
}

.overlay-buttons {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.overlay-buttons button {
  flex: 1;
  padding: 12px;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.overlay-buttons button[type="submit"] {
  background: #6399a9;
  color: #ffffff;
  border: none;
}

.overlay-buttons button[type="submit"]:hover {
  background: #527b8a;
}

.overlay-buttons button[type="button"] {
  background: #f8f9fa;
  color: #212529;
  border: 1px solid #ddd;
}

.overlay-buttons button[type="button"]:hover {
  background: #e9ecef;
}

#voucherTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

#voucherTable th,
#voucherTable td {
  padding: 12px;
  text-align: center;
  min-width: 60px;
  border-bottom: 1px solid #ddd;
}

#voucherTable th {
  background: #6399a9;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
}

#voucherTable tr:nth-child(even) {
  background: #f8f9fa;
}

#voucherTable tr:hover {
  background: #e9ecef;
}

#voucherTable .description {
  text-align: left;
}

.col-code {
  width: 15%;
}

.col-price {
  width: 15%;
}

.col-description {
  width: 25%;
}

.col-quantity {
  width: 10%;
}

.col-created {
  width: 15%;
}

.col-expiry {
  width: 15%;
}

.col-status {
  width: 15%;
}

.col-action {
  width: 15%;
}

.edit-btn,
.delete-btn {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: #ffffff;
  color: #212529;
  margin: 0 4px;
}

.edit-btn:hover {
  background: #6399a9;
  color: #ffffff;
  border-color: #6399a9;
}

.delete-btn:hover {
  background: #dc3545;
  color: #ffffff;
  border-color: #dc3545;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: #ffffff;
  color: black;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-btn:hover {
  background: #e9ecef;
}

.pagination-btn:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.page-numbers {
  font-size: 1rem;
  color: #212529;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-numbers button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-numbers button:hover {
  background: #e9ecef;
}

.page-numbers button.active {
  background: #6399a9;
  color: #ffffff;
  border-color: #6399a9;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid .full-width {
    grid-column: span 1;
  }

  .create-btn {
    width: 100%;
  }

  #voucherTable {
    table-layout: auto;
  }

  #voucherTable th,
  #voucherTable td {
    min-width: 80px;
  }

  .col-code,
  .col-description,
  .col-quantity,
  .col-created,
  .col-expiry,
  .col-status,
  .col-action {
    width: auto;
  }
}
</style>
