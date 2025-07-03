import "bootstrap/dist/js/bootstrap.bundle";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/router";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";


const app = createApp(App);
const queryClient = new QueryClient();
app.use(VueQueryPlugin, {
  queryClient,
});

app.config.errorHandler = (err, vm, info) => {
  console.error("Vue error:", err);
  console.error("In component:", vm);
  console.error("Info:", info);
};

app.use(router);
app.mount("#app");
