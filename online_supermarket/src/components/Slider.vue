<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import productService from "../services/product";

const router = useRouter();
const carouselRef = ref(null);
const containerRef = ref(null);
let currentIndex = ref(0);
let autoRotateInterval = null;
let resumeTimeout = null;
const queryClient = useQueryClient();
const products = ref([]);

const randomProducts = computed(() => {
  if (products.value.length === 0) return [];
  const shuffled = [...products.value].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
});

const getProduct = useMutation({
  mutationFn: async () => {
    const response = await productService.getAllProduct();
    return response;
  },
  onSuccess: (data) => {
    products.value = data.data.products;
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});

const getProductUrl = (product) => {
  const baseUrl = "http://localhost:5000";
  const url =
    product.p_images && product.p_images.length > 0
      ? encodeURI(`${baseUrl}${product.p_images[0]}`)
      : "/assets/default-product.png";
  return url;
};

const backgroundColors = ["#4B4B4B", "#55865A", "#A76969", "#B9B9B9"];

const rotateCarousel = (index) => {
  const deg = index * 90;
  carouselRef.value.style.transform = `rotate(-${deg}deg)`;

  const images = carouselRef.value.querySelectorAll(".slide img");
  images.forEach((img) => {
    img.style.transform = `rotate(${deg}deg)`;
  });
  containerRef.value.style.backgroundColor = backgroundColors[index];
};

const startAutoRotate = () => {
  clearInterval(autoRotateInterval);
  autoRotateInterval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % 4;
    rotateCarousel(currentIndex.value);
  }, 3000);
};

const stopAutoRotateTemporarily = () => {
  clearInterval(autoRotateInterval);
  clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(() => {
    startAutoRotate();
  }, 7000);
};

const saveViewedProducts = (products) => {
  localStorage.setItem("viewedProducts", JSON.stringify(products));
};

const loadViewedProducts = () => {
  const savedProducts = localStorage.getItem("viewedProducts");
  return savedProducts ? JSON.parse(savedProducts) : [];
};

const addViewedProduct = (product) => {
  const viewedProducts = loadViewedProducts();
  const isDuplicate = viewedProducts.some(
    (p) => p.name === product.name && p.brand === product.brand
  );
  if (!isDuplicate) {
    const updatedProducts = [product, ...viewedProducts].slice(0, 9);
    saveViewedProducts(updatedProducts);
  }
};

const handleProductClick = (product) => {
  addViewedProduct({
    image: product.image,
    name: product.name,
    brand:
      typeof product.brand === "object"
        ? product.brand.br_name || "Unknown"
        : product.brand,
    price: product.price,
    category:
      typeof product.category === "object"
        ? product.category.cate_name || "Chưa phân loại"
        : product.category,
  });
};

onMounted(() => {
  rotateCarousel(currentIndex);
  startAutoRotate();

  const controlLinks = document.querySelectorAll(".control a");
  controlLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const index = parseInt(link.getAttribute("data-index"));
      currentIndex.value = index;
      rotateCarousel(currentIndex.value);
      stopAutoRotateTemporarily();
    });
  });

  getProduct.mutate();
});

onBeforeUnmount(() => {
  clearInterval(autoRotateInterval);
  clearTimeout(resumeTimeout);
});
</script>
<template>
  <div class="container-fluid slider-container" ref="containerRef">
    <div class="container">
      <div class="row align-items-center m-auto">
        <div
          class="col-lg-8 col-md-6 col-sm-12"
          v-if="randomProducts.length > 0"
        >
          <div class="custom-col col-title">
            {{ randomProducts[currentIndex]?.p_name }}
          </div>
          <div class="custom-col col-description">
            {{ randomProducts[currentIndex]?.p_description }}
          </div>
          <div class="custom-col col-price">
            Giá:
            {{ randomProducts[currentIndex]?.p_price.toLocaleString("vi-VN") }}đ
          </div>
          <button
            class="detail-btn"
            title="Xem chi tiết"
            @click="
              () => {
                const product = randomProducts[currentIndex];
                handleProductClick({
                  _id: product._id,
                  image: getProductUrl(product),
                  name: product.p_name,
                  brand: product.p_brand,
                  price: product.p_price,
                  category: product.p_category,
                });
                $router.push(`/product/${product._id}`);
              }
            "
          >
            Chi tiết
          </button>
        </div>
        <div class="col-lg-4 col-md-6 col-sm-12">
          <div class="slideshow-wrapper">
            <div class="carousel" ref="carouselRef">
              <div
                class="slide"
                v-for="product in randomProducts"
                :key="product._id"
              >
                <img :src="getProductUrl(product)" :alt="product.p_name" />
              </div>
            </div>
          </div>
          <div class="control">
            <a
              href="#"
              v-for="(product, index) in randomProducts"
              :key="product._id"
              :data-index="index"
              :class="{ active: index === currentIndex }"
              @click.prevent="
                currentIndex = index;
                rotateCarousel(index);
                stopAutoRotateTemporarily();
              "
            >
              <img :src="getProductUrl(product)" :alt="product.p_name" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider-container {
  margin: 70px auto 0;
  transition: background-color 0.8s ease;
  padding: 20px 0;
  min-height: 550px;
  width: 100%;
}

.custom-col {
  margin-top: 10px;
  text-align: left;
  padding: 10px;
  border-radius: 4px;
  color: white;
  font-family: "Be Vietnam Pro", sans-serif;
}

.col-title {
  font-size: 40px;
  font-weight: bold;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.col-description {
  font-size: 20px;
  height: 160px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 5;
  line-clamp: 5;
}

.col-price {
  font-size: 40px;
}

.detail-btn {
  background: #c9dae1;
  border: none;
  border-radius: 10px;
  font-size: 22px;
  padding: 8px 20px;
  margin-top: 10px;
}

.detail-link {
  color: black;
  text-decoration: none;
}

.slideshow-wrapper {
  width: 520px;
  height: 400px;
  overflow: hidden;
  position: relative;
  margin: 20px auto 0;
  border-radius: 25%;
}

.carousel {
  width: 400px;
  height: 400px;
  position: absolute;
  margin-top: 50px;
  right: -250px;
  top: -50px;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: rotate(-90deg);
  transition: transform 1s;
  overflow: visible;
}

.slide {
  width: 250px;
  height: auto;
  position: absolute;
}

.slide:nth-child(1) {
  left: -300px;
}

.slide:nth-child(2) {
  top: -300px;
}

.slide:nth-child(3) {
  right: -300px;
}

.slide:nth-child(4) {
  bottom: -300px;
}

.slide img {
  width: 100%;
  object-fit: contain;
  transform: rotate(90deg);
  transition: transform 1s;
}

.control {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
}

.control a {
  display: inline-block;
  cursor: pointer;
}

.control img {
  width: 60px;
  height: auto;
}
</style>
