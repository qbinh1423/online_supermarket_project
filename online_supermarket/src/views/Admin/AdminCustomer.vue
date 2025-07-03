<script setup>
import { ref, computed, onMounted } from "vue";

const customers = ref([]);
const recentCustomers = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;
const searchQuery = ref("");
const selectedCustomer = ref(null);
const showModal = ref(false);

const getToken = () => localStorage.getItem("token");

const fetchCustomers = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/users", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy danh sách khách hàng");
    const data = await response.json();
    customers.value = data.map((user) => ({
      id: user._id,
      name: user.c_name,
      account: user.c_email,
      phone: user.c_phone || "",
      date: user.c_date || "",
      address: user.c_address || "",
      role: user.c_role || "user",
      createdAt: user.c_date || new Date(),
    }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    alert("Lỗi khi lấy danh sách khách hàng: " + error.message);
  }
};

const fetchRecentCustomers = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/users/recent", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy khách hàng gần đây");
    const data = await response.json();
    recentCustomers.value = data.data.map((user) => ({
      type: "user",
      name: user.c_name,
      message: "tạo tài khoản.",
      date: user.createdAt || new Date(),
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error fetching recent customers:", error);
    alert("Lỗi khi lấy khách hàng gần đây: " + error.message);
  }
};

const deleteCustomer = async (customerId) => {
  if (!confirm("Bạn có chắc muốn xóa khách hàng này?")) return;
  try {
    const response = await fetch(
      `http://localhost:5000/api/users/remove/${customerId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );
    if (!response.ok) throw new Error("Không thể xóa khách hàng");
    customers.value = customers.value.filter(
      (customer) => customer.id !== customerId
    );
    alert("Xóa tài khoản thành công.");
  } catch (error) {
    console.error("Error deleting customer:", error);
    alert("Lỗi hệ thống: " + error.message);
  }
};

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value;
  const query = searchQuery.value.toLowerCase();
  return customers.value.filter((customer) =>
    customer.name.toLowerCase().includes(query)
  );
});

const totalPages = computed(() =>
  Math.ceil(filteredCustomers.value.length / itemsPerPage)
);

const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredCustomers.value.slice(start, end);
});

const setPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const formatDate = (date) => {
  return new Date(date)
    .toLocaleString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .replace("lúc", "")
    .trim();
};

const showCustomerDetails = (customer) => {
  selectedCustomer.value = customer;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedCustomer.value = null;
};

onMounted(() => {
  fetchCustomers();
  fetchRecentCustomers();
});
</script>

<template>
  <div class="container-fluid customer-container">
    <div class="header-content">
      <h1 class="header-title">Danh sách tài khoản</h1>
    </div>
    <div class="content-wrapper">
      <main>
        <section id="main-section">
          <div class="table-container">
            <div class="search-container">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Tìm kiếm theo tên tài khoản..."
                class="search-input"
              />
            </div>
            <div class="table-wrapper">
              <table id="customerTable">
                <thead>
                  <tr>
                    <th class="col-id">Mã</th>
                    <th class="col-name">Tên</th>
                    <th class="col-account">Tài khoản</th>
                    <th class="col-role">Vai trò</th>
                    <th class="col-action">Hành động</th>
                  </tr>
                </thead>
                <tbody id="customer-table-body">
                  <tr
                    v-for="(customer) in paginatedCustomers"
                    :key="customer.id"
                  >
                    <td>{{ customer.id }}</td>
                    <td>{{ customer.name }}</td>
                    <td>{{ customer.account }}</td>
                    <td>{{ customer.role }}</td>
                    <td>
                      <button
                        class="detail-btn"
                        @click="showCustomerDetails(customer)"
                      >
                        <span class="material-icons-sharp">info</span>
                      </button>
                      <button
                        class="delete-btn"
                        @click="deleteCustomer(customer.id)"
                      >
                        <span class="material-icons-sharp">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <button
                :disabled="currentPage === 1"
                @click="setPage(currentPage - 1)"
              >
                Trước
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                :class="{ active: currentPage === page }"
                @click="setPage(page)"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                @click="setPage(currentPage + 1)"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </main>
      <div class="right-part">
        <h3>Cập nhật gần đây</h3>
        <div class="recent-updates">
          <div class="updates">
            <div v-if="recentCustomers.length > 0">
              <div
                v-for="(update, index) in recentCustomers"
                :key="index"
                class="update"
              >
                <div class="icon">
                  <span class="material-icons-sharp">person</span>
                </div>
                <div class="container-info">
                  <div class="content">
                    <h5>{{ update.name }} {{ update.message }}</h5>
                    <small>{{ formatDate(update.date) }}</small>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="no-updates">
              <p>Không có người tạo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Chi tiết khách hàng</h2>
        <div class="modal-body" v-if="selectedCustomer">
          <p><strong>Mã:</strong> {{ selectedCustomer.id }}</p>
          <p><strong>Tên:</strong> {{ selectedCustomer.name }}</p>
          <p><strong>Tài khoản:</strong> {{ selectedCustomer.account }}</p>
          <p>
            <strong>Số điện thoại:</strong>
            {{ selectedCustomer.phone || "Không có" }}
          </p>
          <p>
            <strong>Địa chỉ:</strong>
            {{ selectedCustomer.address || "Không có" }}
          </p>
          <p>
            <strong>Ngày sinh:</strong>
            {{ formatDate(selectedCustomer.date) || "Không có" }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="close-btn" @click="closeModal">Đóng</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.customer-container .header-title {
  text-align: center;
  font-weight: bold;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 4fr 1fr;
  gap: 10px;
}

#customer-section h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  text-align: center;
}

.search-container {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: #6399a9;
  box-shadow: 0 0 5px rgba(99, 153, 169, 0.2);
}

.table-container {
  background: #ffffff;
  padding: 16px;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.table-wrapper {
  flex: 1;
}

.table-container table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.table-container th,
.table-container td {
  padding: 0.4rem;
  text-align: center;
  min-width: 60px;
}

.col-id {
  width: 5%;
}
.col-name {
  width: 25%;
}
.col-account {
  width: 10%;
}
.col-role {
  width: 10%;
}
.col-action {
  width: 15%;
}

.table-container th {
  background-color: #6399a9;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
}

.table-container tr:nth-child(even) {
  background-color: #f8f9fa;
}

.table-container tr:nth-child(odd) {
  background-color: #ffffff;
}

.table-container tr:hover {
  background-color: #e9ecef;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.modal-content h2 {
  margin-bottom: 16px;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
}

.modal-body p {
  margin: 8px 0;
  font-size: 1rem;
}

.modal-footer {
  text-align: right;
  margin-top: 16px;
}

.close-btn {
  padding: 8px 16px;
  background: #6399a9;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.close-btn:hover {
  background: #52808f;
}

.detail-btn,
.delete-btn {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: #ffffff;
  color: #212529;
  margin: 0 4px;
}

.detail-btn:hover {
  background-color: #17a2b8;
  color: #ffffff;
  border-color: #17a2b8;
}

.detail-btn span {
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn {
  padding: 6px;
  font-size: 20px;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  cursor: pointer;
  background-color: #ffffff;
  color: #000;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background-color: #dc3545;
  color: #ffffff;
  border-color: #dc3545;
}

.delete-btn span {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  position: sticky;
  bottom: 0;
  background: #ffffff;
  padding: 8px 0;
  z-index: 10;
}

.pagination button {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination button:hover {
  background: #e9ecef;
}

.pagination button.active {
  background: #6399a9;
  color: #ffffff;
  border-color: #6399a9;
}

.pagination button:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.right-part {
  background: #ffffff;
  border-radius: 0.375rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 550px;
}

.right-part .no-updates {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 16px;
}

.right-part .recent-updates {
  height: 500px;
  overflow-y: auto;
}

.right-part h3 {
  margin: 10px 0 20px 10px;
  font-weight: bold;
  font-size: 20px;
}

.right-part .recent-updates .updates {
  padding: 8px;
}

.right-part .recent-updates .update {
  display: grid;
  grid-template-columns: 1.5rem auto;
  gap: 1rem;
  margin-bottom: 2rem;
}

.right-part .recent-updates .update .container-info .content h5 {
  font-size: 16px;
  font-weight: bold;
}

.right-part .recent-updates .update .container-info .content small {
  display: block;
}

@media (max-width: 768px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }

  main {
    order: 1;
  }

  .right-part {
    order: 2;
  }

  .table-container {
    min-height: auto;
  }

  .col-id,
  .col-name,
  .col-account,
  .col-action {
    width: auto;
  }
}
</style>
