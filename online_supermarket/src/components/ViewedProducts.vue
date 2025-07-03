<script setup>
import { ref, onMounted } from "vue";

const saveViewedProducts = (products) => {
  localStorage.setItem("viewedProducts", JSON.stringify(products));
};

const loadViewedProducts = () => {
  const savedProducts = localStorage.getItem("viewedProducts");
  return savedProducts ? JSON.parse(savedProducts) : [];
};

const viewedProducts = ref(loadViewedProducts());

const addViewedProduct = (product) => {
  const isDuplicate = viewedProducts.value.some(
    (p) => p.name === product.name && p.brand === product.brand
  );
  if (!isDuplicate) {
    viewedProducts.value = [product, ...viewedProducts.value].slice(0, 9);
    saveViewedProducts(viewedProducts.value);
  }
};

const onProductClick = (product) => {
  addViewedProduct(product);
};

const removeViewedProduct = (index) => {
  viewedProducts.value.splice(index, 1);
  saveViewedProducts(viewedProducts.value);
};

onMounted(() => {
  if (!Array.isArray(viewedProducts.value)) {
    viewedProducts.value = [];
    saveViewedProducts(viewedProducts.value);
  }
});

defineExpose({
  onProductClick,
});
</script>

<template>
  <div class="tab-content">
    <h2>Sản phẩm đã xem</h2>
    <div class="product-list">
      <div v-if="viewedProducts.length === 0" class="no-products">
        Chưa có sản phẩm nào được xem.
      </div>
      <div
        v-else
        class="product-item"
        v-for="(product, index) in viewedProducts"
        :key="index"
      >
        <div class="product-image">
          <img :src="product.image" alt="Product Image" class="product-img" />
        </div>
        <div class="product-info">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-details">
            Thương hiệu: {{ product.brand }}, Danh mục: {{ product.category }}
          </div>
        </div>
        <div class="product-price">
          {{ (product.price || 0).toLocaleString("vi-VN") }} đ
        </div>
        <button class="delete-btn" @click="removeViewedProduct(index)">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.tab-content {
  padding: 20px;
  font-size: 16px;
  height: 700px;
  overflow-y: auto;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.product-list {
  min-height: 200px;
}

.no-products {
  text-align: center;
  font-size: 18px;
  color: #666;
  padding: 20px;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 15px;
  background-color: #fff;
  position: relative;
}

.product-image {
  flex-shrink: 0;
}

.product-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 5px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.product-brand {
  font-size: 14px;
  color: #666;
}

.product-category {
  font-size: 14px;
  color: #888;
}

.product-price {
  font-size: 16px;
  font-weight: bold;
  color: #d4575d;
}

.delete-btn {
  background-color: white;
  color: black;
  border: none;
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  width: 30px;
  transition: 0.3s ease;
}

.delete-btn:hover {
  background-color: #cc0000;
  color: white;
}
</style>
