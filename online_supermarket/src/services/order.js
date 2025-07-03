async function efetch(url, options = {}) {
  let result = {};
  let json = {};

  const token = localStorage.getItem("token");

  options.headers = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
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

function makeOrderService() {
  const baseUrl = "/api/order";

  async function createOrder(orderData) {
    return await efetch(`${baseUrl}`, {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async function addOrderItem(orderItemData) {
    return await efetch(`${baseUrl}/items`, {
      method: "POST",
      body: JSON.stringify(orderItemData),
    });
  }

  async function updateOrder(orderId, updateData) {
    return await efetch(`${baseUrl}/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async function updateOrderItem(orderDetailId, updateData) {
    return await efetch(`${baseUrl}/items/${orderDetailId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async function updateOrderStatus(orderId, statusData) {
    return await efetch(`${baseUrl}/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  }

  async function deleteOrder(orderId) {
    return await efetch(`${baseUrl}/${orderId}`, {
      method: "DELETE",
    });
  }

  async function getAllOrder({ page = 1, limit = 10, status = null }) {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      query.append("status", status);
    }
    return await efetch(`${baseUrl}?${query.toString()}`, {
      method: "GET",
    });
  }

  async function getOrderByIdCustomer(cId, { page = 1, limit = 10 }) {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return await efetch(`${baseUrl}/customer/${cId}?${query.toString()}`, {
      method: "GET",
    });
  }

  async function getCountOrder(status) {
    return await efetch(`${baseUrl}/count/${status}`, {
      method: "GET",
    });
  }

  async function getOrderDetail(orderId) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${baseUrl}/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Server Error:", res.status, text);
      throw new Error(`Không thể lấy chi tiết đơn hàng (Status ${res.status})`);
    }

    return await res.json();
  }

  async function getOrdersByStatus(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const response = await fetch(`${baseUrl}${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || "Failed to fetch orders");
    }

    return json.data.orders || [];
  }

  return {
    createOrder,
    addOrderItem,
    updateOrder,
    updateOrderItem,
    updateOrderStatus,
    deleteOrder,
    getAllOrder,
    getOrderByIdCustomer,
    getCountOrder,
    getOrderDetail,
    getOrdersByStatus,
  };
}

export default makeOrderService();
