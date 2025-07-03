<script setup>
import { ref, computed, onMounted } from "vue";

const brands = ref([]);
const currentPage = ref(1);
const itemsPerPage = 5;
const totalItems = ref(0);
const editBrandId = ref(null);
const showEditOverlay = ref(false);
const showImageOverlay = ref(false);
const selectedImage = ref(null);
const enlargedImage = ref(null);

const addForm = ref({
  name: "",
  image: null,
});
const editForm = ref({});

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));
const paginatedBrands = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return brands.value.slice(start, end);
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

const validateImage = (file) => {
  if (!file) return true;
  const validTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    alert("Chỉ chấp nhận .png, .jpg, .jpeg!");
    return false;
  }
  return true;
};

const handleImageChange = (event, isEdit = false) => {
  const file = event.target.files[0];
  if (!file || !validateImage(file)) {
    event.target.value = "";
    if (isEdit) {
      selectedImage.value = editForm.value.image || null;
    } else {
      selectedImage.value = null;
    }
    return;
  }
  const imageObj = {
    name: file.name,
    url: URL.createObjectURL(file),
    file,
  };
  selectedImage.value = imageObj;
  if (isEdit) {
    editForm.value.image = imageObj;
  } else {
    addForm.value.image = imageObj;
  }
};

const removeImage = (isEdit = false) => {
  selectedImage.value = null;
  if (isEdit) {
    editForm.value.image = null;
  } else {
    addForm.value.image = null;
  }
};

const getToken = () => localStorage.getItem("token");

const fetchBrands = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/brand?limit=0", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw new Error("Không thể lấy danh sách thương hiệu");
    const data = await response.json();
    brands.value = data.brands.map((brand) => ({
      id: brand._id,
      name: brand.br_name,
      image: brand.br_image
        ? { name: brand.br_name, url: `http://localhost:5000${brand.br_image}` }
        : null,
    }));
    totalItems.value = data.totalItems || data.brands.length;
  } catch (error) {
    console.error("Error fetching brands:", error);
    alert("Lỗi khi lấy danh sách thương hiệu: " + error.message);
    totalItems.value = brands.value.length;
  }
};

const handleAddSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const brandName = form.brandName.value.trim();
  const imageFile = form.brandImage.files[0];

  if (!brandName) {
    alert("Tên thương hiệu không được để trống!");
    return;
  }
  if (imageFile && !validateImage(imageFile)) {
    form.brandImage.value = "";
    selectedImage.value = null;
    addForm.value.image = null;
    return;
  }

  const formData = new FormData();
  formData.append("br_name", brandName);
  if (imageFile) formData.append("image", imageFile);

  try {
    const response = await fetch("http://localhost:5000/api/brand/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error("Đã tồn tại thương hiệu");
    const newBrand = await response.json();
    brands.value.push({
      id: newBrand._id,
      name: newBrand.br_name,
      image: newBrand.br_image
        ? {
            name: newBrand.br_name,
            url: `http://localhost:5000${newBrand.br_image}`,
          }
        : null,
    });
    totalItems.value += 1;
    form.reset();
    selectedImage.value = null;
    addForm.value.image = null;
    alert("Thêm thương hiệu thành công!");
  } catch (error) {
    console.error("Error adding brand:", error);
    alert("Lỗi khi thêm thương hiệu: " + error.message);
  }
};

const openEditForm = (brand) => {
  editBrandId.value = brand.id;
  editForm.value = {
    name: brand.name,
    image: brand.image ? { ...brand.image } : null,
  };
  selectedImage.value = brand.image ? { ...brand.image } : null;
  showEditOverlay.value = true;
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const brandName = form.editBrandName.value.trim();
  const imageFile = form.editBrandImage.files[0];

  if (!brandName) {
    alert("Tên thương hiệu không được để trống!");
    return;
  }
  if (imageFile && !validateImage(imageFile)) {
    form.editBrandImage.value = "";
    selectedImage.value = editForm.value.image || null;
    return;
  }

  const formData = new FormData();
  formData.append("br_name", brandName);
  if (imageFile) formData.append("image", imageFile);

  try {
    const response = await fetch(
      `http://localhost:5000/api/brand/update/${editBrandId.value}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      }
    );
    if (!response.ok) throw new Error("Không thể cập nhật thương hiệu");
    const updatedBrand = await response.json();
    brands.value = brands.value.map((brand) =>
      brand.id === editBrandId.value
        ? {
            id: updatedBrand._id,
            name: updatedBrand.br_name,
            image: updatedBrand.br_image
              ? {
                  name: updatedBrand.br_name,
                  url: `http://localhost:5000${updatedBrand.br_image}`,
                }
              : null,
          }
        : brand
    );
    showEditOverlay.value = false;
    form.reset();
    selectedImage.value = null;
    editForm.value = {};
    alert("Cập nhật thương hiệu thành công!");
  } catch (error) {
    console.error("Error updating brand:", error);
    alert("Lỗi khi cập nhật thương hiệu: " + error.message);
  }
};

const closeEditOverlay = () => {
  showEditOverlay.value = false;
  selectedImage.value = null;
  editForm.value = {};
};

const deleteBrand = async (id) => {
  if (confirm("Bạn có chắc muốn xóa thương hiệu này?")) {
    try {
      const response = await fetch(`http://localhost:5000/api/brand/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) throw new Error("Không thể xóa thương hiệu");
      brands.value = brands.value.filter((brand) => brand.id !== id);
      totalItems.value -= 1;
      alert("Xóa thương hiệu thành công!");
    } catch (error) {
      console.error("Error deleting brand:", error);
      alert("Lỗi khi xóa thương hiệu: " + error.message);
    }
  }
};

const openImageOverlay = (image) => {
  enlargedImage.value = image;
  showImageOverlay.value = true;
};

const closeImageOverlay = () => {
  showImageOverlay.value = false;
  enlargedImage.value = null;
};

onMounted(() => {
  fetchBrands();
});
</script>

<template>
  <div class="container-fluid brand-container">
    <div class="header-content">
      <h1 class="header-title">Quản lý thương hiệu</h1>
    </div>
    <main>
      <form id="addBrandForm" class="brand-form" @submit="handleAddSubmit">
        <div class="form-grid">
          <div>
            <label for="brandName">Tên thương hiệu</label>
            <input
              type="text"
              id="brandName"
              placeholder="Tên thương hiệu"
              required
            />
          </div>
          <div>
            <label for="brandImage">Ảnh thương hiệu (jpg, jpeg, png)</label>
            <input
              type="file"
              id="brandImage"
              accept=".png,.jpg,.jpeg"
              @change="handleImageChange($event)"
            />
            <div v-if="selectedImage" class="image-preview">
              <img
                :src="selectedImage.url"
                alt="Brand Image"
                class="preview-img"
              />
              <button type="button" class="remove-btn" @click="removeImage">
                X
              </button>
            </div>
          </div>
        </div>
        <button type="submit" class="create-btn">Thêm</button>
      </form>

      <div
        id="editBrandOverlay"
        class="overlay"
        :style="{ display: showEditOverlay ? 'flex' : 'none' }"
      >
        <div class="overlay-content">
          <h3>Chỉnh sửa thương hiệu</h3>
          <form
            id="editBrandForm"
            class="brand-form"
            @submit="handleEditSubmit"
          >
            <div class="form-grid">
              <div>
                <label for="editBrandName">Tên thương hiệu</label>
                <input
                  type="text"
                  id="editBrandName"
                  v-model="editForm.name"
                  required
                />
              </div>
              <div>
                <label for="editBrandImage"
                  >Ảnh thương hiệu (jpg, jpeg, png)</label
                >
                <input
                  type="file"
                  id="editBrandImage"
                  accept=".png,.jpg,.jpeg"
                  @change="handleImageChange($event, true)"
                />
                <div v-if="selectedImage" class="image-preview">
                  <img
                    :src="selectedImage.url"
                    alt="Brand Image"
                    class="preview-img"
                  />
                  <button
                    type="button"
                    class="remove-btn"
                    @click="removeImage(true)"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
            <div class="overlay-buttons">
              <button type="submit">Cập nhật</button>
              <button type="button" @click="closeEditOverlay">Đóng</button>
            </div>
          </form>
        </div>
      </div>

      <div
        id="imageOverlay"
        class="overlay"
        :style="{ display: showImageOverlay ? 'flex' : 'none' }"
      >
        <div class="image-overlay-content">
          <img
            v-if="enlargedImage"
            :src="enlargedImage.url"
            alt="Enlarged Brand Image"
            class="enlarged-img"
          />
          <button
            type="button"
            class="close-image-btn"
            @click="closeImageOverlay"
          >
            Đóng
          </button>
        </div>
      </div>

      <table id="brandTable">
        <thead>
          <tr>
            <th class="col-id">Mã</th>
            <th class="col-name">Tên thương hiệu</th>
            <th class="col-image">Ảnh thương hiệu</th>
            <th class="col-action">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="brand in paginatedBrands" :key="brand.id">
            <td>{{ brand.id }}</td>
            <td>{{ brand.name }}</td>
            <td>
              <img
                v-if="brand.image"
                :src="brand.image.url"
                alt="Brand Image"
                class="brand-img"
                @click="openImageOverlay(brand.image)"
              />
              <span v-else>Không có ảnh</span>
            </td>
            <td>
              <button class="edit-btn" @click="openEditForm(brand)">
                <span class="material-icons-sharp">edit</span>
              </button>
              <button class="delete-btn" @click="deleteBrand(brand.id)">
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
.brand-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.brand-container .header-title {
  text-align: center;
  font-weight: bold;
}

.brand-form {
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

.image-preview {
  display: flex;
  align-items: center;
  margin-top: 8px;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
}

.preview-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  margin-right: 8px;
}

.remove-btn {
  color: #ff8e8e;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
}

.remove-btn:hover {
  color: #ca7070;
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

.image-overlay-content {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.enlarged-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
}

.close-image-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #6399a9;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.close-image-btn:hover {
  background: #527b8a;
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

#brandTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

#brandTable th,
#brandTable td {
  padding: 12px;
  text-align: center;
  min-width: 60px;
  border-bottom: 1px solid #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#brandTable th {
  background: #6399a9;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
}

#brandTable tr:nth-child(even) {
  background: #f8f9fa;
}

#brandTable tr:hover {
  background: #e9ecef;
}

.col-id {
  width: 25%;
}

.col-name {
  width: 35%;
}

.col-image {
  width: 25%;
}

.col-action {
  width: 25%;
}

.brand-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  cursor: pointer;
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

  #brandTable {
    table-layout: auto;
  }

  #brandTable th,
  #brandTable td {
    min-width: 80px;
  }

  .col-id,
  .col-name,
  .col-image,
  .col-action {
    width: auto;
  }
}
</style>
