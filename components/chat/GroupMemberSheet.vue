<template>
  <view v-if="visible" class="sheet-mask app-h5-sheet-mask" @tap.self="emit('close')">
    <view class="sheet app-h5-sheet">
      <view class="sheet-head"><text class="sheet-title">{{ title }}（{{ members.length }}）</text><text class="close" @tap="emit('close')">×</text></view>
      <scroll-view scroll-y class="member-list app-h5-scroll">
        <view v-for="member in memberCards" :key="member.userId" class="member-row">
          <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="member-avatar member-avatar-fallback">{{ member.name.slice(0, 1) }}</view>
          <view class="member-copy"><text class="member-name">{{ member.name }}</text><text class="member-email">{{ member.email || t('chat.noEmail') }}</text></view>
        </view>
        <view v-if="!memberCards.length" class="empty">{{ t('chat.noMembers') }}</view>
        <template v-if="hasUnreadSection">
          <view class="section-head"><text>{{ t('chat.unreadMembers', { count: unreadMemberCards.length }) }}</text></view>
          <view v-for="member in unreadMemberCards" :key="member.userId" class="member-row">
            <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
            <view v-else class="member-avatar member-avatar-fallback">{{ member.name.slice(0, 1) }}</view>
            <view class="member-copy"><text class="member-name">{{ member.name }}</text><text class="member-email">{{ member.email || t('chat.noEmail') }}</text></view>
          </view>
          <view v-if="!unreadMemberCards.length" class="all-read">{{ t('chat.allRead') }}</view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { visibleMemberDetails } from '@/utils/groupMemberSheetState.js'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({ visible: Boolean, title: { type: String, default: '' }, members: { type: Array, default: () => [] }, unreadMembers: { type: Array, default: null } })
const emit = defineEmits(['close'])
const memberCards = computed(() => props.members.map(visibleMemberDetails))
const hasUnreadSection = computed(() => Array.isArray(props.unreadMembers))
const unreadMemberCards = computed(() => (props.unreadMembers || []).map(visibleMemberDetails))
</script>

<style scoped>
.sheet-mask { position: fixed; z-index: 1000; inset: 0; display: flex; align-items: flex-end; background: rgba(0,0,0,.45); }.sheet { display: flex; width: 100%; min-height: 0; flex-direction: column; border-radius: 28rpx 28rpx 0 0; background: #fff; }.sheet-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; height: 100rpx; padding: 0 32rpx; border-bottom: 1rpx solid #eee; }.sheet-title { color: #20232b; font-size: 30rpx; font-weight: 600; }.close { padding: 8rpx; color: #999; font-size: 50rpx; line-height: 1; }.member-row { display: flex; align-items: center; gap: 18rpx; padding: 22rpx 32rpx; }.member-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #e5e7eb; }.member-avatar-fallback { display: flex; align-items: center; justify-content: center; color: #fff; background: #b7b7b7; font-size: 28rpx; }.member-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 6rpx; }.member-name { overflow: hidden; color: #222; font-size: 28rpx; text-overflow: ellipsis; white-space: nowrap; }.member-email { overflow: hidden; color: #999; font-size: 23rpx; text-overflow: ellipsis; white-space: nowrap; }.empty,.all-read { padding: 48rpx 0; color: #999; text-align: center; font-size: 26rpx; }.section-head { margin-top: 10rpx; padding: 22rpx 32rpx; border-top: 16rpx solid #f5f6f8; color: #505762; font-size: 27rpx; font-weight: 600; }
/* #ifdef H5 */
.sheet-mask { bottom: var(--app-viewport-bottom-offset, 0px); }
/* #endif */
/* #ifndef H5 */
.sheet { max-height: 70vh; padding-bottom: env(safe-area-inset-bottom); }
.member-list { max-height: calc(70vh - 100rpx); }
/* #endif */
</style>
