import { reactive } from "vue";
import { jwtDecode } from "jwt-decode";

export const userState = reactive({
  name: localStorage.getItem("c_name") || "",
  isLoggedIn: !!localStorage.getItem("token"),
});

export function loginUserSession(name, token) {
  localStorage.setItem("c_name", name);
  localStorage.setItem("token", token);
  userState.name = name;
  userState.isLoggedIn = true;
}

export function logoutUserSession() {
  localStorage.removeItem("c_name");
  localStorage.removeItem("token");
  userState.name = "";
  userState.isLoggedIn = false;
}

/**
 * @param {string} url
 * @param {RequestInit} options
 * @returns Promise<Response>
 */
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
  } catch (error) {
    throw new Error(error.message);
  }
  if (!result.ok || json.status !== "success") {
    throw new Error(json.message || "Yêu cầu không thành công");
  }
  return json.data;
}

function makeUserService() {
  const baseUrl = "/api/users";

  async function registerUser(user) {
    return efetch(`${baseUrl}/register`, {
      method: "POST",
      body: JSON.stringify(user),
    });
  }

  async function loginUser(credentials) {
    const data = await efetch(`${baseUrl}/login`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return data;
  }

  async function getUserProfile() {
    const token = localStorage.getItem("token");
    let userId;
    try {
      const decoded = jwtDecode(token);
      console.log("Token payload:", decoded);
      userId = decoded._id;
      if (!userId) {
        throw new Error("Không tìm thấy userId trong token!");
      }
    } catch (error) {
      throw new Error("Token không hợp lệ: " + error.message);
    }

    return efetch(`${baseUrl}/${userId}`, {
      method: "GET",
    });
  }

  async function updateUser(user) {
    const token = localStorage.getItem("token");
    let userId;
    try {
      const decoded = jwtDecode(token);
      console.log("Token payload:", decoded);
      userId = decoded._id;
      if (!userId) {
        throw new Error("Không tìm thấy userId trong token!");
      }
    } catch (error) {
      throw new Error("Token không hợp lệ: " + error.message);
    }

    return efetch(`${baseUrl}/${userId}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  }

  async function resetPassword({ c_email, oldPassword, newPassword }) {
    return efetch(`${baseUrl}/reset-password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ c_email, oldPassword, newPassword }),
    });
  }

  return {
    registerUser,
    loginUser,
    getUserProfile,
    updateUser,
    resetPassword,
  };
}

export default makeUserService();
