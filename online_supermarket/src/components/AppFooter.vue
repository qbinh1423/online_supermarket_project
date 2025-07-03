<script setup></script>
<template>
  <div class="container-fluid footer-container">
    <div class="container text-center">
      <div class="row row-cols-3">
        <div class="col time">
          <p class="title mt-4">Thời gian</p>
          <p>8h - 19h (Thứ 2 - Thứ 6)</p>
          <p>8h - 17h30 (Thứ 7, CN)</p>
        </div>
        <div class="col account">
          <p class="title mt-4">Quản lý tài khoản</p>
          <router-link to="/user/account-info"> Thay đổi thông tin </router-link
          ><br />
          <router-link to="/cart"> Quản lý giỏ hàng </router-link>
        </div>
        <div class="col contact">
          <p class="title mt-4">Liên hệ hỗ trợ</p>
          <p>Nguyễn Trần Quang Bình (0123456789)</p>
          <p>Bùi Ngọc Trúc (0123456789)</p>
          <p>Kiều Hoàng Giang (0123456789)</p>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.footer-container {
  padding-bottom: 20px;
  height: 100%;
  background-color: #454545;
  color: white;
}

.col {
  text-align: left;
  font-family: "Roboto", sans-serif;
}

.col .title {
  font-weight: bold;
  font-size: 24px;
}

.col a {
  display: block;
  width: 50%;
  text-decoration: none;
  color: white;
  font-size: 16px;
}
</style>
