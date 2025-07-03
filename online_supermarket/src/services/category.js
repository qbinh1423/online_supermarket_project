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

    return json;
  } catch (error) {
    throw new Error(error.message);
  }
}

function makeCategoryService() {
  const baseUrl = "/api/category";

  async function getAllCategory() {
    const data = await efetch(`${baseUrl}`, {
      method: "GET",
    });
    return data;
  }

  async function getCategoryById(id) {
    const data = await efetch(`${baseUrl}/${id}`, {
      method: "GET",
    });
    return data;
  }

  return {
    getAllCategory,
    getCategoryById,
  };
}

export default makeCategoryService();
