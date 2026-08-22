<template>
  <view class="message-row" :class="{ mine }">
    <view class="avatar-wrap"><image v-if="message.sender_avatar_url" class="avatar" :src="message.sender_avatar_url" mode="aspectFill" /><view v-else class="avatar fallback">{{ avatarLabel }}</view></view>
    <view class="message-main">
      <text class="sender-name">{{ message.sender_name || '成员' }}</text>
      <view class="bubble" @longpress="onLongPress">
        <image v-if="message.message_type === 'image'" class="message-image" :src="message.media_url" mode="widthFix" @tap.stop="$emit('preview-image', message.media_url)" />
        <view v-else class="message-text"><text v-for="(token, index) in textTokens" :key="index" :class="{ mention: token.mentioned }">{{ token.text }}</text></view>
        <view v-if="message.reply" class="reply-card"><view class="reply-copy"><text class="reply-author">{{ replyPreview.author }}</text><text class="reply-text">{{ replyPreview.text }}</text></view><image v-if="replyPreview.imageUrl" class="reply-image" :src="replyPreview.imageUrl" mode="aspectFill" /></view>
      </view>
      <view v-if="mine" class="receipt"><text :class="['receipt-icon', receiptIcon]">{{ receiptText }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { formatReplyPreview, getReceiptIcon, tokenizeMentions } from '@/utils/chatMessagePresentation.js'

const props = defineProps({ message: { type: Object, required: true }, mine: Boolean })
const emit = defineEmits(['longpress', 'preview-image'])
const avatarLabel = computed(() => String(props.message.sender_name || '成').slice(0, 1))
const textTokens = computed(() => tokenizeMentions(props.message.content, props.message.mentions))
const replyPreview = computed(() => formatReplyPreview(props.message.reply))
const receiptIcon = computed(() => getReceiptIcon(props.message.receiptStatus))
const receiptText = computed(() => ({ clock: '◷', single: '✓', 'double-blue': '✓✓' })[receiptIcon.value])
function onLongPress() { if (props.message.message_type !== 'image') emit('longpress', props.message) }
</script>

<style scoped>
.message-row { display: flex; align-items: flex-start; gap: 14rpx; margin: 20rpx 0; }
.message-row.mine { flex-direction: row-reverse; }
.avatar-wrap { flex: none; width: 76rpx; height: 76rpx; }.avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #ddd; }.fallback { display: flex; align-items: center; justify-content: center; color: #fff; background: #b7b7b7; font-size: 28rpx; }
.message-main { max-width: calc(100% - 104rpx); display: flex; flex-direction: column; align-items: flex-start; }.mine .message-main { align-items: flex-end; }
.sender-name { margin: 0 8rpx 8rpx; color: #777b83; font-size: 24rpx; }.bubble { max-width: 100%; padding: 18rpx 22rpx; border-radius: 22rpx; background: #fff; box-sizing: border-box; }.message-text { color: #171b29; font-size: 32rpx; line-height: 1.5; word-break: break-word; }.mention { color: #075aa5; font-weight: 600; }.message-image { display: block; width: 360rpx; max-width: 100%; border-radius: 14rpx; }.receipt { min-height: 26rpx; padding: 4rpx 8rpx 0; }.receipt-icon { color: #8c939d; font-size: 24rpx; }.receipt-icon.double-blue { color: #2589d7; }
.reply-card { display: flex; align-items: center; gap: 14rpx; margin-top: 14rpx; padding: 12rpx 14rpx; border-radius: 12rpx; background: #e4e4e4; min-width: 260rpx; }.reply-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }.reply-author { color: #656b75; font-size: 22rpx; }.reply-text { overflow: hidden; color: #777; font-size: 24rpx; text-overflow: ellipsis; white-space: nowrap; }.reply-image { width: 72rpx; height: 72rpx; border-radius: 8rpx; flex: none; }
</style>
