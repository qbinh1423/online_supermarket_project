import { reactive } from "vue";

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
