<template>
    <view class="spinner" :tyle="{animationDuration: duration + 's'}">
      <view></view>
      <view></view>
      <view></view>
      <view></view>
      <view></view>
      <view></view>
    </view>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  const props = defineProps({
    duration: {
      type: Number,
      default: 18
    }
  })
  // uniapp vue3 无需额外逻辑，纯样式loading组件
  </script>
  
  <style scoped>
  /* From Uiverse.io by bociKond 适配uniapp + 修改主色 #8e1f52 */
  .spinner {
    width: 70.4px;
    height: 70.4px;
    --clr: #8e1f52;
    --clr-alpha: rgba(142, 31, 82, 0.1);
    animation: spinner 25s infinite ease;
    transform-style: preserve-3d;
  }
  .spinner > view {
    background-color: var(--clr-alpha);
    height: 100%;
    position: absolute;
    width: 100%;
    border: 3.5px solid var(--clr);
  }
  .spinner view:nth-of-type(1) {
    transform: translateZ(-35.2px) rotateY(180deg);
  }
  .spinner view:nth-of-type(2) {
    transform: rotateY(-270deg) translateX(50%);
    transform-origin: top right;
  }
  .spinner view:nth-of-type(3) {
    transform: rotateY(270deg) translateX(-50%);
    transform-origin: center left;
  }
  .spinner view:nth-of-type(4) {
    transform: rotateX(90deg) translateY(-50%);
    transform-origin: top center;
  }
  .spinner view:nth-of-type(5) {
    transform: rotateX(-90deg) translateY(50%);
    transform-origin: bottom center;
  }
  .spinner view:nth-of-type(6) {
    transform: translateZ(35.2px);
  }
  @keyframes spinner {
    0% {
      transform: rotate(45deg) rotateX(-25deg) rotateY(25deg);
    }
    50% {
      transform: rotate(45deg) rotateX(-385deg) rotateY(25deg);
    }
    100% {
      transform: rotate(45deg) rotateX(-385deg) rotateY(385deg);
    }
  }
  </style>