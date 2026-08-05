<template>
  <view class="spinner" :class="{ checked }">
    <view class="spinner1"></view>
  </view>
</template>
<script setup>
const props = defineProps({
  checked: {
    type: Boolean,
    default: false
  }
})
</script>
<style scoped>
.spinner {
  /* 未勾選狀態漸變 */
  background-image: linear-gradient(rgb(230, 220, 196) 35%, rgb(255, 255, 255));
  width: 32px;
  height: 32px;
  animation: spinning82341 1.7s linear infinite;
  text-align: center;
  border-radius: 50px;
  filter: blur(1px);
  box-shadow: 0px -5px 20px 0px rgb(230, 220, 196), 0px 5px 20px 0px rgb(255, 255, 255);
}
/* 勾選後主色 #fff6df */
.spinner.checked {
  background-image: linear-gradient(#fff6df 35%, #fff6df);
  box-shadow: 0px -5px 20px 0px #fff6df, 0px 5px 20px 0px #fff6df;
}
.spinner1 {
  background-color: rgb(255, 255, 255);
  width: 32px;
  height: 32px;
  border-radius: 50px;
  filter: blur(10px);
}
@keyframes spinning82341 {
  to {
    transform: rotate(360deg);
  }
}
</style>