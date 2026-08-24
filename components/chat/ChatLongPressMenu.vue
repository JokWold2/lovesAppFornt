<template>
  <view v-if="visible" class="menu-mask" @tap="$emit('close')">
    <view class="menu" :style="menuStyle" @tap.stop>
      <view class="menu-arrow" :class="`arrow-${position.arrow}`"></view>
      <view v-if="message?.message_type !== 'image'" class="menu-item" @tap="copy"><text class="menu-icon">▣</text><text>复制</text></view>
      <view class="menu-item" @tap="$emit('reply', message)"><text class="menu-icon">↩</text><text>引用回复</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { getLongPressMenuPosition } from '@/utils/chatLongPressMenuPosition.js'

const props = defineProps({ visible: Boolean, message: { type: Object, default: null }, anchor: { type: Object, default: null } })
const emit = defineEmits(['close', 'reply'])
function copy() { if (!props.message?.content) return; uni.setClipboardData({ data: props.message.content, success: () => uni.showToast({ title: '已复制', icon: 'success' }) }); emit('close') }
const viewport = computed(() => {
  const info = uni.getSystemInfoSync?.() || {}
  return { width: Number(info.windowWidth) || 390, height: Number(info.windowHeight) || 760 }
})
const menuSize = computed(() => ({ width: uni.upx2px?.(344) || 172, height: uni.upx2px?.(124) || 62 }))
const position = computed(() => getLongPressMenuPosition(props.anchor, viewport.value, menuSize.value))
const menuStyle = computed(() => `left:${position.value.left}px;top:${position.value.top}px;`)
</script>

<style scoped>
.menu-mask { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.16); }.menu { position: absolute; display: flex; width: 344rpx; height: 124rpx; overflow: visible; border-radius: 16rpx; color: #fff; background: rgba(64,64,64,.94); box-shadow: 0 8rpx 24rpx rgba(0,0,0,.18); }.menu-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; color: #fff; font-size: 23rpx; line-height: 1.2; }.menu-item + .menu-item { border-left: 1rpx solid rgba(255,255,255,.18); }.menu-icon { height: 34rpx; font-size: 32rpx; line-height: 34rpx; }.menu-arrow { position: absolute; left: 50%; width: 0; height: 0; margin-left: -12rpx; border-right: 12rpx solid transparent; border-left: 12rpx solid transparent; }.arrow-bottom { bottom: -12rpx; border-top: 12rpx solid rgba(64,64,64,.94); }.arrow-top { top: -12rpx; border-bottom: 12rpx solid rgba(64,64,64,.94); }
</style>
