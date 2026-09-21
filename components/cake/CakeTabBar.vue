<template>
  <view class="cake-tabbar" :style="{ zIndex }">
    <view class="cake-tabbar-surface" aria-hidden="true"></view>
    <view class="cake-tabbar-row">
      <view
        v-for="tab in CAKE_TABS"
        :key="tab.key"
        class="cake-tab"
        :class="{ 'is-active': tab.key === activeKey }"
        role="button"
        :aria-label="t(tab.labelKey)"
        :aria-current="tab.key === activeKey ? 'page' : 'false'"
        @click="select(tab)"
      >
        <uni-icons :type="tab.key === activeKey ? tab.activeIcon : tab.icon" :size="21" :color="tab.key === activeKey ? '#C4551F' : '#8A857C'" />
        <text class="cake-tab-label">{{ t(tab.labelKey) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { CAKE_TABS, switchCakeTab } from '@/utils/cake.js'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({
  activeKey: { type: String, required: true },
  zIndex: { type: Number, default: 60 }
})

function select(tab) {
  if (tab.key === props.activeKey) return
  switchCakeTab(tab.route)
}
</script>

<style scoped lang="scss">
.cake-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.cake-tabbar-surface {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.94);
  border-top: 1px solid rgba(23, 23, 23, 0.07);
}

@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .cake-tabbar-surface {
    background: rgba(255, 255, 255, 0.8);
    -webkit-backdrop-filter: blur(18px) saturate(1.1);
    backdrop-filter: blur(18px) saturate(1.1);
  }
}

.cake-tabbar-row {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 108rpx;
}

.cake-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  // 触控反馈要快且轻：只动颜色与极轻微的缩放
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-tab:active { transform: scale(0.94); }

.cake-tab-label {
  font-size: 20rpx;
  line-height: 1.2;
  color: #8A857C;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cake-tab.is-active .cake-tab-label {
  color: #C4551F;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .cake-tab { transition-duration: 0ms; }
}
</style>
