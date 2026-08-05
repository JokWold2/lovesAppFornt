<template>
    <view class="wrapper-grid">
      <view class="cube" v-if="text.length > 0">
        <view class="face face-front">{{ text.slice(0, 1) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 1">
        <view class="face face-front">{{ text.slice(1, 2) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 2">
        <view class="face face-front">{{ text.slice(2, 3) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 3">
        <view class="face face-front">{{ text.slice(3, 4) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 4">
        <view class="face face-front">{{ text.slice(4, 5) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 5">
        <view class="face face-front">{{ text.slice(5, 6) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
  
      <view class="cube" v-if="text.length > 6">
        <view class="face face-front">{{ text.slice(6, 7) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 7">
        <view class="face face-front">{{ text.slice(7, 8) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 8">
        <view class="face face-front">{{ text.slice(8, 9) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 9">
        <view class="face face-front">{{ text.slice(9, 10) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 10">
        <view class="face face-front">{{ text.slice(10, 11) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 11">
        <view class="face face-front">{{ text.slice(11, 12) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 12">
        <view class="face face-front">{{ text.slice(12, 13) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 13">
        <view class="face face-front">{{ text.slice(13, 14) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 14">
        <view class="face face-front">{{ text.slice(14, 15) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
      <view class="cube" v-if="text.length > 15">
        <view class="face face-front">{{ text.slice(15, 16) }}</view>
        <view class="face face-back"></view>
        <view class="face face-right"></view>
        <view class="face face-left"></view>
        <view class="face face-top"></view>
        <view class="face face-bottom"></view>
      </view>
    </view>
  </template>
  
  <script setup>
  const props = defineProps({
    text: {
      type: String,
      default: 'LOVE'
    }
  })
  // 无需逻辑代码，纯样式动画组件
  </script>
  
  <style scoped>
  .wrapper-grid {
    --animation-duration: 5.1s;
    --cube-color: transparent;
    /* 主色调修改为 #8e1f52 */
    --highlight-color: #8e1f52;
    --cube-width: 96rpx;
    --cube-height: 96rpx;
    --font-size: 36rpx;
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, var(--cube-width));
    grid-template-rows: auto;
    grid-gap: 0;
    width: calc(7 * var(--cube-width));
    height: var(--cube-height);
    perspective: 700rpx;
    font-size: var(--font-size);
    font-weight: 800;
    color: transparent;
  }
  
  .cube {
    position: relative;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
  }
  
  .face {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--cube-width);
    height: var(--cube-height);
    background-color: var(--cube-color);
  }
  
  .face-left,
  .face-right,
  .face-back,
  .face-front {
    box-shadow:
      inset 0 0 4rpx 2rpx rgba(0, 0, 0, 0.05),
      inset 0 0 24rpx 2rpx rgba(255, 255, 255, 0.05);
  }
  
  .face-front {
    transform: rotateY(0deg) translateZ(calc(var(--cube-width) / 2));
  }
  .face-back {
    transform: rotateY(180deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.6;
  }
  .face-left {
    transform: rotateY(-90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.6;
  }
  .face-right {
    transform: rotateY(90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.6;
  }
  .face-top {
    height: var(--cube-width);
    transform: rotateX(90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.8;
  }
  .face-bottom {
    height: var(--cube-width);
    transform: rotateX(-90deg) translateZ(calc(var(--cube-height) - var(--cube-width) * 0.5));
    opacity: 0.8;
  }
  
  /* 依次延迟动画 */
  .cube:nth-child(1) {
    z-index: 0;
    animation-delay: 0s;
  }
  .cube:nth-child(2) {
    z-index: 1;
    animation-delay: 0.2s;
  }
  .cube:nth-child(3) {
    z-index: 2;
    animation-delay: 0.4s;
  }
  .cube:nth-child(4) {
    z-index: 3;
    animation-delay: 0.6s;
  }
  .cube:nth-child(5) {
    z-index: 2;
    animation-delay: 0.8s;
  }
  .cube:nth-child(6) {
    z-index: 1;
    animation-delay: 1s;
  }
  .cube:nth-child(7) {
    z-index: 0;
    animation-delay: 1.2s;
  }
  .cube:nth-child(8) {
    z-index: 3;
    animation-delay: 1.4s;
  }
  .cube:nth-child(9) {
    z-index: 2;
    animation-delay: 1.6s;
  }
  .cube:nth-child(10) {
    z-index: 1;
    animation-delay: 1.8s;
  }
  .cube:nth-child(11) {
    z-index: 0;
    animation-delay: 2s;
  }
  .cube:nth-child(12) {
    z-index: 3;
    animation-delay: 2.2s;
  }
  .cube:nth-child(13) {
    z-index: 2;
    animation-delay: 2.4s;
  }
  .cube:nth-child(14) {
    z-index: 1;
    animation-delay: 2.6s;
  }
  .cube:nth-child(15) {
    z-index: 0;
    animation-delay: 2.8s;
  }
  .cube:nth-child(16) {
    z-index: 3;
    animation-delay: 3s;
  }
  .cube {
    animation: translate-z var(--animation-duration) ease-in-out infinite;
  }
  .cube .face {
    animation:
      face-color var(--animation-duration) ease-in-out infinite,
      edge-glow var(--animation-duration) ease-in-out infinite;
    animation-delay: inherit;
  }
  .cube .face.face-front {
    animation:
      face-color var(--animation-duration) ease-in-out infinite,
      face-glow var(--animation-duration) ease-in-out infinite,
      edge-glow var(--animation-duration) ease-in-out infinite;
    animation-delay: inherit;
  }
  
  @keyframes translate-z {
    0%,
    40%,
    100% {
      transform: translateZ(-4rpx);
    }
    30% {
      transform: translateZ(32rpx) translateY(-2rpx);
    }
  }
  
  @keyframes face-color {
    0%,
    50%,
    100% {
      background-color: var(--cube-color);
    }
    10% {
      background-color: var(--highlight-color);
    }
  }
  
  @keyframes face-glow {
    0%,
    50%,
    100% {
      color: rgba(255, 255, 255, 0);
      filter: none;
    }
    30% {
      color: #ffffff;
      filter: drop-shadow(0 28rpx 20rpx var(--highlight-color));
    }
  }
  
  @keyframes edge-glow {
    0%,
    40%,
    100% {
      box-shadow:
        inset 0 0 4rpx 2rpx rgba(0, 0, 0, 0.05),
        inset 0 0 24rpx 2rpx rgba(255, 255, 255, 0.05);
    }
    30% {
      box-shadow: 0 0 4rpx 0rpx var(--highlight-color);
    }
  }
  </style>