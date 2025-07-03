<script setup>
import { ref, computed, onMounted } from "vue";

const categories = ref([]);
const editCategoryId = ref(null);
const showEditOverlay = ref(false);
const currentPage = ref(1);
const itemsPerPage = 5;

const addForm = ref({
  name: "",
  parent_category_id: null,
  cate_description: "",
});
const editForm = ref({
  name: "",
  parent_category_id: null,
  cate_description: "",
});

const totalPages = computed(() =>
  Math.ceil(categories.value.length / itemsPerPage)
);

const paginatedCategories = computed(() => {
  const startPage = (currentPage.value - 1) * itemsPerPage;
  const endPage = startPage + itemsPerPage;
  return categories.value.slice(startPage, endPage);
});

const setPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

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

const getCategoryNameById = (id) => {
  if (!id) return "Không";
  const category = categories.value.find((cat) => cat.id === id);
  return category ? category.name : "Không";
};

const getDisplayId = (category) => {
  if (!category.parent_category_id) {
    return category.id;
  }
  return `${category.parent_category_id}.${category.id}`;
};

const getToken = () => localStorage.getItem("token");

const fetchCategories = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/category", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Không thể lấy danh sách danh mục");
    const result = await response.json();
    categories.value = result.data.map((cat) => ({
      id: cat._id,
      name: cat.cate_name,
      parent_category_id: cat.parent_category_id
        ? cat.parent_category_id._id
        : null,
      cate_description: cat.cate_description,
    }));
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1;
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh mục:", error);
    alert("Không thể tải danh sách danh mục: " + error.message);
  }
};

const handleAddSubmit = async (event) => {
  event.preventDefault();
  if (!addForm.value.name.trim()) {
    alert("Tên danh mục không được để trống!");
    return;
  }
  try {
    const response = await fetch("http://localhost:5000/api/category/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        cate_name: addForm.value.name.trim(),
        parent_category_id: addForm.value.parent_category_id || null,
        cate_description: addForm.value.cate_description.trim() || null,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Không thể thêm danh mục");
    }
    await response.json();
    await fetchCategories();
    addForm.value = {
      name: "",
      parent_category_id: null,
      cate_description: "",
    };
    alert("Thêm danh mục thành công!");
  } catch (error) {
    console.error("Lỗi khi thêm danh mục:", error);
    alert("Không thể thêm danh mục: " + error.message);
  }
};

const openEditForm = (category) => {
  editCategoryId.value = category.id;
  editForm.value = {
    name: category.name,
    parent_category_id: category.parent_category_id || null,
    cate_description: category.cate_description || "",
  };
  showEditOverlay.value = true;
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  if (!editForm.value.name.trim()) {
    alert("Tên danh mục không được để trống!");
    return;
  }
  try {
    const response = await fetch(
      `http://localhost:5000/api/category/${editCategoryId.value}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          cate_name: editForm.value.name.trim(),
          parent_category_id: editForm.value.parent_category_id || null,
          cate_description: editForm.value.cate_description.trim() || null,
        }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Không thể cập nhật danh mục");
    }
    await fetchCategories();
    showEditOverlay.value = false;
    editForm.value = {
      name: "",
      parent_category_id: null,
      cate_description: "",
    };
    alert("Cập nhật danh mục thành công!");
  } catch (error) {
    console.error("Lỗi khi cập nhật danh mục:", error);
    alert("Không thể cập nhật danh mục: " + error.message);
  }
};

const closeEditOverlay = () => {
  showEditOverlay.value = false;
  editForm.value = { name: "", parent_category_id: null, cate_description: "" };
};

const deleteCategory = async (id) => {
  if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
  try {
    const response = await fetch(`http://localhost:5000/api/category/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Không thể xóa danh mục");
    }
    categories.value = categories.value.filter(
      (cat) => cat.id !== id && cat.parent_category_id !== id
    );
    alert("Xóa danh mục thành công!");
  } catch (error) {
    console.error("Lỗi khi xóa danh mục:", error);
    alert("Không thể xóa danh mục: " + error.message);
  }
};

const hasCircularReference = (categoryId, parentId) => {
  if (!parentId) return false;
  const visited = new Set();
  let currentId = parentId;
  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    if (currentId === categoryId) return true;
    const category = categories.value.find((cat) => cat.id === currentId);
    currentId = category ? category.parent_category_id : null;
  }
  return false;
};

onMounted(() => {
  fetchCategories();
});
</script>

<template>
  <div class="container-fluid category-container">
    <div class="header-content">
      <h1 class="header-title">Quản lý danh mục</h1>
    </div>
    <main>
      <form
        id="addCategoryForm"
        class="category-form"
        @submit="handleAddSubmit"
      >
        <div class="form-grid">
          <div>
            <label for="categoryName">Tên danh mục</label>
            <input
              type="text"
              id="categoryName"
              v-model="addForm.name"
              placeholder="Tên danh mục"
              required
            />
          </div>
          <div>
            <label for="parentCategoryId">Danh mục cha</label>
            <select id="parentCategoryId" v-model="addForm.parent_category_id">
              <option value="">Không</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="full-width">
            <label for="categoryDescription">Mô tả</label>
            <input
              type="text"
              id="categoryDescription"
              v-model="addForm.cate_description"
              placeholder="Mô tả danh mục"
            />
          </div>
        </div>
        <button type="submit" class="create-btn">Thêm</button>
      </form>

      <div
        id="editCategoryOverlay"
        class="overlay"
        :style="{ display: showEditOverlay ? 'flex' : 'none' }"
      >
        <div class="overlay-content">
          <h2 class="text-center">Chỉnh sửa danh mục</h2>
          <form
            id="editCategoryForm"
            class="category-form"
            @submit="handleEditSubmit"
          >
            <div class="form-grid">
              <div>
                <label for="editCategoryName">Tên danh mục</label>
                <input
                  type="text"
                  id="editCategoryName"
                  v-model="editForm.name"
                  required
                />
              </div>
              <div>
                <label for="editParentCategoryId">Danh mục cha</label>
                <select
                  id="editParentCategoryId"
                  v-model="editForm.parent_category_id"
                >
                  <option value="">Không</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                    :disabled="
                      category.id === editCategoryId ||
                      hasCircularReference(editCategoryId, category.id)
                    "
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>
              <div class="full-width">
                <label for="editCategoryDescription">Mô tả</label>
                <input
                  type="text"
                  id="editCategoryDescription"
                  v-model="editForm.cate_description"
                  placeholder="Mô tả danh mục"
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
      <table id="categoryTable">
        <thead>
          <tr>
            <th class="col-id">Mã</th>
            <th class="col-name">Tên danh mục</th>
            <th class="col-subcategory">Danh mục cha</th>
            <th class="col-action">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in paginatedCategories" :key="category.id">
            <td>{{ getDisplayId(category) }}</td>
            <td>{{ category.name }}</td>
            <td>{{ getCategoryNameById(category.parent_category_id) }}</td>
            <td>
              <button class="edit-btn" @click="openEditForm(category)">
                <span class="material-icons-sharp">edit</span>
              </button>
              <button class="delete-btn" @click="deleteCategory(category.id)">
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
.category-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.category-container .header-title {
  text-align: center;
  font-weight: bold;
}

.category-form {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 2rem;
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

.form-grid input,
.form-grid select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  color: #212529;
  background: #f8f9fa;
  transition: border-color 0.3s ease;
}

.form-grid select {
  cursor: pointer;
}

.form-grid input:focus,
.form-grid select:focus {
  border-color: #6399a9;
  outline: none;
  box-shadow: 0 0 5px rgba(99, 153, 169, 0.2);
}

.create-btn {
  margin: 20px auto 0;
  border-radius: 10px;
  color: white;
  background-color: #6399a9;
  width: 80px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border: none;
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

#categoryTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

#categoryTable th,
#categoryTable td {
  padding: 12px;
  text-align: center;
  min-width: 60px;
  border-bottom: 1px solid #ddd;
}

#categoryTable th {
  background: #6399a9;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
}

#categoryTable tr:nth-child(even) {
  background: #f8f9fa;
}

#categoryTable tr:hover {
  background: #e9ecef;
}

.col-id {
  width: 30%;
}

.col-name {
  width: 30%;
  text-align: left;
}

.col-subcategory {
  width: 40%;
}

.col-action {
  width: 20%;
}

#categoryTable td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-btn,
.delete-btn {
  padding: 6px;
  font-size: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: #ffffff;
  color: #212529;
  transition: all 0.3s ease;
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

.page-numbers button.disabled {
  cursor: default;
  background: none;
  border: none;
  color: #6c757d;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .create-btn {
    width: 100%;
  }

  #categoryTable {
    table-layout: auto;
  }

  #categoryTable th,
  #categoryTable td {
    min-width: 80px;
  }

  .col-id,
  .col-name,
  .col-subcategory,
  .col-action {
    width: auto;
  }
}
</style>
