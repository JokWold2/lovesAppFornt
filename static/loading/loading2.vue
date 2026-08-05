<template>
  <view class="loader">
    <view class="cup">
      <view class="cup-handle"></view>
      <view class="smoke one"></view>
      <view class="smoke two"></view>
      <view class="smoke three"></view>
    </view>
    <view class="load">Loading...</view>
  </view>
</template>

<script setup>
</script>

<style scoped>
.loader {
  width: 200rpx;
  /* height: 160rpx; */
  position: relative;
  display: flex;
  justify-items: center;
  align-items: center;
}
.loader .cup {
  position: absolute;
  width: 50rpx;
  height: 36rpx;
  background-color: #fff;
  border: 2rpx solid #2e2e2e;
  z-index: 1;
  border-radius: 4rpx 4rpx 20rpx 20rpx;
  animation: expansion 6s infinite ease-in-out;
  transform-origin: center;
}

.cup::after {
  content: "";
  position: absolute;
  top: -4rpx;
  width: calc(100% - 4rpx);
  height: 4rpx;
  background: #fed59fca;
  border: 2rpx solid #2e2e2ebe;
  border-radius: 50%;
}
.cup::before {
  content: "";
  position: absolute;
  top: 30rpx;
  width: calc(100% - 4rpx);
  height: 8rpx;
  background: #ffffff00;
  border: 2rpx solid #2e2e2e;
  border-top: none;
  border-radius: 50%;
  z-index: -1;
}

.loader .cup .cup-handle {
  position: absolute;
  width: 10rpx;
  height: 20rpx;
  background-color: #fff;
  border: 2rpx solid #2e2e2e;
  right: -10rpx;
  top: 4rpx;
  border-radius: 4rpx 20rpx 40rpx 4rpx;
}

.loader .cup .smoke {
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 30rpx;
  height: 50rpx;
  background: rgba(107, 102, 102, 0.433);
  border-radius: 50%;
  transform: translateX(-50%);
  animation: rise 6s infinite ease-in-out;
  filter: blur(16rpx);
}

.loader .cup .smoke.one {
  animation-delay: 0s;
}
.loader .cup .smoke.two {
  animation-delay: 1s;
}
.loader .cup .smoke.three {
  animation-delay: 2s;
}

.loader .load {
  position: absolute;
  font-size: 20rpx;
  opacity: 0.7;
  top: 45%;
  left: 50%;
  transform: translateX(-50%);
  z-index: -1;
}

@keyframes expansion {
  0% {
    width: 50rpx;
    transform: translateX(0);
  }
  40% {
    width: 200rpx;
    transform: translateX(0);
  }
  80% {
    width: 50rpx;
    transform: translateX(128rpx);
  }
  90% {
    width: 200rpx;
    transform: translateX(0);
  }
  100% {
    width: 50rpx;
    transform: translateX(0);
  }
}

@keyframes rise {
  0% {
    transform: translate(-50%, 0) scale(0.4);
    opacity: 0;
  }
  30% {
    opacity: 0.7;
  }
  60% {
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -120px) scale(1);
    opacity: 0;
  }
}
</style>
