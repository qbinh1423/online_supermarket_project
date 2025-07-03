<script setup>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
</script>

<template>
  <header>
    <AppHeader />
  </header>
  <main class="errorpage">
    <div class="container-fluid error-container">
      <img src="@/assets/images/error-img.png" alt="" />
    </div>
  </main>
  <footer>
    <AppFooter />
  </footer>
</template>

<style scoped>
.errorpage {
    overflow-y: hidden;
}

.error-container {
  max-width: 1200px;
  min-height: 100%;
  margin: 30px auto 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-container img {
  width: 75%;
  height: 75%;
}
</style>
