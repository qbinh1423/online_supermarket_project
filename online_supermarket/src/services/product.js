import NoImage from "@/assets/images/no-image.png";

async function efetch(url, options = {}) {
  let result = {};
  let json = {};

  const token = localStorage.getItem("token");

  options.headers = {
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete options.headers["Content-Type"];
  } else {
    options.headers["Content-Type"] = "application/json";
  }

  options.credentials = "include";

  try {
    result = await fetch(url, options);
    const contentType = result.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await result.text();
      throw new Error(`Phản hồi không phải JSON: ${text}`);
    }
    json = await result.json();
    return json;
  } catch (error) {
    throw new Error(error.message);
  }
}

function makeProductService() {
  const baseUrl = "http://localhost:5000/api/product";

  async function getAllProduct() {
    const data = await efetch(`${baseUrl}`, {
      method: "GET",
    });
    return data;
  }

  async function getProductById(id) {
    const product = await efetch(`${baseUrl}/${id}`, {
      method: "GET",
    });
    return product;
  }

  async function getProductByCategory(cate_name) {
    const encodedName = encodeURIComponent(cate_name);
    const product = await efetch(`${baseUrl}/category/${encodedName}`, {
      method: "GET",
    });
    return product;
  }

  async function getProductByBrand(br_name) {
    const encodedName = encodeURIComponent(br_name);
    const product = await efetch(`${baseUrl}/brand/${encodedName}`, {
      method: "GET",
    });
    return product;
  }

  async function searchByImage(imageFile, imageUrl) {
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("topK", 5);
      try {
        const response = await efetch(`${baseUrl}/similar`, {
          method: "POST",
          body: formData,
        });
        if (!response.data || !Array.isArray(response.data)) {
          console.error("Phản hồi API không hợp lệ:", response);
          return [];
        }
        return response.data.map((item) => ({
          id: item.id,
          name: item.name || "Không xác định",
          image:
            item.images && item.images.length > 0
              ? `http://localhost:5000${encodeURI(item.images[0])}`
              : NoImage,
          label: item.label || "Không xác định",
          similarity: item.similarity || 0,
          brand:
            item.brand && typeof item.brand === "object"
              ? item.brand.br_name || "Không xác định"
              : item.brand || "Không xác định",
          category:
            item.category && typeof item.category === "object"
              ? item.category.cate_name || "Không xác định"
              : item.category || "Không xác định",
          isInDatabase: item.id && /^[0-9a-fA-F]{24}$/.test(item.id),
        }));
      } catch (error) {
        console.error("Lỗi khi tìm kiếm bằng ảnh:", error.message);
        throw error;
      }
    } else if (imageUrl) {
      try {
        const response = await efetch(`${baseUrl}/similar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, topK: 5 }),
        });
        if (!response.data || !Array.isArray(response.data)) {
          console.error("Phản hồi API không hợp lệ:", response);
          return [];
        }
        return response.data.map((item) => ({
          id: item.id,
          name: item.name || "Không xác định",
          image:
            item.images && item.images.length > 0
              ? `http://localhost:5000${encodeURI(item.images[0])}`
              : NoImage,
          label: item.label || "Không xác định",
          similarity: item.similarity || 0,
          brand:
            item.brand && typeof item.brand === "object"
              ? item.brand.br_name || "Không xác định"
              : item.brand || "Không xác định",
          category:
            item.category && typeof item.category === "object"
              ? item.category.cate_name || "Không xác định"
              : item.category || "Không xác định",
          isInDatabase: item.id && /^[0-9a-fA-F]{24}$/.test(item.id),
        }));
      } catch (error) {
        console.error("Lỗi khi tìm kiếm bằng URL:", error.message);
        throw error;
      }
    } else {
      throw new Error("Vui lòng cung cấp file ảnh hoặc URL");
    }
  }

  async function deleteAllProducts() {
    return await efetch(`${baseUrl}/all`, {
      method: "DELETE",
    });
  }

  return {
    getAllProduct,
    getProductById,
    getProductByCategory,
    getProductByBrand,
    searchByImage,
    deleteAllProducts,
  };
}

export default makeProductService();
