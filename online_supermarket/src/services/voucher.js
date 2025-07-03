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

function makeVoucherService() {
  const baseUrl = "/api/voucher";

  async function getAllVouchers() {
    const data = await efetch(`${baseUrl}`, {
      method: "GET",
    });
    console.log("Fetched vouchers:", data);
    return data;
  }

  async function getVoucherCount() {
    const data = await efetch(`${baseUrl}/count`, {
      method: "GET",
    });
    console.log("Fetched voucher count:", data);
    return data;
  }

  async function getVoucherById(id) {
    const data = await efetch(`${baseUrl}/${id}`, {
      method: "GET",
    });
    console.log("Fetched voucher by ID:", data);
    return data;
  }

  async function addVoucher(voucher) {
    return await efetch(`${baseUrl}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(voucher),
    });
  }

  async function updateVoucher(id, formData) {
    return await efetch(`${baseUrl}/update/${id}`, {
      method: "PUT",
      body: formData,
    });
  }

  async function deleteVoucher(id) {
    return await efetch(`${baseUrl}/remove/${id}`, {
      method: "DELETE",
    });
  }

  return {
    getAllVouchers,
    getVoucherCount,
    getVoucherById,
    addVoucher,
    updateVoucher,
    deleteVoucher,
  };
}

export default makeVoucherService();
