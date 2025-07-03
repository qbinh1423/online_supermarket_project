import { jwtDecode } from "jwt-decode";

async function efetch(url, options = {}) {
  let result = {};
  let json = {};

  const token = localStorage.getItem("token");

  options.headers = {
    ...options.headers,
    "Content-Type": "application/json",
  };

  options.credentials = "include";

  try {
    result = await fetch(url, options);
    json = await result.json();
    console.log("efetch result:", result);
    console.log("efetch json:", json);

    if (!result.ok) {
      throw new Error(json.message || "Fetch failed");
    }

    return json;
  } catch (error) {
    throw new Error(error.message);
  }
}

function makeReviewService() {
  const baseUrl = "/api/reviews";
  const productBaseUrl = "/api/product";

  async function addReview(formData) {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/reviews/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Phản hồi không phải JSON:\n${text}`);
    }

    const result = await response.json();
    return result;
  }

  async function getReviewByProduct(p_id) {
    return await efetch(`${baseUrl}/product/${p_id}`, {
      method: "GET",
    });
  }

  async function getAllReview() {
    return await efetch(baseUrl, { method: "GET" });
  }

  async function getProductReviews(productId) {
    return await efetch(`${productBaseUrl}/${productId}/reviews`, {
      method: "GET",
    });
  }

  async function deleteReview(id) {
    const response = await fetch(`${baseUrl}/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to delete review");
    }

    return result;
  }

  async function replyToReview(reviewId, content, username = "Admin") {
    const res = await fetch(`${baseUrl}/${reviewId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, username }),
    });
    return await res.json();
  }

  async function updateReply(reviewId, replyId, content) {
    const response = await fetch(`${baseUrl}/${reviewId}/replies/${replyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update reply: ${error}`);
    }

    return await response.json();
  }

  async function deleteReply(reviewId, replyId) {
    const response = await fetch(`${baseUrl}/${reviewId}/replies/${replyId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete reply");
    }

    return await response.json();
  }

  async function getReviewsByUserId() {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Vui lòng đăng nhập để xem đánh giá");
    }
    let userId;
    try {
      const decoded = jwtDecode(token);
      console.log("Token payload:", decoded);
      userId = decoded._id;
      if (!userId) {
        throw new Error("Không tìm thấy userId trong token!");
      }
    } catch (error) {
      console.error("Token decode error:", error);
      throw new Error("Token không hợp lệ: " + error.message);
    }
    return await efetch(`${baseUrl}/user/${userId}`, {
      method: "GET",
    });
  }

  return {
    addReview,
    getReviewByProduct,
    getAllReview,
    getProductReviews,
    deleteReview,
    replyToReview,
    updateReply,
    deleteReply,
    getReviewsByUserId,
  };
}

export default makeReviewService();
