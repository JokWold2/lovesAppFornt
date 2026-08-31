<template>
    <button type="button" class="button" @click="handleClick">
        <view class="points_wrapper" >
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <i class="point"></i>
            <view style="position: relative; left: -40rpx;" v-if="haslight">⚡</view>
        </view>
         <view style="width: 40rpx;" v-if="haslight"></view>
        <span class="inner">
            <svg v-if="false" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg" :stroke-linecap="'round'" :stroke-linejoin="'round'"
                stroke-width="2.5">
                <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37">
                </polyline>
            </svg>
            {{ text }}
            <template>
                <slot></slot>
            </template>
        </span>
    </button>
</template>
<script setup>
const props = defineProps({
    text: {
        type: String,
        default: ''
    },
    haslight: {
        type: Boolean,
        default: true
    }
})
const handleClick = () => {
    // 处理按钮点击事件
}
</script>
<style scoped>
.button {
    --h-button: 96rpx;
    --w-button: 204rpx;
    --round: 30rpx;
    cursor: pointer;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.25s ease;
    /* 替换紫色渐变为主色 #8e1f52 */
    background: radial-gradient(65.28% 65.28% at 50% 100%,
            rgba(142, 31, 82, 0.7) 0%,
            rgba(142, 31, 82, 0) 100%),
        linear-gradient(0deg, #8e1f52, #8e1f52);
    border-radius: var(--round);
    border: none;
    outline: none;
    padding: 24rpx 36rpx;
}
.button::before,
.button::after {
    content: "";
    position: absolute;
    inset: var(--space);
    transition: all 0.5s ease-in-out;
    border-radius: calc(var(--round) - var(--space));
    z-index: 0;
}
.button::before {
    --space: 2rpx;
    background: linear-gradient(177.95deg,
            rgba(255, 255, 255, 0.19) 0%,
            rgba(255, 255, 255, 0) 100%);
}
.button::after {
    --space: 4rpx;
    /* 同步替换径向渐变紫色 */
    background: radial-gradient(65.28% 65.28% at 50% 100%,
            rgba(142, 31, 82, 0.7) 0%,
            rgba(142, 31, 82, 0) 100%),
        linear-gradient(0deg, #8e1f52, #8e1f52);
}
.button:active {
    transform: scale(0.95);
}
.fold {
    z-index: 1;
    position: absolute;
    top: 0;
    right: 0;
    height: 20rpx;
    width: 20rpx;
    display: inline-block;
    transition: all 0.5s ease-in-out;
    /* 折叠角渐变替换 */
    background: radial-gradient(100% 75% at 55%,
            rgba(142, 31, 82, 0.7) 0%,
            rgba(142, 31, 82, 0) 100%);
    box-shadow: 0 0 6rpx black;
    border-bottom-left-radius: 20rpx;
    border-top-right-radius: var(--round);
}
.fold::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 150%;
    height: 150%;
    transform: rotate(45deg) translateX(0%) translateY(-36rpx);
    background-color: #e8e8e8;
    pointer-events: none;
}
.button:hover .fold {
    margin-top: -20rpx;
    margin-right: -20rpx;
}
.points_wrapper {
    overflow: hidden;
    width: 100%;
    height: 100%;
    pointer-events: none;
    position: absolute;
    z-index: 1;
}
.points_wrapper .point {
    bottom: -20rpx;
    position: absolute;
    animation: floating-points infinite ease-in-out;
    pointer-events: none;
    width: 4rpx;
    height: 4rpx;
    background-color: #fff;
    border-radius: 9999px;
}
@keyframes floating-points {
    0% {
        transform: translateY(0);
    }
    85% {
        opacity: 0;
    }
    100% {
        transform: translateY(-110rpx);
        opacity: 0;
    }
}
.points_wrapper .point:nth-child(1) {
    left: 10%;
    opacity: 1;
    animation-duration: 2.35s;
    animation-delay: 0.2s;
}
.points_wrapper .point:nth-child(2) {
    left: 30%;
    opacity: 0.7;
    animation-duration: 2.5s;
    animation-delay: 0.5s;
}
.points_wrapper .point:nth-child(3) {
    left: 25%;
    opacity: 0.8;
    animation-duration: 2.2s;
    animation-delay: 0.1s;
}
.points_wrapper .point:nth-child(4) {
    left: 44%;
    opacity: 0.6;
    animation-duration: 2.05s;
}
.points_wrapper .point:nth-child(5) {
    left: 50%;
    opacity: 1;
    animation-duration: 1.9s;
}
.points_wrapper .point:nth-child(6) {
    left: 75%;
    opacity: 0.5;
    animation-duration: 1.5s;
    animation-delay: 1.5s;
}
.points_wrapper .point:nth-child(7) {
    left: 88%;
    opacity: 0.9;
    animation-duration: 2.2s;
    animation-delay: 0.2s;
}
.points_wrapper .point:nth-child(8) {
    left: 58%;
    opacity: 0.8;
    animation-duration: 2.25s;
    animation-delay: 0.2s;
}
.points_wrapper .point:nth-child(9) {
    left: 98%;
    opacity: 0.6;
    animation-duration: 2.6s;
    animation-delay: 0.1s;
}
.points_wrapper .point:nth-child(10) {
    left: 65%;
    opacity: 1;
    animation-duration: 2.5s;
    animation-delay: 0.2s;
}
.inner {
    z-index: 2;
    gap: 12rpx;
    position: relative;
    width: 100%;
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: 500;
    line-height: 1.5;
    transition: color 0.2s ease-in-out;
}
.inner svg.icon {
    width: 36rpx;
    height: 36rpx;
    transition: fill 0.1s linear;
}
.button:focus svg.icon {
    fill: white;
}
.button:hover svg.icon {
    fill: transparent;
    animation:
        dasharray 1s linear forwards,
        filled 0.1s linear forwards 0.95s;
}
@keyframes dasharray {
    from {
        stroke-dasharray: 0 0 0 0;
    }
    to {
        stroke-dasharray: 68 68 0 0;
    }
}
@keyframes filled {
    to {
        fill: white;
    }
}
</style>