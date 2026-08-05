<template>
  <!-- 新增外层透视容器，所有3D透视作用在这里 -->
  <view class="cube-perspective">
    <view class="cube-loader">
      <view class="cube-top"></view>
      <view class="cube-wrapper">
        <view class="cube-span"></view>
        <view class="cube-span"></view>
        <view class="cube-span"></view>
        <view class="cube-span"></view>
      </view>
    </view>
  </view>
</template>

<script setup></script>

<style scoped>
/* 透视容器统一管理3D视角，解决梯形变形核心 */
.cube-perspective {
  width: 150rpx;
  height: 150rpx;
  perspective: 2000rpx;   /* 原为 600rpx，增大后变形减轻 */
  perspective-origin: center center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cube-loader {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform: rotateX(-30deg);
  animation: animate 19s linear infinite;
}

@keyframes animate {
  0% {
    transform: rotateX(-30deg) rotateY(0deg);
  }
  100% {
    transform: rotateX(-30deg) rotateY(360deg);
  }
}

.cube-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.cube-span {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  /* 渐变替换为 #8e1f52 紫红色系渐变，从深到浅过渡 */
  background: linear-gradient(
    to bottom,
    #470f29 0%,
    #5c1436 5.5%,
    #6b183f 12.1%,
    #761a46 19.6%,
    #7e1c4c 27.9%,
    #841d4f 36.6%,
    #881e51 45.6%,
    #8e1f52 54.6%,
    #972359 63.4%,
    #9f2760 71.7%,
    #a62b66 79.4%,
    #ab2f6b 86.2%,
    #af326f 91.9%,
    #b23472 96.3%,
    #b33573 99%,
    #b43674 100%
  );
}
/* 四个侧面标准90°旋转，正方体四边等宽 */
.cube-span:nth-child(1) { transform: rotateY(0deg) translateZ(75rpx); }
.cube-span:nth-child(2) { transform: rotateY(90deg) translateZ(75rpx); }
.cube-span:nth-child(3) { transform: rotateY(180deg) translateZ(75rpx); }
.cube-span:nth-child(4) { transform: rotateY(270deg) translateZ(75rpx); }

/* 顶面标准正方形，无拉伸，底色改为主深色 #8e1f52 深色版 */
.cube-top {
  position: absolute;
  width: 150rpx;
  height: 150rpx;
  background: #470f29;
  transform: rotateX(90deg) translateZ(75rpx);
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

/* 阴影发光同步替换为主色调 #8e1f52，取消注释即可使用 */
/*   
  .cube-top::before {
    content: '';
    position: absolute;
    width: 150rpx;
    height: 150rpx;
    background: #8e1f52;
    transform: translateZ(-100rpx);
    box-shadow: 
      0 0 15rpx #2c0918,
      0 0 30rpx #8e1f52,
      0 0 50rpx #2c0918,
      0 0 70rpx #8e1f52;
  } */
</style>