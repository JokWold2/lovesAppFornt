<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-container :show="opened" position="bottom" :duration="duration" :z-index="1300" :close-on-slide-down="false" custom-style="height:100%;background:transparent;" @beforeleave="beginClose" @afterleave="finishClose">
    <view class="photo-sheet-frame" :style="frameStyle"><ProfilePhotoWorkspace ref="workspace" :photos="photos" :busy="busy" :initial-index="initialIndex" @close="beginClose" @upload="$emit('upload', $event)" @remove="$emit('remove', $event)" @facebook="$emit('facebook')" /></view>
  </page-container>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view class="photo-sheet-host" role="dialog" aria-modal="true" :aria-label="t('photoManager.title')">
    <view class="photo-sheet-scrim" :class="{ opened }" @touchmove.stop.prevent @click="beginClose" />
    <view class="photo-sheet-frame" :class="{ opened }" :style="frameStyle" @touchmove.stop><ProfilePhotoWorkspace ref="workspace" :photos="photos" :busy="busy" :initial-index="initialIndex" @close="beginClose" @upload="$emit('upload', $event)" @remove="$emit('remove', $event)" @facebook="$emit('facebook')" /></view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ProfilePhotoWorkspace from './ProfilePhotoWorkspace.vue'
import { readPageHeaderInset } from '@/utils/pageHeaderLayout.js'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({ photos: { type: Array, default: () => [] }, busy: Boolean, blockingOverlay: Boolean, initialIndex: { type: Number, default: -1 } })
const emit = defineEmits(['closed', 'upload', 'remove', 'facebook', 'overlay-back'])
const workspace = ref(null), opened = ref(false)
const duration = ref(240)
const topInset = Math.max(14, readPageHeaderInset(uni))
const frameStyle = computed(() => ({ paddingTop: `${topInset}px`, transitionDuration: `${duration.value}ms` }))
let closing = false, finished = false, frame = null, timer = null
// #ifdef H5
let savedBody = null, savedScroll = null, historyId = null, historyUrl = '', releasingHistory = false
const historyMarker = '__blessPhotoManager'
duration.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 240
function onPop(event) {
  if (!historyId || window.history.state?.[historyMarker] === historyId) return
  if (window.location.href === historyUrl) event.stopImmediatePropagation()
  if (!closing && (props.blockingOverlay || props.busy) && window.location.href === historyUrl) {
    window.history.pushState({ ...window.history.state, [historyMarker]: historyId }, '', historyUrl)
    if (props.blockingOverlay) emit('overlay-back')
    return
  }
  historyId = null
  releasingHistory = false
  window.removeEventListener('popstate', onPop, true)
  if (!finished) beginClose()
}
function releaseHistory() {
  if (historyId && !releasingHistory && window.history.state?.[historyMarker] === historyId && window.location.href === historyUrl) {
    releasingHistory = true
    window.history.back()
  }
}
function onKey(event) { if (event.key === 'Escape') { event.preventDefault(); back() } }
function lockBackground() {
  savedScroll = { x: window.scrollX, y: window.scrollY }
  const style = document.body.style
  savedBody = Object.fromEntries(['position', 'top', 'left', 'width', 'height', 'overflow'].map(key => [key, style[key]]))
  Object.assign(style, { position: 'fixed', top: `-${savedScroll.y}px`, left: `-${savedScroll.x}px`, width: '100%', height: 'auto', overflow: 'hidden' })
}
function unlockBackground() {
  if (!savedBody) return
  Object.assign(document.body.style, savedBody)
  savedBody = null
  if (window.location.href === historyUrl) window.scrollTo(savedScroll.x, savedScroll.y)
}
// #endif
function beginClose() {
  if (closing || finished) return
  closing = true
  clearTimeout(frame)
  opened.value = false
  // #ifdef H5
  releaseHistory()
  // #endif
  timer = setTimeout(finishClose, duration.value + 40)
}
function finishClose() {
  if (finished || !closing) return
  finished = true
  clearTimeout(timer)
  // #ifdef H5
  unlockBackground()
  // #endif
  emit('closed')
}
onMounted(async () => {
  // #ifdef H5
  historyUrl = window.location.href
  lockBackground()
  try {
    historyId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.history.pushState({ ...window.history.state, [historyMarker]: historyId }, '', historyUrl)
    window.addEventListener('popstate', onPop, true)
  } catch (_) { historyId = null }
  window.addEventListener('keydown', onKey)
  // #endif
  await nextTick()
  if (finished) return
  frame = setTimeout(() => { if (!closing) opened.value = true }, 24)
})
onBeforeUnmount(() => {
  finished = true
  clearTimeout(frame); clearTimeout(timer)
  // #ifdef H5
  unlockBackground()
  releaseHistory()
  window.removeEventListener('keydown', onKey)
  if (!releasingHistory) window.removeEventListener('popstate', onPop, true)
  // #endif
})
function back() { if (props.blockingOverlay) emit('overlay-back'); else workspace.value?.back() }
defineExpose({ back })
</script>

<style scoped>
.photo-sheet-host{position:fixed;inset:0;z-index:1300;overflow:hidden;overscroll-behavior:none;}.photo-sheet-scrim{position:absolute;inset:0;background:rgba(29,27,25,.28);opacity:0;transition:opacity 240ms cubic-bezier(.32,.72,0,1);}.photo-sheet-scrim.opened{opacity:1;}.photo-sheet-frame{position:relative;box-sizing:border-box;width:100%;height:100%;max-width:680px;margin:0 auto;}
/* #ifndef MP-WEIXIN */
.photo-sheet-frame{transform:translate3d(0,100%,0);transition-property:transform;transition-timing-function:cubic-bezier(.32,.72,0,1);pointer-events:none;}.photo-sheet-frame.opened{transform:translate3d(0,0,0);pointer-events:auto;}
/* #endif */
/* #ifdef H5 */
/* uni-app's modal dialog must remain above this custom sheet. */
.photo-sheet-host{z-index:900;}
/* #endif */
@media(prefers-reduced-motion:reduce){.photo-sheet-scrim{transition:none;}}
</style>
