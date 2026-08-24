<template>
  <view class="group-avatar" :style="{ width: `${size}px`, height: `${size}px` }">
    <image v-if="avatarUrl" class="group-avatar-image" :src="avatarUrl" mode="aspectFill" />
    <view v-else class="group-avatar-grid" :class="`group-avatar-grid--${Math.min(members.length || 1, 4)}`">
      <view v-for="member in members.slice(0, 4)" :key="member.userId" class="group-avatar-cell">
        <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" />
        <text v-else>{{ member.name?.slice(0, 1) || '群' }}</text>
      </view>
      <view v-if="!members.length" class="group-avatar-cell group-avatar-empty">群</view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  avatarUrl: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  size: { type: Number, default: 48 }
})
</script>

<style scoped>
.group-avatar { flex: none; overflow: hidden; border-radius: 50%; background: #d9dde2; }
.group-avatar-image { width: 100%; height: 100%; }
.group-avatar-grid { display: grid; width: 100%; height: 100%; gap: 2px; padding: 2px; box-sizing: border-box; background: #d9dde2; }
.group-avatar-grid--1 { grid-template-columns: 1fr; }.group-avatar-grid--2 { grid-template-columns: repeat(2, 1fr); }.group-avatar-grid--3, .group-avatar-grid--4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
.group-avatar-cell { display: flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; color: #fff; background: #adb5bf; font-size: 22%; }.group-avatar-cell image { width: 100%; height: 100%; }.group-avatar-grid--3 .group-avatar-cell:first-child { grid-row: span 2; }.group-avatar-empty { width: 100%; height: 100%; font-size: 30%; }
</style>
