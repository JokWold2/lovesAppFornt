<template>
    <button @click="handleClick" class="button">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text"> {{ text }} </span>
    </button>
</template>

<script setup>
const props = defineProps({
    text: {
        type: String,
        default: '+'
    }
})
const handleClick = () => {
    // 处理按钮点击事件
}
</script>

<style scoped lang="scss">
.button {
    position: relative;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    outline-offset: 8rpx;
    transition: filter 250ms;
    user-select: none;
    touch-action: manipulation;
}

.shadow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 24rpx;
    background: hsl(0deg 0% 0% / 0.25);
    will-change: transform;
    transform: translateY(4rpx);
    transition: transform 600ms cubic-bezier(.3, .7, .4, 1);
}

.edge {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 24rpx;
    /* 基于#8e1f52调配上下渐变深色边框 */
    background: linear-gradient(to left,
            #591333 0%,
            #8e1f52 8%,
            #8e1f52 92%,
            #591333 100%);
}

.front {
    display: block;
    position: relative;
    padding: 0rpx 24rpx;
    border-radius: 24rpx;
    font-size: 35rpx;
    color: white;
    /* 主色 #8e1f52 */
    background: #8e1f52;
    will-change: transform;
    transform: translateY(-8rpx);
    transition: transform 600ms cubic-bezier(.3, .7, .4, 1);
}

.button:hover {
    filter: brightness(110%);
}

.button:hover .front {
    transform: translateY(-12rpx);
    transition: transform 250ms cubic-bezier(.3, .7, .4, 1.5);
}

.button:active .front {
    transform: translateY(-4rpx);
    transition: transform 34ms;
}

.button:hover .shadow {
    transform: translateY(8rpx);
    transition: transform 250ms cubic-bezier(.3, .7, .4, 1.5);
}

.button:active .shadow {
    transform: translateY(2rpx);
    transition: transform 34ms;
}

.button:focus:not(:focus-visible) {
    outline: none;
}
</style>