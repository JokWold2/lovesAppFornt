<template>
  <view v-if="visible" class="menu-mask" @tap="$emit('close')"><view class="menu" @tap.stop><text class="menu-item" @tap="copy">复制</text><text class="menu-item" @tap="$emit('reply', message)">引用回复</text></view></view>
</template>

<script setup>
const props = defineProps({ visible: Boolean, message: { type: Object, default: null } })
const emit = defineEmits(['close', 'reply'])
function copy() { if (!props.message?.content) return; uni.setClipboardData({ data: props.message.content, success: () => uni.showToast({ title: '已复制', icon: 'success' }) }); emit('close') }
</script>

<style scoped>
.menu-mask { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.2); }.menu { display: flex; overflow: hidden; min-width: 340rpx; border-radius: 20rpx; background: #fff; }.menu-item { flex: 1; padding: 28rpx 20rpx; color: #1d2230; text-align: center; font-size: 30rpx; }.menu-item + .menu-item { border-left: 1px solid #eee; }
</style>
