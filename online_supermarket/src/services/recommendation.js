import cartService from "./cart";

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
    console.log("Fetching URL:", url, "with options:", options);
    result = await fetch(url, options);
    json = await result.json();
    console.log("efetch json:", json);

    if (!result.ok) {
      throw new Error(json.message || "Fetch failed");
    }

    return json;
  } catch (error) {
    console.error("efetch error:", error);
    throw new Error(error.message);
  }
}

function makeRecommendationService() {
  const baseUrl = "/api/cart";

  async function getRecommendedProducts() {
    try {
      const cartResponse = await cartService.getCartByUserId();
      console.log("Cart response:", cartResponse);

      if (
        !cartResponse.data ||
        !cartResponse.data.cart ||
        !cartResponse.data.cart._id
      ) {
        throw new Error("No cart found for the user");
      }

      const cartId = cartResponse.data.cart._id;
      console.log("Using cartId:", cartId);

      if (!cartResponse.data.items || cartResponse.data.items.length === 0) {
        console.log("Cart is empty, returning null for random suggestions");
        return null;
      }

      const response = await efetch(
        `${baseUrl}/${cartId}/recommended-products`,
        {
          method: "GET",
        }
      );
      console.log("Recommended products response:", response);
      return response;
    } catch (error) {
      console.error("Error fetching recommended products:", error);
      throw new Error(`Failed to fetch recommended products: ${error.message}`);
    }
  }

  return {
    getRecommendedProducts,
  };
}

export default makeRecommendationService();
