<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-container :show="opened" position="bottom" :duration="duration" :z-index="1300" :close-on-slide-down="false" custom-style="height:100%;background:transparent;" @beforeleave="nativeLeave" @afterleave="nativeAfterLeave">
    <view class="profile-editor-native" :style="frameStyle"><ProfileEditorWorkspace ref="workspace" :profile="profile" :initial-group="initialGroup" @close="beginClose" @saved="emit('saved', $event)" /></view>
  </page-container>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view class="profile-editor-host" role="dialog" aria-modal="true" :aria-label="t('profileEditor.common.title')">
    <view class="profile-editor-scrim" :class="{ opened }" :style="{ transitionDuration: `${duration}ms` }" @touchmove.stop.prevent @click="back" />
    <view class="profile-editor-panel" :class="{ opened }" :style="frameStyle" @touchmove.stop @transitionend="transitionEnd"><ProfileEditorWorkspace ref="workspace" :profile="profile" :initial-group="initialGroup" @close="beginClose" @saved="emit('saved', $event)" /></view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ProfileEditorWorkspace from './ProfileEditorWorkspace.vue'
import { readPageHeaderInset } from '@/utils/pageHeaderLayout.js'
import { t } from '@/utils/localeRuntime.js'

defineProps({ profile: { type: Object, required: true }, initialGroup: { type: String, default: '' } })
const emit = defineEmits(['closed', 'saved'])
const workspace = ref(null), opened = ref(false), duration = ref(240)
const topInset = Math.max(14, readPageHeaderInset(uni))
const frameStyle = computed(() => ({ paddingTop: `${topInset}px`, transitionDuration: `${duration.value}ms` }))
let closing = false, disposed = false, finished = false, timer = null, frame = null, nativeReturning = false
// #ifdef H5
duration.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 240
const marker = '__blessProfileEditor'
let historyId = null, historyUrl = '', releasing = false, savedBody = null, savedScroll = null
function claimHistory() {
  window.history.pushState({ ...window.history.state, [marker]: historyId }, '', historyUrl)
}
function onPop(event) {
  if (!historyId || window.history.state?.[marker] === historyId || window.location.href !== historyUrl) return
  event.stopImmediatePropagation()
  if (releasing || closing) { historyId = null; window.removeEventListener('popstate', onPop, true); return }
  // Keep the route while the workspace cancels its current group or asks to discard.
  claimHistory(); back()
}
function releaseHistory() {
  if (!historyId || releasing) return
  if (window.history.state?.[marker] === historyId && window.location.href === historyUrl) { releasing = true; window.history.back() }
  else { historyId = null; window.removeEventListener('popstate', onPop, true) }
}
function keydown(event) { if (event.key === 'Escape') { event.preventDefault(); back() } }
function lock() {
  savedScroll = { x: window.scrollX, y: window.scrollY }
  const style = document.body.style
  savedBody = Object.fromEntries(['position','top','left','width','height','overflow'].map(key => [key, style[key]]))
  Object.assign(style, { position: 'fixed', top: `-${savedScroll.y}px`, left: `-${savedScroll.x}px`, width: '100%', height: 'auto', overflow: 'hidden' })
}
function unlock() {
  if (!savedBody) return
  Object.assign(document.body.style, savedBody); savedBody = null
  if (window.location.href === historyUrl) window.scrollTo(savedScroll.x, savedScroll.y)
}
// #endif
function back() { if (!closing) workspace.value?.back() }
function beginClose() {
  if (closing || finished) return
  closing = true; clearTimeout(frame); opened.value = false
  // #ifdef H5
  releaseHistory()
  // #endif
  timer = setTimeout(finish, duration.value + 40)
}
function finish() {
  if (!closing || finished) return
  finished = true; clearTimeout(timer)
  // #ifdef H5
  unlock()
  // #endif
  emit('closed')
}
function transitionEnd(event) { if (event.target === event.currentTarget && closing) finish() }
function nativeLeave() {
  if (closing || disposed || nativeReturning) return
  // Native back must go through the same draft/discard handling as the close button.
  nativeReturning = true; opened.value = false; back()
  if (!closing) nextTick(() => { if (!disposed && !closing) opened.value = true; nativeReturning = false })
}
function nativeAfterLeave() { if (closing) finish() }
onMounted(async () => {
  // #ifdef H5
  historyUrl = window.location.href; lock()
  historyId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try { claimHistory(); window.addEventListener('popstate', onPop, true) } catch (_) { historyId = null }
  window.addEventListener('keydown', keydown)
  // #endif
  await nextTick()
  if (!disposed) frame = setTimeout(() => { if (!closing) opened.value = true }, duration.value ? 24 : 0)
})
onBeforeUnmount(() => {
  disposed = true; clearTimeout(timer); clearTimeout(frame)
  // #ifdef H5
  unlock(); releaseHistory(); window.removeEventListener('keydown', keydown)
  if (!releasing) window.removeEventListener('popstate', onPop, true)
  // #endif
})
defineExpose({ back })
</script>

<style scoped>
.profile-editor-host{position:fixed;inset:0;z-index:1300;overflow:hidden;overscroll-behavior:none;}.profile-editor-scrim{position:absolute;inset:0;background:rgba(29,27,25,.3);opacity:0;transition-property:opacity;transition-timing-function:cubic-bezier(.32,.72,0,1);}.profile-editor-scrim.opened{opacity:1;}.profile-editor-panel,.profile-editor-native{position:relative;box-sizing:border-box;width:100%;height:100%;max-width:680px;margin:0 auto;}.profile-editor-panel{transform:translate3d(0,100%,0);transition-property:transform;transition-timing-function:cubic-bezier(.32,.72,0,1);pointer-events:none;}.profile-editor-panel.opened{transform:translate3d(0,0,0);pointer-events:auto;}
/* #ifdef H5 */
.profile-editor-host{z-index:900;}
/* #endif */
</style>
