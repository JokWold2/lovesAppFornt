<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-container v-if="retained" :show="nativeOpen" position="bottom" :duration="240" :overlay="true" :z-index="1100" :close-on-slide-down="false" custom-style="border-radius:30px 30px 0 0;background:#f5f4f1;" @beforeleave="nativeLeaving" @afterleave="nativeLeft"><slot /></page-container>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view v-if="retained" class="chat-sheet-host">
    <SlideUpPanel :open="open" :label="label" @dismiss="dismiss" @after-close="finish"><slot /></SlideUpPanel>
  </view>
  <!-- #endif -->
</template>
<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
// #ifdef APP-PLUS
import { onBackPress } from '@dcloudio/uni-app'
// #endif
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
const props = defineProps({ open: Boolean, label: String, busy: Boolean })
const emit = defineEmits(['dismiss', 'after-close'])
const retained = ref(false)
const nativeOpen = ref(false)
let disposed = false
// #ifdef H5
let entry = null, releasing = false
function pop(event) {
  if (!entry || window.history.state?.chatOverlay === entry.id || window.location.href !== entry.url) return
  event.stopImmediatePropagation()
  // A pending submit (or a reopen during an owned history.back) must retain
  // its same-page back boundary rather than allowing a second back to leave.
  if (!disposed && props.open && (props.busy || releasing)) {
    window.history.pushState({ ...window.history.state, chatOverlay: entry.id }, '', entry.url)
    releasing = false
    return
  }
  entry = null; releasing = false
  window.removeEventListener('popstate', pop, true)
  emit('dismiss')
}
function release() {
  if (entry && !releasing && window.location.href === entry.url && window.history.state?.chatOverlay === entry.id) { releasing = true; window.history.back() }
}
// #endif
watch(() => props.open, value => {
  nativeOpen.value = value
  if (value) retained.value = true
  // #ifdef H5
  if (value && !entry) {
    entry = { id: `chat-${Date.now()}-${Math.random()}`, url: window.location.href }
    window.history.pushState({ ...window.history.state, chatOverlay: entry.id }, '', entry.url)
    window.addEventListener('popstate', pop, true)
  } else if (!value) release()
  // #endif
}, { immediate: true })
function dismiss() { if (!props.busy) emit('dismiss') }
function finish() { if (!props.open) { retained.value = false; emit('after-close') } }
function nativeLeaving() { nativeOpen.value = false; dismiss() }
function nativeLeft() {
  // Native back can begin closing page-container even during a pending write.
  // Restore it when the caller retained its open state; never leave a hidden,
  // logically-open picker after the native transition.
  if (!disposed && props.open) nativeOpen.value = true
  else finish()
}
// #ifdef APP-PLUS
onBackPress(() => { if (disposed || !retained.value) return false; dismiss(); return true })
// #endif
onBeforeUnmount(() => {
  disposed = true
  retained.value = false
  // #ifdef H5
  release()
  if (!releasing) window.removeEventListener('popstate', pop, true)
  // #endif
})
</script>
<style scoped>
.chat-sheet-host{position:fixed;inset:0;z-index:1100;}
/* #ifdef H5 */
.chat-sheet-host{bottom:var(--app-viewport-bottom-offset,0px);}
/* #endif */
</style>
