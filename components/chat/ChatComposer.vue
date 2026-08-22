<template>
  <view class="composer-wrap">
    <view v-if="replyMessage" class="replying"><text>回复 {{ replyPreview.author }}：{{ replyPreview.text }}</text><text class="close-reply" @tap="$emit('close-reply')">×</text></view>
    <view class="composer"><text class="tool" @tap="emojiPanelVisible = !emojiPanelVisible">☺</text><textarea v-model="draft" class="draft" auto-height :adjust-position="true" maxlength="2000" placeholder="发消息" @input="onInput" /><text class="tool" @tap="chooseImage">＋</text><text class="send" :class="{ disabled }" @tap="send">发送</text></view>
    <view v-if="mentionPanelVisible" class="member-panel"><view v-for="member in filteredMembers" :key="member.userId" class="member-option" @tap="chooseMention(member)"><image v-if="member.avatarUrl" :src="member.avatarUrl" class="member-avatar" /><view v-else class="member-avatar member-fallback">{{ member.name?.slice(0, 1) }}</view><text>{{ member.name }}</text></view></view>
    <view v-if="emojiPanelVisible" class="emoji-panel"><text v-for="emoji in emojis" :key="emoji" class="emoji" @tap="draft = appendEmoji(draft, emoji)">{{ emoji }}</text></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { appendEmoji, insertMention, makeTextMessagePayload } from '@/utils/chatComposerState.js'
import { formatReplyPreview } from '@/utils/chatMessagePresentation.js'

const props = defineProps({ members: { type: Array, default: () => [] }, replyMessage: { type: Object, default: null }, disabled: Boolean })
const emit = defineEmits(['send', 'select-image', 'close-reply'])
const draft = ref(''); const mentions = ref([]); const emojiPanelVisible = ref(false); const mentionPanelVisible = ref(false)
const emojis = ['😊', '😂', '🥰', '👍', '🙏', '❤️', '🎉', '😢', '😄', '👏']
const replyPreview = computed(() => formatReplyPreview(props.replyMessage))
const mentionQuery = computed(() => (draft.value.match(/@([^\s@]*)$/)?.[1] || '').toLowerCase())
const filteredMembers = computed(() => props.members.filter(item => !mentionQuery.value || String(item.name || '').toLowerCase().includes(mentionQuery.value)))
function onInput() { mentionPanelVisible.value = /@[^\s@]*$/.test(draft.value) }
function chooseMention(member) { const next = insertMention(draft.value, mentions.value, member); draft.value = next.draft; mentions.value = next.mentions; mentionPanelVisible.value = false }
function send() { const payload = makeTextMessagePayload(draft.value, mentions.value, props.replyMessage); if (!payload.content || props.disabled) return; emit('send', payload); draft.value = ''; mentions.value = []; emojiPanelVisible.value = false }
function chooseImage() { if (props.disabled) return; uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: result => emit('select-image', { imagePath: result.tempFilePaths[0] }) }) }
</script>

<style scoped>
.composer-wrap { flex: none; padding: 12rpx 20rpx calc(12rpx + env(safe-area-inset-bottom)); background: #f6f7f8; box-sizing: border-box; }.composer { display: flex; align-items: flex-end; gap: 14rpx; padding: 14rpx 16rpx; border-radius: 22rpx; background: #fff; }.draft { flex: 1; min-height: 44rpx; max-height: 180rpx; color: #1d2230; font-size: 30rpx; line-height: 44rpx; }.tool { padding: 4rpx; color: #1d2230; font-size: 44rpx; line-height: 44rpx; }.send { padding: 8rpx 0 6rpx; color: #1768ae; font-size: 28rpx; }.send.disabled { color: #aaa; }.replying { display: flex; justify-content: space-between; gap: 16rpx; padding: 14rpx 18rpx; border-radius: 16rpx 16rpx 0 0; color: #606772; background: #fff; font-size: 24rpx; }.close-reply { flex: none; font-size: 34rpx; line-height: 28rpx; }.emoji-panel { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 12rpx; padding: 24rpx; border-radius: 18rpx; background: #fff; }.emoji { font-size: 42rpx; }.member-panel { max-height: 340rpx; margin-top: 12rpx; overflow-y: auto; border-radius: 18rpx; background: #fff; }.member-option { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 20rpx; color: #1d2230; }.member-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; }.member-fallback { display: flex; align-items: center; justify-content: center; color: #fff; background: #bbb; }
</style>
