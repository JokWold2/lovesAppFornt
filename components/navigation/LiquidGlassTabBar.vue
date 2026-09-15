<template>
  <view v-show="visible" class="liquid-tabbar-dock">
    <!-- #ifdef H5 -->
    <svg class="liquid-tabbar-filters" aria-hidden="true" focusable="false">
      <defs>
        <filter v-for="lens in opticalLayers" :id="lens.id" :key="lens.id" x="0" y="0" :width="lens.map.width" :height="lens.map.height" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feImage :href="lens.map.href" :xlink:href="lens.map.href" x="0" y="0" :width="lens.map.width" :height="lens.map.height" preserveAspectRatio="none" result="lens-map" />
          <feDisplacementMap in="SourceGraphic" in2="lens-map" :scale="lens.map.scale * lens.strength" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
    <!-- #endif -->
    <view class="liquid-tabbar" :class="{ 'is-dragging': dragging, 'is-settling': settling, 'has-optics': opticsReady }" role="navigation" :aria-label="labels.join(' · ')"
      @touchmove.stop.prevent="moveTouch" @touchend="endTouch" @touchcancel="cancelGesture">
      <view class="liquid-tabbar-effect" :style="effectStyle" aria-hidden="true" />
      <view class="liquid-tabbar-tint" aria-hidden="true" />
      <view class="liquid-tabbar-shine" aria-hidden="true" />
      <view class="liquid-tabbar-items">
        <button
          v-for="(item, index) in TAB_BAR_ITEMS"
          :key="item.route"
          class="liquid-tabbar-item"
          :class="{ 'is-selected': selectedIndex === index, 'is-switching': switching }"
          :aria-current="selectedIndex === index ? 'page' : undefined"
          :aria-label="labels[index]"
          :data-tab-index="index"
          role="button"
          tabindex="0"
          :disabled="switching"
          hover-class="liquid-tabbar-pressed"
          @tap="tapTab(item.route)"
          @touchstart="startTouch($event, index)"
          @keydown.enter.prevent="tapTab(item.route)"
          @keydown.space.prevent="tapTab(item.route)"
        >
          <view class="liquid-tabbar-icon-wrap" :style="itemMagnification(index)">
            <uni-icons :type="item.icon" :size="23" :color="selectedIndex === index ? '#17191c' : '#54585e'" />
            <text v-if="index === 1 && snapshot.unreadText" class="liquid-tabbar-badge">{{ snapshot.unreadText }}</text>
          </view>
          <text class="liquid-tabbar-label">{{ labels[index] }}</text>
        </button>
      </view>
      <view class="liquid-tabbar-track" aria-hidden="true">
        <view class="liquid-tabbar-selection" :style="selectionStyle">
          <view class="liquid-tabbar-lens" :style="selectionEffectStyle" />
          <view class="liquid-tabbar-lens-rim" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { t } from '@/utils/localeRuntime.js'
import { TAB_BAR_ITEMS, activateLiquidTabBar, getTabBarIndex, getTabSwitchTarget, isLiquidTabBarVisible, tabBarState } from '@/utils/tabBarState.js'
import { createLensMap, createLensMotion, dragLensPosition } from '@/utils/liquidLens.js'

const props = defineProps({
  activeRoute: { type: String, required: true },
  inputActive: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false }
})
const emit = defineEmits(['visibility-change'])
const snapshot = ref(tabBarState.read())
const pageVisible = ref(true)
const keyboardHeight = ref(0)
const inputFocused = ref(false)
const switching = ref(false)
const selectedIndex = ref(Math.max(0, getTabBarIndex(props.activeRoute)))
const lensPosition = ref(selectedIndex.value)
const dragging = ref(false)
const settling = ref(false)
const opticsReady = ref(false)
const opticalLayers = ref([])
const instance = getCurrentInstance()
let itemWidth = 100
let gesture = null
let ignoreTapUntil = 0
let reducedMotion = false
let resizeObserver = null
let mouseElement = null
const motion = createLensMotion({ update: value => { lensPosition.value = value } })
const labels = computed(() => TAB_BAR_ITEMS.map(item => t(item.labelKey)))
const visible = computed(() => !props.hidden && isLiquidTabBarVisible({
  route: props.activeRoute,
  pageVisible: pageVisible.value,
  keyboardHeight: keyboardHeight.value,
  inputFocused: inputFocused.value || props.inputActive
}))
const glassFilterId = `liquid-tabbar-glass-${instance.uid}`
const effectStyle = computed(() => opticsReady.value ? {
  backdropFilter: `url(#${glassFilterId}) saturate(1.35)`,
  WebkitBackdropFilter: `url(#${glassFilterId}) saturate(1.35)`
} : {})
const selectionEffectStyle = computed(() => opticsReady.value ? {
  backdropFilter: `url(#${glassFilterId}-selection) saturate(1.25)`,
  WebkitBackdropFilter: `url(#${glassFilterId}-selection) saturate(1.25)`
} : {})
const selectionStyle = computed(() => ({
  transform: `translateX(${lensPosition.value * 100}%) scale(${!reducedMotion && dragging.value ? '1.1, 1.1' : !reducedMotion && settling.value ? '1.04, 1.02' : '1, 1'})`
}))

function itemMagnification(index) {
  // Enlarge the vector icon itself on every platform. Keep navigation labels
  // above all optical layers, at their native size, so glyphs stay crisp.
  if (reducedMotion) return {}
  const influence = Math.max(0, 1 - Math.abs(lensPosition.value - index))
  return { transform: `scale(${1 + influence * (dragging.value ? 0.22 : 0.12)})` }
}

function measureGlass() {
  // #ifdef H5
  const element = instance.proxy?.$el?.querySelector?.('.liquid-tabbar')
  if (!element) return
  const bounds = element.getBoundingClientRect()
  if (!bounds.width) return
  if (mouseElement !== element) {
    mouseElement?.removeEventListener('mousedown', startMouse)
    mouseElement = element
    mouseElement.addEventListener('mousedown', startMouse)
  }
  itemWidth = (bounds.width - 12) / TAB_BAR_ITEMS.length
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // WebKit accepts some url() syntax but does not render SVG backdrop filters.
  const supportsOptics = /Chrome|Chromium|Edg\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#lens)')
  if (supportsOptics) {
    opticalLayers.value = [
      { id: glassFilterId, map: createLensMap(Math.round(bounds.width - 2), 66, 1.1), strength: 0.4 },
      { id: `${glassFilterId}-selection`, map: createLensMap(Math.round(itemWidth - 2), 54, 1.22), strength: 0.55 }
    ]
    opticsReady.value = true
  }
  // #endif
  // #ifndef H5
  uni.createSelectorQuery().in(instance.proxy).select('.liquid-tabbar').boundingClientRect(rect => {
    if (rect?.width) itemWidth = (rect.width - 12) / TAB_BAR_ITEMS.length
  }).exec()
  // #endif
}

function beginGesture(x, y, index) {
  if (switching.value) return
  motion.cancel()
  gesture = { x, y, index, start: lensPosition.value, moved: false }
  dragging.value = true
}

function moveGesture(x, y) {
  if (!gesture) return
  const dx = x - gesture.x
  const dy = y - gesture.y
  if (!gesture.moved && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { cancelGesture(); return }
  if (Math.abs(dx) > 4) gesture.moved = true
  if (gesture.moved) lensPosition.value = dragLensPosition(gesture.start, dx, itemWidth, TAB_BAR_ITEMS.length)
}

function finishGesture() {
  if (!gesture) return
  const index = gesture.moved ? Math.round(lensPosition.value) : gesture.index
  gesture = null
  dragging.value = false
  ignoreTapUntil = Date.now() + 450
  selectTab(TAB_BAR_ITEMS[index].route)
}

function cancelGesture() {
  if (!gesture) return
  gesture = null
  dragging.value = false
  detachMouse()
  ignoreTapUntil = Date.now() + 450
  motion.settle(lensPosition.value, selectedIndex.value, undefined, reducedMotion ? 0 : 220)
}

function startTouch(event, index) {
  if (event.touches?.length !== 1) { cancelGesture(); return }
  const touch = event.touches?.[0]
  if (touch && event.touches.length === 1) beginGesture(touch.clientX, touch.clientY, index)
}
function moveTouch(event) {
  if (event.touches?.length !== 1) { cancelGesture(); return }
  const touch = event.touches[0]
  moveGesture(touch.clientX, touch.clientY)
}
function endTouch() { finishGesture() }
function mouseMove(event) { moveGesture(event.clientX, event.clientY) }
function mouseUp() { finishGesture(); detachMouse() }
function detachMouse() {
  // #ifdef H5
  window.removeEventListener('mousemove', mouseMove)
  window.removeEventListener('mouseup', mouseUp)
  window.removeEventListener('blur', cancelGesture)
  // #endif
}
function startMouse(event) {
  // #ifdef H5
  if (event.button !== 0 || Date.now() < ignoreTapUntil) return
  const button = event.target.closest('.liquid-tabbar-item')
  if (!button) return
  const index = Number(button.dataset.tabIndex)
  // Use a native listener: uni normalizes mouse events, dropping `button` and
  // offsetting clientY by the navigation header, unlike window mousemove.
  beginGesture(event.clientX, event.clientY, index)
  window.addEventListener('mousemove', mouseMove)
  window.addEventListener('mouseup', mouseUp)
  window.addEventListener('blur', cancelGesture)
  // #endif
}
function tapTab(route) { if (Date.now() >= ignoreTapUntil) selectTab(route) }

let mounted = false
let listenersAttached = false
let focusTimer = null

function isOwnPage() {
  if (typeof getCurrentPages !== 'function') return true
  const pages = getCurrentPages()
  return getTabBarIndex(pages[pages.length - 1]?.route) === getTabBarIndex(props.activeRoute)
}

function handleKeyboardHeight(event) {
  if (!isOwnPage()) return
  keyboardHeight.value = Math.max(0, Number(event?.height) || 0)
}

function syncEditableFocus() {
  // #ifdef H5
  const element = document.activeElement
  inputFocused.value = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable === true
  // #endif
}

function handleFocusChange() {
  if (focusTimer) clearTimeout(focusTimer)
  // focusout fires before the browser updates activeElement.
  focusTimer = setTimeout(syncEditableFocus, 0)
}

function attachListeners() {
  if (!mounted || listenersAttached) return
  listenersAttached = true
  if (typeof uni.onKeyboardHeightChange === 'function') uni.onKeyboardHeightChange(handleKeyboardHeight)
  // #ifdef H5
  document.addEventListener('focusin', handleFocusChange)
  document.addEventListener('focusout', handleFocusChange)
  syncEditableFocus()
  // #endif
}

function detachListeners() {
  if (!listenersAttached) return
  listenersAttached = false
  if (typeof uni.offKeyboardHeightChange === 'function') uni.offKeyboardHeightChange(handleKeyboardHeight)
  // #ifdef H5
  document.removeEventListener('focusin', handleFocusChange)
  document.removeEventListener('focusout', handleFocusChange)
  // #endif
  if (focusTimer) clearTimeout(focusTimer)
  focusTimer = null
}

function suspend() {
  motion.cancel()
  gesture = null
  dragging.value = false
  settling.value = false
  detachMouse()
  pageVisible.value = false
  detachListeners()
}

function resume() {
  if (!isOwnPage()) return
  keyboardHeight.value = 0
  inputFocused.value = false
  activateLiquidTabBar(props.activeRoute)
}

const unsubscribe = tabBarState.subscribe((next, reason) => {
  snapshot.value = next
  if (reason !== 'activate') return
  if (getTabBarIndex(next.activeRoute) !== getTabBarIndex(props.activeRoute)) {
    suspend()
    return
  }
  pageVisible.value = true
  switching.value = false
  keyboardHeight.value = 0
  selectedIndex.value = getTabBarIndex(props.activeRoute)
  lensPosition.value = selectedIndex.value
  nextTick(measureGlass)
  attachListeners()
})

function selectTab(route) {
  const url = getTabSwitchTarget(props.activeRoute, route)
  if (switching.value) return
  const target = getTabBarIndex(route)
  if (target < 0) return
  switching.value = Boolean(url)
  settling.value = true
  motion.settle(lensPosition.value, target, () => {
    settling.value = false
    if (!url) return
    // Finish on the old page first, so a cold or cached destination starts at
    // exactly the same position instead of cutting off the sliding lens.
    uni.switchTab({
      url,
      success: () => activateLiquidTabBar(route),
      fail: () => {
        motion.settle(lensPosition.value, selectedIndex.value)
        uni.showToast({ title: t('home.actionFailed'), icon: 'none' })
      },
      complete: () => { switching.value = false }
    })
  }, reducedMotion ? 0 : 280)
}

watch(visible, value => emit('visibility-change', value), { immediate: true })
onMounted(() => {
  mounted = true
  resume()
  // #ifdef H5
  nextTick(() => {
    const element = instance.proxy?.$el?.querySelector?.('.liquid-tabbar')
    if (element && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureGlass)
      resizeObserver.observe(element)
    }
  })
  // #endif
})
onShow(resume)
onActivated(resume)
onHide(suspend)
onDeactivated(suspend)
onBeforeUnmount(() => {
  mounted = false
  motion.cancel()
  detachMouse()
  resizeObserver?.disconnect()
  mouseElement?.removeEventListener('mousedown', startMouse)
  detachListeners()
  unsubscribe()
})
</script>

<style>
.liquid-tab-page {
  --liquid-tabbar-space: 96px;
}
.liquid-tab-page.liquid-tab-page {
  padding-bottom: 96px;
  padding-bottom: calc(var(--liquid-tabbar-space, 96px) + constant(safe-area-inset-bottom));
  padding-bottom: calc(var(--liquid-tabbar-space, 96px) + env(safe-area-inset-bottom));
}
</style>

<style scoped>
.liquid-tabbar-dock {
  position: fixed;
  z-index: 80;
  right: 20px;
  bottom: 12px;
  bottom: calc(12px + constant(safe-area-inset-bottom));
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 20px;
  max-width: 440px;
  margin: 0 auto;
  pointer-events: none;
}
.liquid-tabbar-filters {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.liquid-tabbar {
  position: relative;
  height: 68px;
  isolation: isolate;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 38px;
  background: rgba(246, 247, 248, 0.94);
  box-shadow: 0 12px 35px rgba(24, 30, 38, 0.14), 0 2px 6px rgba(24, 30, 38, 0.06);
  pointer-events: auto;
  box-sizing: border-box;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.liquid-tabbar-effect,
.liquid-tabbar-tint,
.liquid-tabbar-shine {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: inherit;
  pointer-events: none;
}
.liquid-tabbar-effect {
  overflow: hidden;
  z-index: 0;
  -webkit-backdrop-filter: blur(2px) saturate(1.45);
  backdrop-filter: blur(2px) saturate(1.45);
}
.liquid-tabbar-tint {
  /* Attenuate text scrolling behind the bar without blurring the controls. */
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(247, 249, 252, 0.8) 52%, rgba(255, 255, 255, 0.58));
}
.liquid-tabbar-shine {
  box-shadow: inset 1px 1px 1px rgba(255, 255, 255, 0.95), inset -1px -1px 2px rgba(255, 255, 255, 0.68), inset 0 -5px 12px rgba(255, 255, 255, 0.32);
}
.liquid-tabbar-track {
  position: absolute;
  z-index: 3;
  top: 5px;
  right: 5px;
  bottom: 5px;
  left: 5px;
  pointer-events: none;
}
.liquid-tabbar-selection {
  position: relative;
  width: 33.333333%;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 32px;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0.16));
  box-shadow: 0 3px 10px rgba(28, 33, 40, 0.1), inset 1px 1px 1px rgba(255, 255, 255, 0.95), inset -1px -1px 1px rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
  /* Position is driven continuously so the finger, optics and icons stay aligned. */
  will-change: transform;
  transition: box-shadow 240ms ease;
}
.liquid-tabbar-lens,
.liquid-tabbar-lens-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.liquid-tabbar-lens {
  -webkit-backdrop-filter: saturate(1.3);
  backdrop-filter: saturate(1.3);
}
.liquid-tabbar-lens-rim {
  box-shadow: inset 1px 0 1px rgba(156, 216, 255, 0.45), inset -1px 0 1px rgba(255, 190, 151, 0.42), inset 0 1px 1px #ffffff;
}
.is-dragging .liquid-tabbar-selection {
  box-shadow: 0 6px 18px rgba(24, 30, 38, 0.18), inset 1px 1px 2px #fff, inset -1px -1px 2px rgba(255, 255, 255, 0.9);
}
.is-dragging .liquid-tabbar-lens-rim {
  box-shadow: inset 2px 0 2px rgba(156, 216, 255, 0.65), inset -2px 0 2px rgba(255, 190, 151, 0.6), inset 0 2px 1px #ffffff;
}
.liquid-tabbar-items {
  position: relative;
  /* The lens may sample page content, never the navigation glyphs. */
  z-index: 4;
  display: flex;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;
}
.liquid-tabbar-item {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 5px 4px 4px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 0;
  border-radius: 32px;
  background: transparent;
  color: #54585e;
  line-height: 1;
  overflow: visible;
  transition: color 180ms ease, transform 180ms ease;
  -webkit-tap-highlight-color: transparent;
}
.liquid-tabbar-item::after { border: 0; }
.liquid-tabbar-item.is-selected { color: #17191c; }
.liquid-tabbar-item.is-switching { background: transparent; }
.liquid-tabbar-item:focus-visible { outline: 2px solid #31363d; outline-offset: -3px; }
.liquid-tabbar-pressed { background: transparent; }
.liquid-tabbar-icon-wrap { position: relative; height: 25px; line-height: 25px; transform-origin: center; }
.liquid-tabbar-label { margin-top: 3px; max-width: 100%; font-size: 12px; font-weight: 500; line-height: 16px; white-space: nowrap; }
.is-selected .liquid-tabbar-label { font-weight: 600; }
.liquid-tabbar-badge {
  position: absolute;
  top: -4px;
  left: 17px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 1.5px solid rgba(255, 255, 255, 0.96);
  border-radius: 10px;
  box-sizing: border-box;
  background: #272b31;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 13px;
  text-align: center;
}
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .liquid-tabbar { background: rgba(246, 247, 248, 0.08); }
}
@media (prefers-reduced-motion: reduce) {
  .liquid-tabbar-selection, .liquid-tabbar-item { transition: none; }
  .liquid-tabbar-pressed { transform: none; }
}
</style>
