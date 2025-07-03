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

function makeBrandService() {
  const baseUrl = "/api/brand";

  async function addBrand(brand) {
    return await efetch(`${baseUrl}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brand),
    });
  }

  async function getAllBrands() {
    const data = await efetch(`${baseUrl}`, {
      method: "GET",
    });
    return data;
  }

  async function updateBrand(id, formData) {
    return await efetch(`${baseUrl}/update/${id}`, {
      method: "PUT",
      body: formData,
    });
  }

  async function deleteBrand(id) {
    return await efetch(`${baseUrl}/${id}`, {
      method: "DELETE",
    });
  }

  return {
    addBrand,
    updateBrand,
    getAllBrands,
    deleteBrand,
  };
}

export default makeBrandService();
