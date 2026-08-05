<template>
  <view class="loader">
    <view class="circle">
      <view class="circle-inner"></view>
      <view class="circle-mask"></view>
    </view>
  </view>
</template>

<script setup>
</script>

<style scoped>
.loader {
  position: relative;
  width: 200px;
  height: 200px;
  background: #c9d5e0;
  border-radius: 50px;
  overflow: hidden;
  transform-style: preserve-3d;
  mix-blend-mode: hard-light;
  box-shadow:
    25px 25px 25px -5px rgba(0, 0, 0, 0.15),
    inset 15px 15px 10px rgba(255, 255, 255, 0.75),
    -15px -15px 30px rgba(255, 255, 255, 0.55),
    inset -1px -1px 10px rgba(0, 0, 0, 0.2);
}

.circle {
  position: absolute;
  top: 35px;
  right: 35px;
  bottom: 35px;
  left: 35px;
  background: #acbaca;
  border-radius: 50%;
  transform-style: preserve-3d;
  box-shadow:
    5px 5px 15px 0 #152b4a66,
    inset 5px 5px 5px rgba(255, 255, 255, 0.55),
    -6px -6px 10px rgba(255, 255, 255, 1);
}

.circle-inner {
  position: absolute;
  top: 4px;
  right: 4px;
  bottom: 4px;
  left: 4px;
  background: linear-gradient(#2196f3, #e91e63);
  mix-blend-mode: color-burn;
  border-radius: 50%;
  animation: anim 2s linear infinite;
}

.circle-mask {
  position: absolute;
  top: 25px;
  right: 25px;
  bottom: 25px;
  left: 25px;
  filter: blur(0.9px);
  background: #acbaca;
  border-radius: 50%;
  z-index: 1000;
}

@keyframes anim {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
