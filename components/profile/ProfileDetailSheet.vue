<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-container v-if="displayId" :show="opened" position="bottom" :duration="duration"
    :overlay="true" :round="false" :close-on-slide-down="false" :z-index="1200"
    custom-style="height:100%;background:#f5f4f1;"
    @afterenter="afterEnter" @beforeleave="beginClose" @afterleave="finishClose">
    <view class="profile-detail-sheet">
      <ProfileDetailView :key="displayId" :id="displayId" :visible="pageVisible && entered && opened" :embedded="nativeHeader" :interactions-enabled="interactionsEnabled" @close="beginClose" />
    </view>
  </page-container>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view v-if="displayId" v-show="pageVisible" class="profile-sheet-host" :aria-hidden="!pageVisible">
    <view class="profile-sheet-scrim" :class="{ 'is-open': opened }" @touchmove.stop.prevent @click="beginClose"></view>
    <view class="profile-sheet-layer" :class="{ 'is-open': opened }" :style="{ transitionDuration: duration + 'ms' }" @touchmove.stop @transitionend="onTransitionEnd">
      <view class="profile-detail-sheet">
        <ProfileDetailView :key="displayId" :id="displayId" :visible="pageVisible && entered && opened" :embedded="nativeHeader" :interactions-enabled="interactionsEnabled" @close="beginClose" />
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ProfileDetailView from './ProfileDetailView.vue'

const props = defineProps({
  profileId: { type: [Number, String], default: null },
  pageVisible: { type: Boolean, default: true },
  // Native-navigation hosts already reserve their chrome outside the sheet.
  // Custom-navigation hosts leave this false to reserve status/capsule space here.
  nativeHeader: { type: Boolean, default: false },
  interactionsEnabled: { type: Boolean, default: true }
})
const emit = defineEmits(['closed'])
const opened = ref(false), entered = ref(false), displayId = ref(null)
const duration = ref(240)
let timer = null, frame = null, disposed = false, savedBodyStyle = null, backgroundPosition = null
// #ifdef H5
duration.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 240
// #endif

function lockBackground(lock, restorePosition = props.pageVisible) {
  // #ifdef H5
  const style = document.body.style
  if (lock && !savedBodyStyle) {
    // Changing html/body overflow alone resets uni-app's document scroll to zero.
    // Pin the background at its existing offset while the sheet scrolls separately.
    backgroundPosition ||= { x: window.scrollX, y: window.scrollY }
    savedBodyStyle = Object.fromEntries(['position', 'top', 'left', 'width', 'height', 'overflow'].map(key => [key, style[key]]))
    Object.assign(style, { position: 'fixed', top: `-${backgroundPosition.y}px`, left: `-${backgroundPosition.x}px`, width: '100%', height: 'auto', overflow: 'hidden' })
  } else if (!lock && savedBodyStyle) {
    Object.assign(style, savedBodyStyle)
    savedBodyStyle = null
    // Do not scroll a membership/group route that has just covered this host.
    if (restorePosition && backgroundPosition) window.scrollTo(backgroundPosition.x, backgroundPosition.y)
  }
  // #endif
}
function afterEnter() { if (opened.value) entered.value = true }
function beginClose() {
  entered.value = false
  opened.value = false
  clearTimeout(frame)
  // #ifndef MP-WEIXIN
  clearTimeout(timer)
  timer = setTimeout(finishClose, duration.value + 32)
  // #endif
}
function finishClose() {
  if (opened.value || !displayId.value) return
  clearTimeout(timer)
  displayId.value = null
  lockBackground(false)
  backgroundPosition = null
  emit('closed')
}
function onTransitionEnd(event) {
  if (event.target !== event.currentTarget) return
  if (opened.value) afterEnter()
  else finishClose()
}
watch(() => props.profileId, async id => {
  if (!id) { if (displayId.value) beginClose(); return }
  clearTimeout(timer); clearTimeout(frame)
  displayId.value = Number(id)
  entered.value = false
  opened.value = false
  lockBackground(props.pageVisible)
  await nextTick()
  if (disposed || Number(props.profileId) !== displayId.value) return
  // #ifdef MP-WEIXIN
  opened.value = true
  // #endif
  // #ifndef MP-WEIXIN
  frame = setTimeout(() => {
    if (disposed || !props.profileId) return
    opened.value = true
    timer = setTimeout(afterEnter, duration.value + 32)
  }, duration.value ? 32 : 0)
  // #endif
}, { immediate: true })
// Membership and group routes scroll in their own page while this host stays cached.
watch(() => props.pageVisible, visible => lockBackground(visible && displayId.value != null))
onBeforeUnmount(() => { disposed = true; clearTimeout(frame); clearTimeout(timer); lockBackground(false); backgroundPosition = null })
</script>

<style scoped>
.profile-detail-sheet { position: relative; height: 100%; width: 100%; overflow: hidden; background: #f5f4f1; }
.profile-sheet-host { position: fixed; inset: 0; z-index: 1200; overflow: hidden; overscroll-behavior: none; }
.profile-sheet-scrim { position: absolute; inset: 0; background: rgba(28,26,23,.2); opacity: 0; transition: opacity 240ms cubic-bezier(.32,.72,0,1); }
.profile-sheet-scrim.is-open { opacity: 1; }
.profile-sheet-layer { position: absolute; inset: 0; transform: translate3d(0,100%,0); transition-property: transform; transition-timing-function: cubic-bezier(.32,.72,0,1); overflow: hidden; background: #f5f4f1; }
.profile-sheet-layer.is-open { transform: translate3d(0,0,0); }
@media (prefers-reduced-motion: reduce) { .profile-sheet-scrim { transition: none; } }
</style>
