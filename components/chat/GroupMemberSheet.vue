<template>
  <ChatSheet :open="visible" :label="title" @dismiss="emit('close')">
    <view class="sheet app-h5-sheet">
      <view class="sheet-head"><text class="sheet-title">{{ title }}（{{ members.length }}）</text><button class="close" :aria-label="t('chatDesign.close')" @tap="emit('close')">×</button></view>
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
  </ChatSheet>
</template>

<script setup>
import ChatSheet from './ChatSheet.vue'
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
.sheet{display:flex;flex-direction:column;height:66vh;max-height:calc(100vh - 80px);padding:10px 20px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;background:#f5f4f1;color:#292825;}.sheet-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 16px;}.sheet-title{font-size:19px;font-weight:600;line-height:1.5;}.close{flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;border-radius:50%;background:#ebe9e4;color:#807b73;font-size:28px;line-height:44px;}.close::after{border:0;}.member-list{height:0;min-height:0;flex:1;border-radius:22px;background:#fff;}.member-row{display:flex;align-items:center;gap:12px;padding:16px;}.member-avatar{flex:0 0 44px;width:44px;height:44px;border-radius:50%;background:#eae7df;}.member-avatar-fallback{display:flex;align-items:center;justify-content:center;background:var(--bless-soft, #F1E4BD);color:var(--bless-text, #775E25);font-size:17px;}.member-copy{display:flex;flex-direction:column;flex:1;min-width:0;gap:5px;}.member-name{font-size:15px;color:#292825;overflow-wrap:anywhere;}.member-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#918d85;font-size:12px;}.empty,.all-read{padding:30px 16px;text-align:center;color:#918d85;font-size:13px;}.section-head{padding:16px;border-top:8px solid #f5f4f1;font-size:14px;font-weight:600;}
/* #ifdef H5 */
.sheet{max-height:calc(var(--app-viewport-height,100dvh) - 60px);}
/* #endif */
</style>
