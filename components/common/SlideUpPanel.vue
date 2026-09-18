<template>
  <view v-if="mounted" class="slide-up-host" :style="{ zIndex }" role="dialog" aria-modal="true" :aria-label="label">
    <view class="slide-up-scrim" :class="{ 'is-open': entered }" :style="motionStyle" @touchmove.stop.prevent @click="emit('dismiss')" />
    <view class="slide-up-panel" :class="{ 'is-open': entered, 'is-full': fullHeight }" :style="panelStyle" @touchmove.stop @transitionend="onTransitionEnd"><slot /></view>
  </view>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({ open: Boolean, fullHeight: Boolean, label: String, topInset: { type: Number, default: 0 }, zIndex: { type: Number, default: 20 } })
const emit = defineEmits(['dismiss', 'after-close'])
const mounted = ref(false), entered = ref(false)
let frame = null, timer = null, revision = 0
let duration = 240
// #ifdef H5
duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 240
// #endif
const motionStyle = computed(() => ({ transitionDuration: `${duration}ms` }))
const panelStyle = computed(() => ({ ...motionStyle.value, ...(props.fullHeight ? { top: `${props.topInset}px` } : {}) }))
function finish() {
  if (props.open || !mounted.value) return
  clearTimeout(timer); mounted.value = false; emit('after-close')
}
function onTransitionEnd(event) { if (event.target === event.currentTarget) finish() }
watch(() => props.open, async value => {
  const current = ++revision
  clearTimeout(frame); clearTimeout(timer)
  if (value) {
    mounted.value = true
    await nextTick()
    if (current !== revision) return
    frame = setTimeout(() => { if (props.open) entered.value = true }, duration ? 24 : 0)
  } else {
    entered.value = false
    timer = setTimeout(finish, duration + 32)
  }
}, { immediate: true })
onBeforeUnmount(() => { revision++; clearTimeout(frame); clearTimeout(timer) })
</script>

<style scoped>
.slide-up-host{position:absolute;inset:0;overflow:hidden;}.slide-up-scrim{position:absolute;inset:0;background:rgba(28,26,23,.32);opacity:0;transition-property:opacity;transition-timing-function:cubic-bezier(.32,.72,0,1);}.slide-up-scrim.is-open{opacity:1;}.slide-up-panel{position:absolute;left:0;right:0;bottom:0;background:#f5f4f1;border-radius:30px 30px 0 0;transform:translate3d(0,100%,0);transition-property:transform;transition-timing-function:cubic-bezier(.32,.72,0,1);overflow:hidden;pointer-events:none;box-sizing:border-box;}.slide-up-panel.is-open{transform:translate3d(0,0,0);pointer-events:auto;}.slide-up-panel.is-full{display:flex;flex-direction:column;}
</style>
