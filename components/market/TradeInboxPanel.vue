<template>
  <view class="trade-inbox">
    <view class="inbox-heading">
      <text>{{ t('trade.messages') }}</text>
      <view class="tabs">
        <view v-for="key in ['all', 'chat', 'trade']" :key="key" :class="{ selected: tab === key }" @click="switchTab(key)">
          {{ t('trade.' + key) }}<text v-if="key === 'trade' && noticeCount" class="trade-dot">•</text>
        </view>
      </view>
    </view>
    <view class="inbox-body" :class="{ entered }">
      <view v-if="tab === 'trade'" class="trade-tools">
        <view @click="open('notices')"><uni-icons type="notification" size="18" color="var(--bless-primary, #C2A052)" /> {{ t('trade.reminders') }} <text>{{ noticeCount || '' }}</text></view>
        <view @click="open('orders')">{{ t('trade.myTrades') }} ›</view>
      </view>
      <view v-if="tab === 'all' && showInteractions" class="conversation utility-conversation" @click="$emit('interactions')">
        <view class="avatar-wrap"><view class="fire"><uni-icons type="fire-filled" size="28" color="#fff" /></view><text v-if="interactionUnread" class="unread">{{ badge(interactionUnread) }}</text></view>
        <view class="body"><text class="name">{{ t('inbox.interactions') }}</text><text class="summary">{{ interactionSummary }}</text></view>
        <text class="time">{{ interactionDate }}</text>
      </view>
      <view v-if="tab !== 'trade' && isAdmin && requestCount" class="conversation utility-conversation" @click="$emit('reviews')">
        <view class="avatar-wrap"><view class="fire"><uni-icons type="checkmarkempty" size="26" color="#fff" /></view><text class="unread">{{ badge(requestCount) }}</text></view>
        <view class="body"><text class="name">{{ t('inbox.pendingRequests') }}</text></view>
      </view>
      <view v-for="item in items" :key="itemKey(item) + ':' + Number(isPinned(item))" class="swipe-row"
        @touchstart="touchStart($event, item)" @touchmove="touchMove" @touchend="touchEnd" @touchcancel="touchCancel" @mousedown="mouseStart($event, item)">
        <view class="swipe-actions">
          <button class="swipe-action pin-action" :disabled="!!busyKey || dialogPending" :aria-label="t(isPinned(item) ? 'conversationList.unpin' : 'conversationList.pin')" @click.stop="togglePin(item)">
            <text class="action-glyph" aria-hidden="true">{{ isPinned(item) ? '↧' : '↟' }}</text>
            <text>{{ busyKey === itemKey(item) ? t('conversationList.saving') : t(isPinned(item) ? 'conversationList.unpin' : 'conversationList.pin') }}</text>
          </button>
          <button class="swipe-action delete-action" :disabled="!!busyKey || dialogPending" :aria-label="t('conversationList.delete')" @click.stop="confirmDelete(item)">
            <text class="action-glyph" aria-hidden="true">×</text><text>{{ t('conversationList.delete') }}</text>
          </button>
        </view>
        <view class="conversation swipe-surface" :class="{ 'is-dragging': draggingKey === itemKey(item) }" :style="{ transform: 'translateX(' + offsetFor(item) + 'px)' }"
          @click="openItem(item)">
          <view class="avatar-wrap">
            <GroupAvatar v-if="item.kind === 'group'" :avatar-url="item.avatar_url" :members="item.members || []" :size="48" />
            <image v-else class="avatar" :src="item.peer_avatar || '/static/logo.png'" mode="aspectFill" />
            <text v-if="Number(item.unread_count) > 0" class="unread">{{ badge(item.unread_count) }}</text>
          </view>
          <view class="body">
            <view class="name-line">
              <text class="name">{{ item.kind === 'group' ? presentGroupName(item.name) : item.peer_name }}</text>
              <text v-if="isPinned(item)" class="pin-mark" :aria-label="t('conversationList.pinned')">↟</text>
              <text v-if="item.kind === 'trade'" class="tag">{{ t('trade.trade') }}</text>
            </view>
            <text v-if="item.kind === 'trade'" class="product-title">{{ item.title }}</text>
            <text class="summary">{{ item.kind === 'trade' ? (item.last_kind === 'system' ? t('trade.' + item.last_message) : item.last_kind === 'image' ? t('trade.image') : item.last_message || t('trade.consulting')) : item.last_message || t('inbox.noMessages') }}</text>
            <text v-if="item.order_status" class="status">{{ t('trade.' + item.order_status) }}</text>
          </view>
          <view class="right">
            <text class="time">{{ formatConversationTime(item.last_at || item.last_message_at || item.updated_at) }}</text>
            <image v-if="item.kind === 'trade' && item.images?.[0]" :src="item.images[0]" class="thumb" mode="aspectFill" />
          </view>
        </view>
      </view>
      <view v-if="error" class="empty" @click="$emit('retry')">{{ t('trade.failed') }} · {{ t('trade.retry') }}</view>
      <view v-else-if="!items.length && tab !== 'all'" class="empty">{{ t('trade.empty') }}</view>
    </view>
    <BlessDialog ref="deleteDialog" />
  </view>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import BlessDialog from '@/components/common/BlessDialog.vue'
import { t } from '@/utils/localeRuntime.js'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { formatConversationTime } from '@/utils/chatMessagePresentation.js'
import { tradeRoute } from '@/api/marketTrades.js'
import { setConversationPinnedApi, deleteConversationApi } from '@/api/conversationPreferences.js'

const ACTION_WIDTH = 176
const props = defineProps({ groups: Array, trades: Array, search: String, showInteractions: Boolean, interactionUnread: Number, interactionSummary: String, interactionDate: String, isAdmin: Boolean, requestCount: Number, error: Boolean, noticeCount: Number })
const emit = defineEmits(['interactions', 'reviews', 'group', 'retry', 'conversation-changed'])
const tab = ref('all')
const entered = ref(false)
const openKey = ref('')
const draggingKey = ref('')
const dragX = ref(0)
const busyKey = ref('')
const dialogPending = ref(false)
const deleteDialog = ref(null)
let timer, transitioning = false, gesture = null, lastSwipeAt = 0, duration = 140
let mouseActive = false
// #ifdef H5
if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) duration = 0
// #endif

function itemKey(item) { return item.kind + '-' + item.id }
function isPinned(item) { return !!item.pinned_at }
function lastTime(item) { return new Date(item.last_at || item.last_message_at || item.updated_at || 0).getTime() || 0 }
const items = computed(() => {
  const list = [
    ...(tab.value !== 'trade' ? (props.groups || []).map(item => ({ ...item, kind: 'group' })) : []),
    ...(tab.value !== 'chat' ? (props.trades || []).map(item => ({ ...item, kind: 'trade' })) : [])
  ]
  const keyword = (props.search || '').trim().toLowerCase()
  return list.filter(item => !keyword || [item.name, item.peer_name, item.title, item.last_message].some(value => String(value || '').toLowerCase().includes(keyword)))
    .sort((a, b) => Number(isPinned(b)) - Number(isPinned(a)) || lastTime(b) - lastTime(a))
})
function badge(value) { return Number(value) > 99 ? '99+' : value }
function open(mode) { uni.navigateTo({ url: tradeRoute(mode) }) }
function openItem(item) {
  if (Date.now() - lastSwipeAt < 350 || busyKey.value || dialogPending.value) return
  if (openKey.value) { openKey.value = ''; return }
  if (item.kind === 'group') emit('group', item.id)
  else uni.navigateTo({ url: tradeRoute('chat', item.id) })
}
function offsetFor(item) {
  const key = itemKey(item)
  if (draggingKey.value === key && gesture) return Math.max(-ACTION_WIDTH, Math.min(0, gesture.startOffset + dragX.value))
  return openKey.value === key ? -ACTION_WIDTH : 0
}
function touchStart(event, item) {
  if (busyKey.value || dialogPending.value || !event.touches?.length) return
  const key = itemKey(item)
  const point = event.touches[0]
  const wasOpen = openKey.value === key
  if (openKey.value && !wasOpen) openKey.value = ''
  gesture = { key, x: point.clientX, y: point.clientY, at: Date.now(), startOffset: wasOpen ? -ACTION_WIDTH : 0, direction: '' }
  draggingKey.value = ''
  dragX.value = 0
}
function touchMove(event) {
  if (!gesture || !event.touches?.length) return
  const point = event.touches[0]
  const dx = point.clientX - gesture.x
  const dy = point.clientY - gesture.y
  if (!gesture.direction) {
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) gesture.direction = 'vertical'
    else if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) gesture.direction = 'horizontal'
  }
  if (gesture.direction !== 'horizontal') return
  draggingKey.value = gesture.key
  dragX.value = dx
  event.preventDefault?.()
  event.stopPropagation?.()
}
function touchEnd(event) {
  if (!gesture) return
  const current = gesture
  const point = event.changedTouches?.[0]
  const dx = point ? point.clientX - current.x : dragX.value
  if (current.direction === 'horizontal') {
    const velocity = Math.abs(dx) / Math.max(1, Date.now() - current.at)
    const open = Math.abs(dx) > 38 || velocity > 0.45 ? dx < 0 : current.startOffset + dx < -ACTION_WIDTH / 2
    openKey.value = open ? current.key : ''
    lastSwipeAt = Date.now()
    event.preventDefault?.()
  }
  gesture = null
  draggingKey.value = ''
  dragX.value = 0
}
function touchCancel() { gesture = null; draggingKey.value = ''; dragX.value = 0 }
function closeSwipe() { openKey.value = ''; touchCancel() }
function mouseStart(event, item) {
  // #ifdef H5
  if (event.button !== 0 || Date.now() - lastSwipeAt < 350) return
  mouseActive = true
  touchStart({ touches: [event] }, item)
  window.addEventListener('mousemove', mouseMove)
  window.addEventListener('mouseup', mouseEnd)
  // #endif
}
function mouseMove(event) {
  if (!mouseActive) return
  touchMove({ touches: [event], preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() })
}
function mouseEnd(event) {
  if (!mouseActive) return
  mouseActive = false
  touchEnd({ changedTouches: [event], preventDefault: () => event.preventDefault() })
  // #ifdef H5
  window.removeEventListener('mousemove', mouseMove)
  window.removeEventListener('mouseup', mouseEnd)
  // #endif
}

async function togglePin(item) {
  if (busyKey.value || dialogPending.value) return
  const key = itemKey(item)
  const pinned = !isPinned(item)
  closeSwipe()
  busyKey.value = key
  try {
    const response = await setConversationPinnedApi(item.kind, item.id, pinned)
    closeSwipe()
    emit('conversation-changed', { kind: item.kind, id: item.id, action: 'pin', pinned, pinned_at: pinned ? response?.pinned_at || new Date().toISOString() : null })
  } catch (_) {
    uni.showToast({ title: t('conversationList.actionFailed'), icon: 'none' })
  } finally {
    busyKey.value = ''
  }
}
async function confirmDelete(item) {
  if (busyKey.value || dialogPending.value) return
  closeSwipe()
  dialogPending.value = true
  const key = itemKey(item)
  try {
    const result = await deleteDialog.value?.open({
      title: t('conversationList.deleteTitle'),
      content: t(item.kind === 'group' ? 'conversationList.deleteGroupContent' : 'conversationList.deleteTradeContent'),
      confirmText: t('conversationList.deleteConfirm'),
      tone: 'danger'
    })
    if (!result?.confirm) return
    busyKey.value = key
    await deleteConversationApi(item.kind, item.id)
    closeSwipe()
    emit('conversation-changed', { kind: item.kind, id: item.id, action: 'delete' })
  } catch (_) {
    uni.showToast({ title: t('conversationList.actionFailed'), icon: 'none' })
  } finally {
    busyKey.value = ''
    dialogPending.value = false
  }
}
function enter() { clearTimeout(timer); entered.value = false; timer = setTimeout(() => { entered.value = true }, duration ? 24 : 0) }
function switchTab(key) {
  if (tab.value === key || transitioning) return
  closeSwipe()
  transitioning = true
  entered.value = false
  clearTimeout(timer)
  timer = setTimeout(() => { tab.value = key; timer = setTimeout(() => { entered.value = true; transitioning = false }, duration ? 24 : 0) }, duration)
}
let firstItems = false
watch(() => items.value.length, count => { if (count && !firstItems) { firstItems = true; enter() } })
watch(() => props.search, closeSwipe)
watch(() => items.value.map(item => itemKey(item) + ':' + Number(isPinned(item))).join('|'), closeSwipe)
onMounted(enter)
onShow(() => { closeSwipe(); enter() })
onBeforeUnmount(() => {
  clearTimeout(timer)
  // #ifdef H5
  window.removeEventListener('mousemove', mouseMove)
  window.removeEventListener('mouseup', mouseEnd)
  // #endif
})
</script>

<style scoped>
.trade-inbox { margin: 8px 12px 110px; padding: 16px 10px 12px; border: 1px solid rgba(255,255,255,.9); border-radius: 28px; background: #f8f7f5; }
.inbox-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 0 6px 16px; font-size: 20px; font-weight: 600; }
.tabs { display: flex; gap: 6px; font-size: 12px; font-weight: 500; }
.tabs > view { padding: 8px 13px; border-radius: 22px; background: #eee; }
.tabs > .selected { background: var(--bless-primary, #C2A052); }
.trade-dot { color: var(--bless-text, #775E25); margin-left: 3px; }
.inbox-body { opacity: 0; transform: translateY(12px); transition: opacity 180ms ease-out, transform 220ms cubic-bezier(.23,1,.32,1); }
.inbox-body.entered { opacity: 1; transform: translateY(0); }
.conversation { display: flex; align-items: center; gap: 11px; min-height: 76px; padding: 14px 11px; box-sizing: border-box; border-radius: 19px; background: #fff; }
.utility-conversation { margin-bottom: 9px; }
.swipe-row { position: relative; margin-bottom: 9px; overflow: hidden; border-radius: 19px; background: #fbf1ee; touch-action: pan-y; }
.swipe-actions { position: absolute; top: 0; right: 0; bottom: 0; display: flex; width: 176px; }
.swipe-action { display: flex; flex: 0 0 88px; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 88px; min-height: 76px; margin: 0; padding: 8px 5px; box-sizing: border-box; border: 0; border-radius: 0; font-size: 11px; font-weight: 600; line-height: 1.2; text-align: center; white-space: normal; word-break: break-word; }
.swipe-action::after { border: 0; }
.swipe-action:active { opacity: .86; }
.swipe-action[disabled] { opacity: .62; }
.pin-action { background: #efe0b7; color: #705518; }
.delete-action { background: #f8dfdc; color: #ac4c46; }
.action-glyph { font-size: 21px; line-height: 1; font-weight: 500; }
.swipe-surface { position: relative; z-index: 1; width: 100%; touch-action: pan-y; user-select: none; transition: transform 190ms cubic-bezier(.32,.72,0,1); }
.swipe-surface.is-dragging { transition: none; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar,.fire { width: 48px; height: 48px; border-radius: 50%; }
.fire { background: var(--bless-primary, #C2A052); display: flex; align-items: center; justify-content: center; }
.unread { position: absolute; right: -5px; top: -5px; background: var(--bless-primary, #C2A052); border: 2px solid #fff; border-radius: 20px; min-width: 17px; height: 17px; padding: 0 2px; line-height: 17px; text-align: center; font-size: 10px; color: #292825; }
.body { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 5px; min-width: 0; }
.name { min-width: 0; font-size: 15px; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pin-mark { display: flex; flex: none; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 6px; background: #f7ebca; color: #806326; font-size: 13px; line-height: 16px; }
.tag { background: var(--bless-soft, #F1E4BD); color: var(--bless-text, #775E25); font-size: 10px; padding: 2px 5px; border-radius: 6px; flex-shrink: 0; }
.summary,.product-title { display: block; font-size: 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.7; margin-top: 3px; }
.summary { color: #a09d97; }
.product-title { color: #777; }
.status { display: block; font-size: 11px; color: var(--bless-text, #775E25); margin-top: 3px; }
.time { color: #aaa; font-size: 10px; max-width: 64px; }
.right { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; flex-shrink: 0; }
.thumb { width: 38px; height: 38px; border-radius: 8px; }
.trade-tools { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--bless-text, #775E25); padding: 0 6px 16px; }
.trade-tools > view { display: flex; align-items: center; gap: 5px; }
.empty { text-align: center; padding: 25px; color: #999; font-size: 13px; }
.trade-inbox :deep(.tone-danger .bless-dialog-button.primary) { background: #f2d8d4; color: #a54741; }
/* #ifdef H5 */
@media (prefers-reduced-motion: reduce) { .inbox-body,.swipe-surface { transition: none; } }
/* #endif */
</style>
