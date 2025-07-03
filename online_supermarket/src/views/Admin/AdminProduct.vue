<script setup>
import { ref, computed, onMounted } from "vue";
import * as XLSX from "xlsx";

const getToken = () => {
  const token = localStorage.getItem("token");
  return token;
};

const products = ref([]);
const currentPage = ref(1);
const itemsPerPage = 5;
const totalItems = ref(0);
const editProductId = ref(null);
const showEditOverlay = ref(false);
const addSelectedImages = ref([]);
const editSelectedImages = ref([]);
const searchQuery = ref("");
const categories = ref([]);
const subCategories = ref({});
const brands = ref({});
const selectedCategory = ref("");
const selectedSubCategory = ref("");
const showSubCategory = ref(false);

const addForm = ref({
  name: "",
  images: [],
  stock_quantity: 1,
  price: 1,
  description: "",
  specifications: [{ key: "", value: "" }],
  categoryId: "",
  subCategoryId: "",
  brandId: "",
});
const editForm = ref({});

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (file.name.endsWith(".json")) {
        await handleJsonUpload(e.target.result);
      } else if (file.name.endsWith(".xlsx")) {
        await handleExcelUpload(e.target.result);
      } else {
        alert("Chỉ hỗ trợ file .json hoặc .xlsx");
        return;
      }
      alert("Đã nhập sản phẩm thành công!");
      fetchProducts();
    } catch (error) {
      console.error("Lỗi xử lý file:", error);
      alert("Lỗi khi đọc file: " + error.message);
    }
  };

  if (file.name.endsWith(".xlsx")) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsText(file);
  }
};

const handleJsonUpload = async (fileContent) => {
  try {
    const productsFromFile = JSON.parse(fileContent);
    for (const item of productsFromFile) {
      await importProductToAPI(item);
    }
  } catch (error) {
    throw new Error("Lỗi khi xử lý file JSON: " + error.message);
  }
};

const checkImageExists = async (imagePath) => {
  try {
    const fileName = imagePath.split("/").pop();
    const response = await fetch(
      `http://localhost:5000/api/check-file/${encodeURIComponent(fileName)}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    return response.ok;
  } catch (error) {
    console.warn(`Lỗi kiểm tra ảnh ${imagePath}: ${error.message}`);
    return false;
  }
};

const handleExcelUpload = async (fileContent) => {
  try {
    const workbook = XLSX.read(fileContent, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const productsFromFile = XLSX.utils.sheet_to_json(sheet);

    const brandMap = {};
    Object.keys(brands.value).forEach((id) => {
      brandMap[brands.value[id]] = id;
    });

    const parentCategoryMap = {};
    categories.value.forEach((cat) => {
      parentCategoryMap[cat.name] = cat.id;
    });

    const subCategoryMap = {};
    for (const catId in subCategories.value) {
      subCategories.value[catId].forEach((sub) => {
        subCategoryMap[sub.name] = sub.id;
      });
    }

    const productsToImport = [];
    for (const item of productsFromFile) {
      const productId = item["Product_id"];
      const images = item["p_images"] ? item["p_images"].split("|") : [];
      const validImages = [];

      // Kiểm tra định dạng ảnh và tồn tại của file
      for (const img of images) {
        const extension = img.split(".").pop().toLowerCase();
        if (!["jpg", "jpeg", "png"].includes(extension)) {
          console.warn(
            `Ảnh ${img} có định dạng không hợp lệ, bỏ qua sản phẩm ${productId}`
          );
          continue;
        }
        const exists = await checkImageExists(img);
        if (exists) {
          validImages.push(img);
        } else {
          console.warn(
            `Ảnh ${img} không tồn tại, bỏ qua sản phẩm ${productId}`
          );
          continue;
        }
      }

      if (validImages.length === 0) {
        console.warn(`Sản phẩm ${productId} không có ảnh hợp lệ, bỏ qua`);
        continue;
      }

      const product = {
        p_name: item["p_name"],
        p_images: validImages,
        p_stock_quantity: item["p_stock_quantity"],
        p_price: item["p_price"],
        p_description: item["p_description"] || "",
        p_specifications: [], // Khớp với cấu trúc MongoDB
        p_category: item["p_category_id"],
        p_subcategory: item["p_subcategory_id"] || "",
        p_brand: item["p_brand_id"],
      };

      if (!product.p_brand || !product.p_category) {
        console.warn("Thiếu thương hiệu hoặc danh mục, bỏ qua:", product);
        continue;
      }

      productsToImport.push(product);
    }

    // Import từng sản phẩm
    for (const item of productsToImport) {
      await importProductToAPI(item);
    }
  } catch (error) {
    throw new Error("Lỗi khi xử lý file Excel: " + error.message);
  }
};

const importProductToAPI = async (product) => {
  const formData = new FormData();
  formData.append("p_name", product.p_name);
  formData.append("p_stock_quantity", product.p_stock_quantity);
  formData.append("p_price", product.p_price);
  formData.append("p_description", product.p_description || "");
  formData.append(
    "p_specifications",
    JSON.stringify(product.p_specifications || [])
  );
  formData.append("p_category", product.p_category);
  formData.append("p_subcategory", product.p_subcategory || "");
  formData.append("p_brand", product.p_brand);

  (product.p_images || []).forEach((imgPath) => {
    formData.append("p_images[]", imgPath);
  });

  try {
    const response = await fetch("http://localhost:5000/api/product/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Import thất bại");
    }
  } catch (error) {
    console.error("Lỗi khi import sản phẩm:", error);
    throw error;
  }
};

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));
const paginatedProducts = computed(() => {
  let filteredProducts = products.value;
  if (searchQuery.value) {
    const searchLower = searchQuery.value.toLowerCase();
    filteredProducts = filteredProducts.filter((product) =>
      product.name.toLowerCase().includes(searchLower)
    );
  }
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredProducts.slice(start, end);
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

const searchProducts = () => {
  currentPage.value = 1;
  let filteredProducts = products.value;
  if (searchQuery.value) {
    const searchLower = searchQuery.value.toLowerCase();
    filteredProducts = filteredProducts.filter((product) =>
      product.name.toLowerCase().includes(searchLower)
    );
  }
  totalItems.value = filteredProducts.length;
};

const validateImages = (files) => {
  if (files.length > 5 || files.length === 0) {
    alert("Vui lòng chọn từ 1 đến 5 ảnh!");
    return false;
  }
  const validTypes = ["image/png", "image/jpeg", "image/jpg"];
  for (let file of files) {
    if (!validTypes.includes(file.type)) {
      alert("Chỉ chấp nhận .png, .jpg, .jpeg!");
      return false;
    }
  }
  return true;
};

const handleImageChange = (event, isEdit = false) => {
  const files = Array.from(event.target.files);
  if (!validateImages(files)) {
    event.target.value = "";
    if (isEdit) {
      editSelectedImages.value = editForm.value.images || [];
    } else {
      addSelectedImages.value = [];
    }
    return;
  }
  const newImages = files.map((file) => ({
    file,
    name: file.name,
    url: URL.createObjectURL(file),
  }));
  if (isEdit) {
    editSelectedImages.value = [...editSelectedImages.value, ...newImages];
    editForm.value.images = editSelectedImages.value;
  } else {
    addSelectedImages.value = newImages;
    addForm.value.images = addSelectedImages.value;
  }
};

const removeImage = (index, isEdit = false) => {
  if (isEdit) {
    editSelectedImages.value.splice(index, 1);
    editForm.value.images = [...editSelectedImages.value];
  } else {
    addSelectedImages.value.splice(index, 1);
    addForm.value.images = [...addSelectedImages.value];
  }
};

const addSpecification = () => {
  addForm.value.specifications.push({ key: "", value: "" });
};

const removeSpecification = (index) => {
  addForm.value.specifications.splice(index, 1);
};

const fetchCategories = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/category/parents", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.data)) throw new Error("Invalid categories data");
    categories.value = data.data.map((cat) => ({
      id: cat._id,
      name: cat.cate_name,
    }));

    subCategories.value = {};
    for (const cat of categories.value) {
      try {
        const subResponse = await fetch(
          `http://localhost:5000/api/category/by-parent/${cat.id}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (subResponse.ok) {
          const subData = await subResponse.json();
          subCategories.value[cat.id] = Array.isArray(subData.data)
            ? subData.data.map((sub) => ({ id: sub._id, name: sub.cate_name }))
            : [];
        } else {
          subCategories.value[cat.id] = [];
        }
      } catch (error) {
        console.error(`Error fetching subcategories for ${cat.id}:`, error);
        subCategories.value[cat.id] = [];
      }
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    alert("Lỗi khi lấy danh mục: " + error.message);
  }
};

const fetchBrands = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/brand", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.brands)) throw new Error("Invalid brands data");
    brands.value = data.brands.reduce(
      (acc, brand) => ({ ...acc, [brand._id]: brand.br_name }),
      {}
    );
  } catch (error) {
    console.error("Error fetching brands:", error);
    alert("Lỗi khi lấy thương hiệu: " + error.message);
  }
};

const fetchProducts = async () => {
  try {
    const url = `http://localhost:5000/api/product`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    console.log("API response:", data);
    if (!Array.isArray(data.data.products))
      throw new Error("Invalid products data");
    products.value = data.data.products.map((product) => ({
      id: product._id,
      name: product.p_name,
      images: product.p_images.map((img) => ({
        name: img.split("/").pop(),
        url: `http://localhost:5000${img}`,
      })),
      stock_quantity: product.p_stock_quantity,
      price: product.p_price,
      description: product.p_description || "",
      specifications: product.p_specifications || [],
      categoryId: product.p_category?._id || product.p_category || "",
      subCategoryId: product.p_subcategory?._id || product.p_subcategory || "",
      brandId: product.p_brand?._id || product.p_brand || "",
    }));
    totalItems.value = data.data.totalItems || products.value.length;
    totalPages.value = Math.ceil(totalItems.value / itemsPerPage);
    console.log("fetchProducts:", {
      products: products.value.length,
      totalPages: totalPages.value,
      totalItems: totalItems.value,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    alert("Lỗi khi lấy sản phẩm: " + error.message);
  }
};

const handleAddSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const images = form.productImage.files;

  if (!addForm.value.name) {
    alert("Vui lòng nhập tên sản phẩm!");
    return;
  }
  if (!validateImages(images)) {
    form.productImage.value = "";
    addSelectedImages.value = [];
    addForm.value.images = [];
    return;
  }
  if (!selectedCategory.value) {
    alert("Vui lòng chọn danh mục!");
    return;
  }
  if (!addForm.value.brandId) {
    alert("Vui lòng chọn thương hiệu!");
    return;
  }
  if (addForm.value.price < 1) {
    alert("Đơn giá phải lớn hơn hoặc bằng 1!");
    return;
  }
  if (addForm.value.stock_quantity < 1) {
    alert("Số lượng phải lớn hơn hoặc bằng 1!");
    return;
  }

  const formData = new FormData();
  formData.append("p_name", addForm.value.name);
  formData.append("p_stock_quantity", parseInt(addForm.value.stock_quantity));
  formData.append("p_price", parseInt(addForm.value.price));
  formData.append("p_description", addForm.value.description || "");
  formData.append(
    "p_specifications",
    JSON.stringify(
      addForm.value.specifications.filter((spec) => spec.key && spec.value)
    )
  );
  formData.append("p_category", selectedCategory.value);
  formData.append("p_subcategory", selectedSubCategory.value || "");
  formData.append("p_brand", addForm.value.brandId);

  for (let image of images) {
    formData.append("p_images", image);
  }

  try {
    const response = await fetch("http://localhost:5000/api/product/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error: ${response.status}`);
    }
    await fetchProducts();
    form.reset();
    addForm.value = {
      name: "",
      images: [],
      stock_quantity: 1,
      price: 1,
      description: "",
      specifications: [{ key: "", value: "" }],
      categoryId: "",
      subCategoryId: "",
      brandId: "",
    };
    addSelectedImages.value = [];
    alert("Thêm sản phẩm thành công!");
  } catch (error) {
    console.error("Error adding product:", error);
    alert("Lỗi khi thêm sản phẩm: " + error.message);
  }
};

const openEditForm = async (product) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/product/${product.id}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );
    if (!response.ok) throw new Error("Không thể lấy sản phẩm");
    const data = await response.json();
    editProductId.value = product.id;
    editForm.value = {
      id: data.data._id,
      name: data.data.p_name,
      images: data.data.p_images.map((img) => ({
        name: img.split("/").pop(),
        url: `http://localhost:5000${img}`,
      })),
      stock_quantity: data.data.p_stock_quantity,
      price: data.data.p_price,
      description: data.data.p_description,
      specifications: data.data.p_specifications.length
        ? data.data.p_specifications
        : [{ key: "", value: "" }],
      categoryId: data.data.p_category?._id || data.data.p_category,
      subCategoryId:
        data.data.p_subcategory?._id || data.data.p_subcategory || "",
      brandId: data.data.p_brand?._id || data.data.p_brand,
    };
    selectedCategory.value = editForm.value.categoryId;
    selectedSubCategory.value = editForm.value.subCategoryId;
    editSelectedImages.value = editForm.value.images.map((img) => ({
      name: img.name,
      url: img.url,
    }));
    await updateSubCategory();
    showEditOverlay.value = true;
  } catch (error) {
    console.error("Error fetching product:", error);
    alert("Lỗi khi lấy sản phẩm: " + error.message);
  }
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const images = form.editProductImage.files;

  if (!editForm.value.name) {
    alert("Vui lòng nhập tên sản phẩm!");
    return;
  }
  if (images.length > 0 && !validateImages(images)) {
    form.editProductImage.value = "";
    editSelectedImages.value = editForm.value.images;
    return;
  }
  if (!selectedCategory.value) {
    alert("Vui lòng chọn danh mục!");
    return;
  }
  if (!editForm.value.brandId) {
    alert("Vui lòng chọn thương hiệu!");
    return;
  }
  if (editForm.value.price < 1) {
    alert("Đơn giá phải lớn hơn hoặc bằng 1!");
    return;
  }
  if (editForm.value.stock_quantity < 1) {
    alert("Số lượng phải lớn hơn hoặc bằng 1!");
    return;
  }

  const formData = new FormData();
  formData.append("p_name", editForm.value.name);
  formData.append("p_stock_quantity", parseInt(editForm.value.stock_quantity));
  formData.append("p_price", parseInt(editForm.value.price));
  formData.append("p_description", editForm.value.description || "");
  formData.append(
    "p_specifications",
    JSON.stringify(
      editForm.value.specifications.filter((spec) => spec.key && spec.value)
    )
  );
  formData.append("p_category", selectedCategory.value);
  formData.append("p_subcategory", selectedSubCategory.value || "");
  formData.append("p_brand", editForm.value.brandId);

  const existingImageUrls = editSelectedImages.value
    .filter((img) => !img.file)
    .map((img) => img.url.replace("http://localhost:5000", ""));
  existingImageUrls.forEach((url) => {
    formData.append("p_images[]", url);
  });

  for (let image of images) {
    formData.append("p_images", image);
  }

  try {
    const response = await fetch(
      `http://localhost:5000/api/product/${editProductId.value}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error: ${response.status}`);
    }
    await fetchProducts();
    showEditOverlay.value = false;
    form.reset();
    editForm.value = {};
    selectedCategory.value = "";
    selectedSubCategory.value = "";
    showSubCategory.value = false;
    editSelectedImages.value = [];
    alert("Cập nhật sản phẩm thành công!");
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Lỗi khi cập nhật: " + error.message);
  }
};

const deleteProduct = async (id) => {
  if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
  try {
    const response = await fetch(`http://localhost:5000/api/product/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Không thể xóa sản phẩm");
    await fetchProducts();
    alert("Xóa sản phẩm thành công!");
  } catch (error) {
    console.error("Error deleting product:", error);
    alert("Lỗi khi xóa: " + error.message);
  }
};

const deleteAllProducts = async () => {
  if (!confirm("Bạn có chắc chắn muốn xóa tất cả sản phẩm?")) {
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/product/all", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
    }

    alert("Đã xóa tất cả sản phẩm thành công!");
    await fetchProducts();
  } catch (error) {
    console.error("Lỗi khi xóa tất cả sản phẩm:", error);
    alert("Lỗi khi xóa tất cả sản phẩm: " + error.message);
  }
};

const updateSubCategory = async () => {
  if (!selectedCategory.value) {
    showSubCategory.value = false;
    selectedSubCategory.value = "";
    return;
  }
  try {
    const response = await fetch(
      `http://localhost:5000/api/category/by-parent/${selectedCategory.value}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    subCategories.value[selectedCategory.value] = Array.isArray(data.data)
      ? data.data.map((sub) => ({ id: sub._id, name: sub.cate_name }))
      : [];
    showSubCategory.value =
      subCategories.value[selectedCategory.value].length > 0;
    if (
      !subCategories.value[selectedCategory.value].some(
        (sub) => sub.id === selectedSubCategory.value
      )
    ) {
      selectedSubCategory.value = "";
    }
  } catch (error) {
    console.error(`Error fetching subcategories:`, error);
    subCategories.value[selectedCategory.value] = [];
    showSubCategory.value = false;
    selectedSubCategory.value = "";
  }
};

const closeEditOverlay = () => {
  showEditOverlay.value = false;
  selectedCategory.value = "";
  selectedSubCategory.value = "";
  showSubCategory.value = false;
  editSelectedImages.value = [];
  editForm.value = {};
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
  }).format(price);
};

const restrictNumberInput = (event, field) => {
  const value = event.target.value;
  if (/[^0-9]/.test(value)) {
    event.target.value = value.replace(/[^0-9]/g, "") || 1;
  }
  if (field === "stock_quantity" || field === "price") {
    if (parseInt(event.target.value) < 1) {
      event.target.value = 1;
    }
  }
};

onMounted(() => {
  fetchCategories();
  fetchBrands();
  fetchProducts();
});
</script>

<template>
  <div class="container-fluid product-container">
    <div class="header-content">
      <h1 class="header-title">Quản lý sản phẩm</h1>
    </div>
    <main>
      <form id="addProductForm" class="product-form" @submit="handleAddSubmit">
        <div class="form-grid">
          <div class="full-width">
            <label for="productName">Tên sản phẩm</label>
            <input
              type="text"
              id="productName"
              placeholder="Tên sản phẩm"
              v-model="addForm.name"
              required
            />
          </div>
          <div class="full-width">
            <label for="productImage"
              >Hình ảnh (1-5 ảnh, .png/.jpg/.jpeg/)</label
            >
            <input
              type="file"
              id="productImage"
              accept=".png,.jpg,.jpeg"
              multiple
              @change="handleImageChange($event)"
              required
            />
            <div class="image-list">
              <div
                v-for="(image, index) in addSelectedImages"
                :key="index"
                class="image-item"
              >
                <span>{{ image.name }}</span>
                <button type="button" @click="removeImage(index)">X</button>
              </div>
            </div>
          </div>
          <div>
            <label for="productQuantity">Số lượng (tối thiểu 1)</label>
            <input
              type="number"
              id="productQuantity"
              placeholder="Số lượng"
              min="1"
              v-model="addForm.stock_quantity"
              @input="restrictNumberInput($event, 'stock_quantity')"
              required
            />
          </div>
          <div>
            <label for="productPrice">Đơn giá (VND, tối thiểu 1)</label>
            <input
              type="number"
              id="productPrice"
              placeholder="Đơn giá"
              min="1"
              v-model="addForm.price"
              @input="restrictNumberInput($event, 'price')"
              required
            />
          </div>
          <div class="full-width">
            <label for="productDescription">Mô tả sản phẩm</label>
            <textarea
              id="productDescription"
              placeholder="Mô tả sản phẩm"
              v-model="addForm.description"
            ></textarea>
          </div>
          <div class="full-width">
            <label>Thông số kỹ thuật</label>
            <div
              v-for="(spec, index) in addForm.specifications"
              :key="index"
              class="spec-item"
            >
              <input
                type="text"
                v-model="spec.key"
                placeholder="Tên thông số"
              />
              <input type="text" v-model="spec.value" placeholder="Nội dung" />
              <button type="button" @click="removeSpecification(index)">
                X
              </button>
            </div>
            <button type="button" @click="addSpecification">
              Thêm thông số
            </button>
          </div>
          <div>
            <label for="categoryId">Danh mục</label>
            <select
              id="categoryId"
              v-model="selectedCategory"
              @change="updateSubCategory"
              required
            >
              <option value="">-- Chọn danh mục --</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="subCategoryId">Danh mục con</label>
            <select
              id="subCategoryId"
              v-model="selectedSubCategory"
              :disabled="!subCategories[selectedCategory]"
            >
              <option value="">-- Chọn danh mục con --</option>
              <option
                v-for="sub in subCategories[selectedCategory] || []"
                :key="sub.id"
                :value="sub.id"
              >
                {{ sub.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="brandId">Thương hiệu</label>
            <select id="brandId" v-model="addForm.brandId" required>
              <option value="">-- Chọn thương hiệu --</option>
              <option v-for="(name, id) in brands" :key="id" :value="id">
                {{ name }}
              </option>
            </select>
          </div>
        </div>
        <button type="submit" class="create-btn">Thêm</button>
        <div class="import-section" style="margin-top: 20px">
          <label for="importFile">Hoặc nhập từ file JSON / Excel:</label>
          <input
            type="file"
            id="importFile"
            accept=".json,.xlsx"
            @change="handleFileUpload"
          />
        </div>
      </form>
      <div
        id="editProductOverlay"
        class="overlay"
        :style="{ display: showEditOverlay ? 'flex' : 'none' }"
      >
        <div class="overlay-content">
          <h2 class="text-center">Chỉnh sửa sản phẩm</h2>
          <form
            id="editProductForm"
            class="product-form"
            @submit="handleEditSubmit"
          >
            <div class="form-grid">
              <div class="full-width">
                <label for="editProductName">Tên sản phẩm</label>
                <input
                  type="text"
                  id="editProductName"
                  v-model="editForm.name"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editProductImage"
                  >Hình ảnh (1-5 ảnh, .png/.jpg/.jpeg/)</label
                >
                <input
                  type="file"
                  id="editProductImage"
                  accept=".png,.jpg,.jpeg"
                  multiple
                  @change="handleImageChange($event, true)"
                />
                <div class="image-list">
                  <div
                    v-for="(image, index) in editSelectedImages"
                    :key="index"
                    class="image-item"
                  >
                    <span>{{ image.name }}</span>
                    <button type="button" @click="removeImage(index, true)">
                      X
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label for="editProductQuantity">Số lượng (tối thiểu 1)</label>
                <input
                  type="number"
                  id="editProductQuantity"
                  v-model="editForm.stock_quantity"
                  min="1"
                  @input="restrictNumberInput($event, 'stock_quantity')"
                  required
                />
              </div>
              <div>
                <label for="editPrice">Đơn giá (VND, tối thiểu 1)</label>
                <input
                  type="number"
                  id="editPrice"
                  v-model="editForm.price"
                  min="1"
                  @input="restrictNumberInput($event, 'price')"
                  required
                />
              </div>
              <div class="full-width">
                <label for="editProductDescription">Mô tả sản phẩm</label>
                <textarea
                  id="editProductDescription"
                  v-model="editForm.description"
                ></textarea>
              </div>
              <div class="full-width">
                <label>Thông số kỹ thuật</label>
                <div
                  v-for="(spec, index) in editForm.specifications"
                  :key="index"
                  class="spec-item"
                >
                  <input
                    type="text"
                    v-model="spec.key"
                    placeholder="Tên thông số"
                  />
                  <input
                    type="text"
                    v-model="spec.value"
                    placeholder="Giá trị"
                  />
                  <button
                    type="button"
                    @click="editForm.specifications.splice(index, 1)"
                  >
                    X
                  </button>
                </div>
                <button
                  type="button"
                  @click="editForm.specifications.push({ key: '', value: '' })"
                >
                  Thêm thông số
                </button>
              </div>
              <div>
                <label for="editCategoryId">Danh mục</label>
                <select
                  id="editCategoryId"
                  v-model="selectedCategory"
                  @change="updateSubCategory"
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>
              <div>
                <label for="editSubCategoryId">Danh mục con</label>
                <select
                  id="editSubCategoryId"
                  v-model="selectedSubCategory"
                  :disabled="!subCategories[selectedCategory]"
                >
                  <option value="">-- Chọn danh mục con --</option>
                  <option
                    v-for="sub in subCategories[selectedCategory] || []"
                    :key="sub.id"
                    :value="sub.id"
                  >
                    {{ sub.name }}
                  </option>
                </select>
              </div>
              <div>
                <label for="editBrandId">Thương hiệu</label>
                <select id="editBrandId" v-model="editForm.brandId" required>
                  <option value="">-- Chọn thương hiệu --</option>
                  <option v-for="(name, id) in brands" :key="id" :value="id">
                    {{ name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="operations">
              <button class="btn-update">Cập nhật</button>
              <button
                type="button"
                class="btn btn-danger"
                @click="closeEditOverlay"
              >
                Đóng
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="search-container">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Tìm kiếm tên sản phẩm..."
          @input="searchProducts"
        />
        <button class="delete-all-btn" @click="deleteAllProducts">
          Xóa tất cả
        </button>
      </div>
      <table id="productTable">
        <thead>
          <tr>
            <th class="col-id">Mã</th>
            <th class="col-name">Tên sản phẩm</th>
            <th class="col-quantity">Số lượng</th>
            <th class="col-price">Đơn giá</th>
            <th class="col-category">Danh mục</th>
            <th class="col-brand">Thương hiệu</th>
            <th class="col-action">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in paginatedProducts" :key="product.id">
            <td>{{ product.id }}</td>
            <td>{{ product.name }}</td>
            <td>{{ product.stock_quantity }}</td>
            <td>{{ formatPrice(product.price) }} đ</td>
            <td>
              {{
                categories.find((cat) => cat.id === product.categoryId)?.name ||
                "Không xác định"
              }}
            </td>
            <td>{{ brands[product.brandId] || "Không xác định" }}</td>
            <td>
              <button class="edit-btn" @click="openEditForm(product)">
                <span class="material-icons-sharp">edit</span>
              </button>
              <button class="delete-btn" @click="deleteProduct(product.id)">
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
.product-container {
  border-radius: 10px;
  padding: 24px;
  font-family: "Roboto", sans-serif;
}

.product-container .header-title {
  text-align: center;
  font-weight: bold;
}

.product-form {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.product-form .create-btn {
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

.product-form .create-btn:hover {
  background-color: #527b8a;
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
.form-grid textarea,
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

.form-grid input:focus,
.form-grid textarea:focus,
.form-grid select:focus {
  border-color: #6399a9;
  outline: none;
  box-shadow: 0 0 5px rgba(99, 153, 169, 0.2);
}

.form-grid input[type="number"] {
  -webkit-appearance: textfield;
  -moz-appearance: textfield;
  appearance: textfield;
}

.form-grid input[type="number"]::-webkit-inner-spin-button,
.form-grid input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-grid textarea {
  min-height: 100px;
  resize: vertical;
}

.form-grid button {
  grid-column: span 2;
  padding: 12px;
  background: #6399a9;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.form-grid button:hover {
  background: #527b8a;
}

select {
  appearance: none;
  background: #f8f9fa;
  padding-right: 20px;
}

.sub-category:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spec-item {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.spec-item input {
  flex: 1;
}

.spec-item button {
  background-color: white;
  color: #ff8e8e;
  border: none;
  width: 40px;
  border-radius: 5px;
}

.spec-item button:hover {
  background: #ff8e8e;
  color: white;
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
  margin-top: 80px;
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 1000px;
  height: 85%;
  overflow-y: auto;
}

.overlay-content h2 {
  font-weight: bold;
}

.operations {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.operations button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.operations .btn-update {
  background-color: #6399a9;
  color: white;
}

.operations .btn-update:hover {
  background-color: #527b8a;
}

#productTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

#productTable th,
#productTable td {
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}

#productTable th {
  background: #6399a9;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
}

#productTable tr:nth-child(even) {
  background: #f8f9fa;
}

#productTable tr:hover {
  background: #e9ecef;
}

.col-id {
  width: 20%;
}
.col-name {
  width: 25%;
}
.col-quantity {
  width: 10%;
}
.col-price {
  width: 10%;
}

.col-category {
  width: 10%;
}

.col-brand {
  width: 10%;
}
.col-action {
  width: 15%;
}

#productTable td {
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
  background: none;
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
  background: none;
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
}

.page-numbers button:hover {
  background: #e9ecef;
}

.page-numbers button.active {
  background: #6399a9;
  color: #ffffff;
  border-color: #6399a9;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.image-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.image-item button {
  margin-left: 8px;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
}

.image-item button:hover {
  color: #c82333;
}

.search-container {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
}

.search-container input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.delete-all-btn {
  padding: 10px 15px;
  border: 1px solid #dc3545;
  border-radius: 5px;
  background: #dc3545;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s ease;
  width: 150px;
}

.delete-all-btn:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid .full-width {
    grid-column: auto;
  }
  .form-grid button {
    grid-column: auto;
  }
  #productTable {
    font-size: 0.9rem;
  }
  .col-id,
  .col-name,
  .col-quantity,
  .col-price,
  .col-category,
  .col-brand,
  .col-action {
    width: auto;
  }
}
</style>
