<template>
  <view v-if="retained" class="bless-sheet-host" :style="{ zIndex }">
    <SlideUpPanel :open="open" :label="label" @dismiss="dismiss" @after-close="finish"><slot /></SlideUpPanel>
  </view>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
// #ifdef APP-PLUS
import { onBackPress } from '@dcloudio/uni-app'
// #endif
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'

const props = defineProps({ open: Boolean, label: String, busy: Boolean, zIndex: { type: Number, default: 1400 } })
const emit = defineEmits(['dismiss', 'after-close'])
const retained = ref(false)
let disposed = false

// #ifdef H5
let entry = null, releasing = false
function onPop(event) {
  if (!entry || window.history.state?.blessOverlay === entry.id || window.location.href !== entry.url) return
  event.stopImmediatePropagation()
  if (!disposed && props.open && (props.busy || releasing)) {
    window.history.pushState({ ...window.history.state, blessOverlay: entry.id }, '', entry.url)
    releasing = false
    return
  }
  entry = null
  releasing = false
  window.removeEventListener('popstate', onPop, true)
  emit('dismiss')
}
function releaseHistory() {
  if (entry && !releasing && window.location.href === entry.url && window.history.state?.blessOverlay === entry.id) {
    releasing = true
    window.history.back()
  }
}
// #endif

watch(() => props.open, value => {
  if (value) retained.value = true
  // #ifdef H5
  if (value && !entry) {
    entry = { id: `bless-${Date.now()}-${Math.random()}`, url: window.location.href }
    window.history.pushState({ ...window.history.state, blessOverlay: entry.id }, '', entry.url)
    window.addEventListener('popstate', onPop, true)
  } else if (!value) releaseHistory()
  // #endif
}, { immediate: true })

function dismiss() { if (!props.busy) emit('dismiss') }
function finish() { if (!props.open) { retained.value = false; emit('after-close') } }

// #ifdef APP-PLUS
onBackPress(() => { if (disposed || !retained.value) return false; dismiss(); return true })
// #endif

onBeforeUnmount(() => {
  disposed = true
  retained.value = false
  // #ifdef H5
  releaseHistory()
  if (!releasing) window.removeEventListener('popstate', onPop, true)
  // #endif
})
</script>

<style scoped>
.bless-sheet-host { position: fixed; inset: 0; z-index: 1400; }
/* #ifdef H5 */
.bless-sheet-host { bottom: var(--app-viewport-bottom-offset, 0px); }
/* #endif */
</style>
