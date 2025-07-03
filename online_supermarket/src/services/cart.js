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
    console.log("efetch json:", json);

    if (!result.ok) {
      throw new Error(json.message || "Fetch failed");
    }

    return json;
  } catch (error) {
    throw new Error(error.message);
  }
}

function makeCartService() {
  const baseUrl = "/api/cart";

  async function addToCart(productId, quantity) {
    return await efetch(`${baseUrl}/add`, {
      method: "POST",
      body: JSON.stringify({
        p_id: productId,
        cart_item_quantity: quantity,
      }),
    });
  }

  async function getCart() {
    return await efetch(`${baseUrl}/`, {
      method: "GET",
    });
  }

  async function updateCartItem(cartItemId, quantity) {
    return await efetch(`${baseUrl}/update`, {
      method: "PUT",
      body: JSON.stringify({
        cart_item_id: cartItemId,
        cart_item_quantity: quantity,
      }),
    });
  }

  async function removeCartItem(cartItemId) {
    return await efetch(`${baseUrl}/remove/${cartItemId}`, {
      method: "DELETE",
    });
  }

  async function checkout(shippingAddress, promotionCode = null) {
    return await efetch(`${baseUrl}/orders/checkout`, {
      method: "POST",
      body: JSON.stringify({
        shipping_address: shippingAddress,
        promotion_code: promotionCode,
      }),
    });
  }

  async function getCartByUserId() {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Vui lòng đăng nhập để xem giỏ hàng");
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
    const response = await efetch(`${baseUrl}/${userId}`, {
      method: "GET",
    });
    return response;
  }

  return {
    addToCart,
    getCart,
    getCartByUserId,
    updateCartItem,
    removeCartItem,
    checkout,
  };
}

export default makeCartService();
