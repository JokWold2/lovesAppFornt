<template>
    <view class="loader">
      <text>
        <template v-if="text">
          {{ text }}
        </template>
        <template v-else>
          <slot></slot>
        </template>
      </text>
    </view>
  </template>
  
  <script setup>
  // vue3 setup 无需额外逻辑，纯展示组件
  const props = defineProps({
    text: {
      type: String,
      default: ''
    }
  })
  </script>
  
  <style scoped>
  .loader {
    width: fit-content;
    color: #ffca27;
    font-size: 100rpx;
    /* 替换特殊字体，uniapp通用兜底 */
    font-family: sans-serif;
    position: relative;
    font-style: italic;
    font-weight: 600;
  }
  .loader text {
    display: inline-block;
    animation: cut 2s infinite;
    transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .loader:active {
    color: #fcffdf;
  }
  /* 上层实线扫描条 主色#8e1f52 */
  .loader::before {
    position: absolute;
    content: "";
    width: 100%;
    height: 10rpx;
    border-radius: 8rpx;
    background-color: #8e1f52;
    top: 0rpx;
    animation: scan 2s infinite;
    left: 0;
    z-index: 1;
    opacity: 0.9;
    transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  /* 下层模糊发光条 浅化主色 */
  .loader::after {
    position: absolute;
    content: "";
    width: 100%;
    height: 12rpx;
    border-radius: 8rpx;
    background-color: rgba(142, 31, 82, 0.55);
    top: 0rpx;
    filter: blur(20rpx);
    animation: scan 2s infinite;
    left: 0;
    z-index: 0;
    transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  /* 扫描位移动画 rpx适配 */
  @keyframes scan {
    0% {
      top: 0rpx;
    }
    25% {
      top: 108rpx;
    }
    50% {
      top: 0rpx;
    }
    75% {
      top: 108rpx;
    }
  }
  /* 文字裁切动画 */
  @keyframes cut {
    0% {
      clip-path: inset(0 0 0 0);
    }
    25% {
      clip-path: inset(100% 0 0 0);
    }
    50% {
      clip-path: inset(0 0 100% 0);
    }
    75% {
      clip-path: inset(0 0 0 0);
    }
  }
  </style>