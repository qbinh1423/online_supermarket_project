<script setup>
import { ref } from "vue";
import { onMounted } from "vue";
import voucherService from "@/services/voucher";

const discountCodes = ref([]);

onMounted(async () => {
  try {
    const response = await voucherService.getAllVouchers();
    console.log("Voucher API response:", response);
    const currentDate = new Date();
    discountCodes.value = response
      .filter((v) => new Date(v.v_expiry_date) >= currentDate)
      .map((v) => ({
        code: v.v_name,
        count: v.v_stock_quantity,
        description: v.v_description,
        validUntil: new Date(v.v_expiry_date).toLocaleDateString("vi-VN"),
      }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách voucher:", error.message);
  }
});
</script>

<template>
  <div class="tab-content">
    <h2>Mã giảm giá</h2>
    <div class="discount-list">
      <div v-if="discountCodes.length === 0" class="no-discounts">
        Không có mã giảm giá nào.
      </div>
      <div v-else class="discount-grid">
        <div
          v-for="(code, index) in discountCodes"
          :key="index"
          class="discount-item"
        >
          <div class="code-count">{{ `x${code.count}` }}</div>
          <div class="code-section">
            <span class="code">{{ code.code }}</span>
          </div>
          <div class="details-section">
            <p class="description">{{ code.description }}</p>
            <p class="validity">Hiệu lực: {{ code.validUntil }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.tab-content {
  padding: 20px;
  font-size: 16px;
  height: 700px;
  overflow-y: auto;
}

.discount-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.discount-list {
  min-height: 200px;
}

.no-discounts {
  text-align: center;
  font-size: 18px;
  color: #666;
  padding: 20px;
}

.discount-grid {
  display: grid;
  align-items: center;
  justify-content: center;
  grid-template-columns: repeat(2, 12fr);
  gap: 5px;
}

.discount-item {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  background-color: white;
  height: 130px;
  width: 330px;
  position: relative;
}

.code-count {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 14px;
  font-weight: bold;
  color: #d4575d;
  background-color: #ffd8da;
  padding: 2px 8px;
  border-radius: 10px;
}

.code-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  width: 120px;
  border-radius: 5px;
}

.code {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #6399a9;
  word-break: break-all;
  line-height: 1.2;
  padding: 5px;
  margin: 2px;
}

.details-section {
  flex: 2;
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.description {
  font-size: 14px;
  color: #333;
  margin: 0 0 5px 0;
}

.validity {
  font-size: 12px;
  color: #666;
  margin: 0;
}
</style>
