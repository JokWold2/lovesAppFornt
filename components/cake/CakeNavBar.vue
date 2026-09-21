<template>
  <view class="cake-nav-host">
    <view class="cake-nav" :style="hostStyle">
      <!-- 毛玻璃表面：随滚动进度渐显，回到顶部渐隐 -->
      <view class="cake-nav-surface" :style="{ opacity: glassOpacity }" aria-hidden="true"></view>
      <view class="cake-nav-row">
        <view class="cake-nav-side">
          <button v-if="showBack" class="cake-nav-btn" :aria-label="t('cake.back')" @click="onBack">
            <uni-icons type="left" :size="20" :color="iconColor" />
          </button>
          <button v-if="showHome" class="cake-nav-btn" :aria-label="t('cake.tabHome')" @click="onHome">
            <uni-icons type="home" :size="20" :color="iconColor" />
          </button>
          <slot name="left" />
        </view>
        <view class="cake-nav-center">
          <text v-if="title" class="cake-nav-title" :style="{ opacity: titleOpacity }">{{ title }}</text>
          <slot name="center" />
        </view>
        <view class="cake-nav-side is-right">
          <button v-if="showSearch" class="cake-nav-btn" :aria-label="t('cake.searchProductPlaceholder')" @click="emit('search')">
            <uni-icons type="search" :size="20" :color="iconColor" />
          </button>
          <slot name="right" />
        </view>
      </view>
      <view v-if="$slots.bottom" class="cake-nav-bottom"><slot name="bottom" /></view>
      <!-- 紧邻下缘的渐隐，避免滚动内容贴着导航硬切 -->
      <view class="cake-nav-fade" :style="{ opacity: glassOpacity }" aria-hidden="true"></view>
    </view>
    <view v-if="spacer" class="cake-nav-spacer" :style="{ height: spacerHeight }" aria-hidden="true"></view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import { readPageHeaderInset } from '@/utils/pageHeaderLayout.js'
import { CAKE_ROUTES, switchCakeTab } from '@/utils/cake.js'

const props = defineProps({
  title: { type: String, default: '' },
  // 0（完全透明）→ 1（毛玻璃完全显形），由页面从滚动位置换算
  progress: { type: Number, default: 1 },
  tone: { type: String, default: 'dark' },
  showBack: { type: Boolean, default: false },
  showHome: { type: Boolean, default: false },
  showSearch: { type: Boolean, default: false },
  spacer: { type: Boolean, default: true },
  // 底部插槽（搜索栏 / 分类栏）的预估高度，只用于首帧占位；真实高度挂载后测量
  bottomHeight: { type: Number, default: 0 },
  zIndex: { type: Number, default: 60 }
})

const emit = defineEmits(['back', 'home', 'search', 'height'])

const instance = getCurrentInstance()
const topInset = ref(readPageHeaderInset(uni))
const rowHeight = 44
// 导航栏实际高度（含状态栏 / 胶囊区与底部插槽）由测量得出，避免翻译后文案换行导致正文被遮挡。
const measuredHeight = ref(0)
let disposed = false, pending = false, generation = 0, settleTimer = null

function measure() {
  if (disposed || typeof uni?.createSelectorQuery !== 'function') return
  if (pending) return
  pending = true
  const request = ++generation
  nextTick(() => {
    pending = false
    if (disposed) return
    let query = uni.createSelectorQuery()
    if (instance?.proxy && query.in) query.in(instance.proxy)
    query.select('.cake-nav').boundingClientRect(rect => {
      if (disposed || request !== generation || !rect?.height) return
      const height = Math.ceil(rect.height)
      if (height !== measuredHeight.value) measuredHeight.value = height
    }).exec()
  })
}

onMounted(() => {
  measure()
  // 小程序端首次测量时节点树可能还没就绪，这里再补测一次让占位高度收敛。
  settleTimer = setTimeout(measure, 180)
})
// 组件里不能用 onShow / onResize 这类页面生命周期，改为跟随会影响高度的 props 重测。
watch(() => [props.spacer, props.bottomHeight, props.title, props.showSearch], measure, { flush: 'post' })
// 把实测高度报给页面，让全屏内容（例如地图）能精确算出剩余高度。
watch(measuredHeight, value => { if (value) emit('height', value) })
onBeforeUnmount(() => {
  disposed = true
  generation++
  clearTimeout(settleTimer)
})

const isLightTone = computed(() => props.tone === 'light')
// 浅色模式（压在深色 Banner 上）时，回到顶部用白字，随毛玻璃显形切回深色。
const glassOpacity = computed(() => (isLightTone.value ? Math.min(1, Math.max(0, props.progress)) : 1))
const titleOpacity = computed(() => (isLightTone.value ? Math.min(1, Math.max(0, props.progress)) : 1))
const iconColor = computed(() => (isLightTone.value && props.progress < 0.5 ? '#FFFFFF' : '#171717'))

const hostStyle = computed(() => ({ zIndex: props.zIndex, paddingTop: `${topInset.value}px` }))
const spacerFallback = computed(() => topInset.value + rowHeight + Math.max(0, props.bottomHeight))
const spacerHeight = computed(() => `${measuredHeight.value || spacerFallback.value}px`)

function onBack() {
  emit('back')
  uni.navigateBack({
    fail: () => switchCakeTab(CAKE_ROUTES.home)
  })
}

function onHome() {
  emit('home')
  switchCakeTab(CAKE_ROUTES.home)
}
</script>

<style scoped lang="scss">
.cake-nav-host { position: relative; }

.cake-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.cake-nav-surface {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(247, 245, 240, 0.86);
  border-bottom: 1px solid rgba(23, 23, 23, 0.06);
  transition-property: opacity;
  transition-duration: 140ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .cake-nav-surface {
    background: rgba(247, 245, 240, 0.7);
    -webkit-backdrop-filter: blur(16px) saturate(1.1);
    backdrop-filter: blur(16px) saturate(1.1);
  }
}

.cake-nav-fade {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 14px;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(247, 245, 240, 0.9), rgba(247, 245, 240, 0));
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
  mask-image: linear-gradient(to bottom, #000, transparent);
  transition-property: opacity;
  transition-duration: 140ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-nav-row {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12rpx;
}

.cake-nav-side {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 88rpx;
}

.cake-nav-side.is-right { justify-content: flex-end; }

.cake-nav-btn {
  width: 72rpx;
  height: 72rpx;
  margin: 0;
  padding: 0;
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  line-height: 1;
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-nav-btn:active { transform: scale(0.94); background: rgba(255, 255, 255, 0.92); }

.cake-nav-center {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-nav-title {
  display: block;
  max-width: 100%;
  font-size: 34rpx;
  font-weight: 650;
  letter-spacing: -0.4rpx;
  color: #171717;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition-property: opacity;
  transition-duration: 140ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-nav-bottom { position: relative; }

.cake-nav-spacer { width: 100%; pointer-events: none; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-nav-surface,
  .cake-nav-fade,
  .cake-nav-title,
  .cake-nav-btn { transition-duration: 0ms; }
}
</style>
