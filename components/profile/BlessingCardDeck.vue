<template>
  <view class="blessing-deck">
    <view v-if="current" class="deck-stage" :class="{ 'is-busy': busy }">
      <view v-if="items[2]" class="deck-back deck-back-far"></view>
      <view v-if="items[1]" class="deck-back deck-back-near">
        <image v-if="nextPhoto" class="deck-photo" :src="nextPhoto" mode="aspectFill" />
      </view>
      <view
        class="deck-moving"
        :class="{ 'is-dragging': dragging, 'is-leaving': leaving, 'is-resetting': resetting }"
        :style="cardStyle"
      >
      <view
        class="deck-card"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchCancel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @contextmenu="cancelGesture"
      >
        <image
          v-if="photo && !imageFailed"
          :key="photo"
          class="deck-photo"
          :src="photo"
          mode="aspectFill"
          :draggable="false"
          @load="imageLoaded = true"
          @error="imageFailed = true"
        />
        <view v-if="!photo || imageFailed" class="deck-photo-fallback">
          <uni-icons type="person" color="#96979b" size="72" />
          <text>{{ t('deck.noPhoto') }}</text>
        </view>
        <view v-else-if="!imageLoaded" class="deck-image-loading"></view>
        <view class="deck-shade"></view>
        <view v-if="photos.length > 1" class="deck-photo-tap-zones" aria-hidden="true">
          <view class="deck-photo-zone" @touchstart.stop="onTouchStart($event, -1)" @mousedown.stop="onMouseDown($event, -1)"></view>
          <view class="deck-photo-zone" @touchstart.stop="onTouchStart($event, 1)" @mousedown.stop="onMouseDown($event, 1)"></view>
        </view>
        <view v-if="photos.length > 1" class="deck-photo-dots">
          <view v-for="(_, index) in photos" :key="index" class="deck-photo-dot" :class="{ active: index === photoIndex }"></view>
        </view>
        <view class="deck-stamp deck-stamp-like" :style="{ opacity: likeOpacity }">{{ t('deck.stampLike') }}</view>
        <view class="deck-stamp deck-stamp-pass" :style="{ opacity: passOpacity }">{{ t('deck.stampPass') }}</view>
      </view>
      <!-- Keep profile controls outside the photo gesture surface on WeChat. -->
      <view class="deck-caption">
        <view class="deck-info">
          <view class="deck-name-row">
            <view class="deck-identity">
              <text class="deck-name">{{ current.displayName || t('common.user') }}</text>
              <text v-if="age !== null" class="deck-age">{{ age }}</text>
            </view>
          </view>
          <view v-if="location" class="deck-location"><uni-icons type="location" color="#e8e8eb" size="17" /><text>{{ location }}</text></view>
          <text v-if="current.occupation" class="deck-occupation">{{ current.occupation }}</text>
          <text v-if="current.bio" class="deck-bio">{{ current.bio }}</text>
        </view>
        <button class="deck-detail" :aria-label="t('deck.viewProfile')" :disabled="busy || rewindBusy" @click.stop="openDetail">
          <view class="deck-detail-arrow" aria-hidden="true"></view>
        </button>
      </view>
      </view>
      <!-- This button is outside the swipe surface: stopping touchstart also
           prevents native tap behavior on non-H5 platforms. Keep one tap target. -->
      <button class="deck-rewind" :disabled="busy || loading || rewindBusy || !rewindAvailable" :aria-label="t('deck.rewind')" @click.stop="emit('rewind')">
        <view class="deck-rewind-arrow" aria-hidden="true"></view>
      </button>
      <button v-if="quotaText" class="deck-quota" :class="{ 'has-error': quotaError }" :disabled="quotaLoading" @click.stop="emit('quota-tap')"><text>{{ quotaText }}</text></button>
      <!-- These controls are siblings of the swipe surface, so touchstart must
           retain its default tap behavior on WeChat and App. -->
      <view class="deck-actions">
        <button class="deck-action deck-action-pass" :disabled="busy || loading || rewindBusy" :aria-label="t('deck.pass')" @click.stop="decide('pass')"><view class="deck-action-cross" aria-hidden="true"></view></button>
        <text class="deck-action-caption" aria-live="polite">{{ busy || rewindBusy ? t('deck.saving') : t('deck.swipeHint') }}</text>
        <button class="deck-action deck-action-like" :disabled="busy || loading || rewindBusy" :aria-label="t('deck.like')" @click.stop="decide('like')"><view class="deck-action-heart" aria-hidden="true"></view></button>
      </view>
    </view>
    <FeedContentState
      v-else
      class="deck-empty"
      kind="blessing"
      :status="loading || loadingMore ? 'loading' : (error ? 'error' : 'empty')"
      :disabled="rewindBusy"
      @action="emit(error ? 'retry' : (hasMore ? 'load-more' : 'refresh'))"
    >
      <button v-if="rewindAvailable && !loading && !loadingMore" class="deck-empty-rewind" :disabled="rewindBusy" @click="emit('rewind')">{{ rewindBusy ? t('deck.saving') : t('deck.rewind') }}</button>
    </FeedContentState>
    <view v-if="actionError" class="deck-error" role="status">{{ actionError }}</view>
    <view v-else-if="current && error" class="deck-more-error" @click="emit('retry')">{{ t('deck.moreFailed') }}</view>
  </view>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'
import FeedContentState from '@/components/feedback/FeedContentState.vue'
import { createPhotoTapGesture, getProfileAge, getProfilePhotos, getSwipeDecision } from '@/utils/blessingDeck.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  loadingMore: Boolean,
  hasMore: Boolean,
  error: Boolean,
  active: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
  likeProfile: { type: Function, default: null },
  decideProfile: { type: Function, default: null },
  handleError: { type: Function, default: () => false },
  rewindAvailable: Boolean,
  rewindBusy: Boolean,
  quotaText: { type: String, default: '' },
  quotaLoading: Boolean,
  quotaError: Boolean
})
const emit = defineEmits(['dismiss', 'open', 'refresh', 'retry', 'load-more', 'busy-change', 'rewind', 'quota-tap'])
const current = computed(() => props.items[0] || null)
const photos = computed(() => getProfilePhotos(current.value, config.baseURL))
const photoIndex = ref(0)
const photo = computed(() => photos.value[photoIndex.value] || '')
const nextPhoto = computed(() => getProfilePhotos(props.items[1], config.baseURL)[0] || '')
const age = computed(() => getProfileAge(current.value?.birthYear))
const location = computed(() => [current.value?.country, current.value?.region, current.value?.subRegion].filter(Boolean).join(' · '))
const imageLoaded = ref(false)
const imageFailed = ref(false)
const dragging = ref(false)
const leaving = ref(false)
// Keep replacement cards still until the next interaction, including on reused
// mini-program views. A changing key only recreates the element on H5.
const resetting = ref(true)
const busy = ref(false)
const offset = ref({ x: 0, y: 0 })
const actionError = ref('')
let gesture = null
let generation = 0
let leaveTimer = null
let mouseActive = false
let lastTouchTime = -Infinity
const photoTap = createPhotoTapGesture()
const cardStyle = computed(() => ({ transform: `translate3d(${offset.value.x}px, ${offset.value.y * 0.15}px, 0) rotate(${Math.max(-18, Math.min(18, offset.value.x / 20))}deg)` }))
const likeOpacity = computed(() => Math.min(1, Math.max(0, offset.value.x / 95)))
const passOpacity = computed(() => Math.min(1, Math.max(0, -offset.value.x / 95)))

watch(busy, value => emit('busy-change', value), { flush: 'sync' })
watch(photo, () => { imageLoaded.value = false; imageFailed.value = false })
watch(() => [current.value?.profileId, props.revision], () => {
  generation++
  clearTimeout(leaveTimer)
  resetting.value = true
  busy.value = false
  leaving.value = false
  photoIndex.value = 0
  actionError.value = ''
  cancelGesture()
})
watch(() => props.active, active => { if (!active) cancelGesture() })

function changePhoto(direction) {
  if (busy.value || props.rewindBusy || !photos.value.length) return
  photoIndex.value = (photoIndex.value + direction + photos.value.length) % photos.value.length
}
function openDetail() {
  if (busy.value || props.rewindBusy || !current.value) return
  emit('open', current.value)
}
function point(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event
  return { x: touch.clientX ?? touch.pageX, y: touch.clientY ?? touch.pageY }
}
function startGesture(event, photoDirection) {
  if (busy.value || props.rewindBusy || props.loading || !props.active || !current.value) return
  const start = point(event)
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return
  resetting.value = false
  gesture = { ...start, time: Date.now(), axis: null }
  photoTap.start({ ...start, direction: photoDirection, time: gesture.time })
  actionError.value = ''
}
function moveGesture(event) {
  if (!gesture) return
  const next = point(event)
  photoTap.move(next)
  const x = next.x - gesture.x
  const y = next.y - gesture.y
  if (!gesture.axis && Math.max(Math.abs(x), Math.abs(y)) > 8) gesture.axis = Math.abs(x) > Math.abs(y) * 1.15 ? 'x' : 'y'
  if (gesture.axis !== 'x') return
  // uni-app's H5 touch wrapper forwards preventDefault, but omits cancelable.
  if (event.cancelable !== false && typeof event.preventDefault === 'function') event.preventDefault()
  dragging.value = true
  offset.value = { x, y }
}
function endGesture(event, allowPhotoTap = true) {
  if (!gesture) return
  const start = gesture
  const end = point(event)
  const time = Date.now()
  if (!allowPhotoTap) photoTap.cancel()
  const photoDirection = photoTap.end({ ...end, time })
  gesture = null
  dragging.value = false
  mouseActive = false
  let width = 360
  try { width = Math.min(460, uni.getSystemInfoSync().windowWidth - 24) } catch (_) { /* default width */ }
  const direction = start.axis === 'x' ? getSwipeDecision({ x: end.x - start.x, y: end.y - start.y, width, elapsed: time - start.time }) : null
  if (direction) void decide(direction)
  else {
    offset.value = { x: 0, y: 0 }
    if (photoDirection) changePhoto(photoDirection)
  }
}
function cancelGesture() {
  photoTap.cancel()
  gesture = null
  dragging.value = false
  if (!leaving.value) offset.value = { x: 0, y: 0 }
  mouseActive = false
}
function onTouchStart(event, photoDirection) {
  lastTouchTime = Date.now()
  if (event.touches?.length > 1) return cancelGesture()
  startGesture(event, photoDirection)
}
function onTouchMove(event) {
  lastTouchTime = Date.now()
  if (event.touches?.length > 1) return cancelGesture()
  moveGesture(event)
}
function onTouchEnd(event) {
  lastTouchTime = Date.now()
  if (event.touches?.length) return cancelGesture()
  endGesture(event)
}
function onTouchCancel() { lastTouchTime = Date.now(); cancelGesture() }
function onMouseDown(event, photoDirection) {
  // #ifdef H5
  // uni-app normalizes mouse events: button is omitted and Y excludes the page header.
  // Keep move/up on the same uni event surface so coordinates stay consistent.
  if (Date.now() - lastTouchTime < 800) return
  if (typeof event.button === 'number' && event.button !== 0) return
  startGesture(event, photoDirection)
  if (gesture) {
    mouseActive = true
    event.preventDefault?.()
  }
  // #endif
}
function onMouseMove(event) { if (mouseActive) moveGesture(event) }
function onMouseUp(event) { if (mouseActive) endGesture(event) }
function onMouseLeave(event) { if (mouseActive) endGesture(event, false) }
async function decide(direction) {
  if (busy.value || props.rewindBusy || props.loading || !props.active || !current.value) return
  const profile = current.value
  const requestGeneration = generation
  const revision = props.revision
  busy.value = true
  resetting.value = false
  actionError.value = ''
  dragging.value = false
  offset.value = { x: direction === 'like' ? 24 : -24, y: 0 }
  try {
    let saved = null
    if (props.decideProfile) {
      saved = await props.decideProfile(profile, direction)
      if (direction === 'like' && !saved?.isLiked) throw new Error('Like was not saved')
    } else if (direction === 'like') {
      const saved = await props.likeProfile(profile)
      if (!saved?.isLiked) throw new Error('Like was not saved')
    }
    if (requestGeneration !== generation) return
    leaving.value = true
    offset.value = { x: direction === 'like' ? 900 : -900, y: 0 }
    leaveTimer = setTimeout(async () => {
      if (requestGeneration !== generation) return
      resetting.value = true
      emit('dismiss', { profileId: profile.profileId, direction, revision, result: saved })
      await nextTick()
      leaving.value = false
      offset.value = { x: 0, y: 0 }
      busy.value = false
    }, 260)
  } catch (error) {
    if (requestGeneration !== generation) return
    offset.value = { x: 0, y: 0 }
    busy.value = false
    if (!props.handleError(error)) actionError.value = t('deck.likeFailed')
  }
}
onHide(cancelGesture)
onBeforeUnmount(() => { generation++; clearTimeout(leaveTimer); cancelGesture(); emit('busy-change', false) })
</script>

<style scoped lang="scss">
.blessing-deck { width: 100%; max-width: 460px; margin: 0 auto; }
.deck-rewind { position: absolute; z-index: 5; top: 28px; right: 16px; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin: 0; padding: 0; border-radius: 50%; border: 1px solid rgba(242,214,139,.7); background: rgba(24,24,26,.52); }
.deck-rewind::after { border: none; }
.deck-rewind-arrow { position: relative; width: 24px; height: 24px; pointer-events: none; }
.deck-rewind-arrow::before { content: ''; position: absolute; inset: 3px; border: 2px solid #f2d68b; border-left-color: transparent; border-radius: 50%; transform: rotate(-35deg); }
.deck-rewind-arrow::after { content: ''; position: absolute; top: 2px; left: 2px; width: 7px; height: 7px; border-left: 2px solid #f2d68b; border-bottom: 2px solid #f2d68b; }
.deck-rewind[disabled] { opacity: .4; }
.deck-quota { position: absolute; z-index: 5; top: 28px; left: 16px; right: 76px; width: auto; min-height: 44px; box-sizing: border-box; padding: 7px 12px; margin: 0; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.2); border-radius: 22px; background: rgba(24,24,26,.52); color: #f3deb1; font-size: 11px; line-height: 1.5; text-align: center; overflow-wrap: anywhere; }
.deck-quota::after { border: none; }
.deck-quota text { pointer-events: none; }
.deck-quota.has-error { border-color: rgba(242,214,139,.7); }
.deck-quota[disabled] { color: #e0d6c1; background: rgba(24,24,26,.52); }
.deck-empty-rewind { padding: 10px 22px; min-height: 44px; font-size: 13px; line-height: 1.5; border-radius: 24px; color: #795d1e; background: transparent; transition: transform 140ms cubic-bezier(.23,1,.32,1); }
.deck-empty-rewind:active { transform: scale(.97); }
.deck-stage { position: relative; height: var(--blessing-card-height, 540px); min-height: 280px; margin: 8px 0 12px; }
.deck-card, .deck-back { position: absolute; inset: 0; border-radius: 28px; overflow: hidden; background: #242529; }
.deck-back-far { transform: translateY(12px) scale(.94); background: #d7d7da; }
.deck-back-near { transform: translateY(6px) scale(.975); opacity: .55; }
.deck-moving { position: absolute; inset: 0; z-index: 2; transform-origin: 50% 85%; transition: transform 280ms cubic-bezier(.2,.75,.25,1); }
.deck-card { z-index: 2; touch-action: pan-y; user-select: none; -webkit-user-select: none; box-shadow: 0 10px 28px rgba(18,19,22,.1); }
.deck-moving.is-dragging { transition: none; cursor: grabbing; }
.deck-moving.is-leaving { transition: transform 260ms ease-in; pointer-events: none; }
.deck-moving.is-resetting { transition: none; }
.deck-photo { width: 100%; height: 100%; position: absolute; inset: 0; pointer-events: none; }
.deck-photo-fallback, .deck-image-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #bfc0c3; font-size: 14px; background: #303136; }
.deck-image-loading { background: linear-gradient(110deg, #303136 25%, #45464a 45%, #303136 65%); background-size: 220% 100%; animation: shimmer 1.6s linear infinite; }
.deck-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.14), transparent 28%, transparent 38%, rgba(8,9,11,.5) 68%, rgba(8,9,11,.94)); }
.deck-photo-tap-zones { position: absolute; inset: 0; display: flex; z-index: 1; }
.deck-photo-zone { flex: 1; height: 100%; }
.deck-photo-dots { position: absolute; top: 12px; left: 18px; right: 18px; display: flex; gap: 4px; pointer-events: none; }
.deck-photo-dot { height: 3px; flex: 1; border-radius: 4px; background: rgba(255,255,255,.28); }
.deck-photo-dot.active { background: #fff; }
.deck-detail::after, .deck-action::after, .deck-empty-rewind::after { border: none; }
.deck-stamp { position: absolute; z-index: 2; top: 66px; font-size: 34px; font-weight: 800; letter-spacing: 3px; border: 3px solid; border-radius: 8px; padding: 3px 10px; pointer-events: none; }
.deck-stamp-like { left: 24px; color: #52f0b4; transform: rotate(-14deg); }
.deck-stamp-pass { right: 24px; color: #ff766e; transform: rotate(14deg); }
.deck-caption { position: absolute; z-index: 3; left: 22px; right: 20px; bottom: 112px; display: flex; align-items: flex-start; gap: 8px; color: #fff; }
.deck-info { flex: 1; min-width: 0; pointer-events: none; }
.deck-name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.deck-identity { display: flex; gap: 10px; align-items: baseline; min-width: 0; }
.deck-name { font-size: 30px; line-height: 1.2; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deck-age { font-size: 26px; flex-shrink: 0; font-weight: 400; }
.deck-detail { position: relative; z-index: 2; width: 44px; height: 44px; flex: 0 0 44px; margin: 0; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); }
/* A decorative arrow must not consume the button's tap as a component event. */
.deck-detail-arrow { position: relative; width: 24px; height: 24px; pointer-events: none; }
.deck-detail-arrow::before { content: ''; position: absolute; left: 11px; top: 3px; width: 2px; height: 20px; background: #fff; border-radius: 2px; }
.deck-detail-arrow::after { content: ''; position: absolute; left: 6px; top: 4px; width: 10px; height: 10px; border-top: 2px solid #fff; border-left: 2px solid #fff; transform: rotate(45deg); }
.deck-location { display: flex; align-items: center; gap: 5px; margin-top: 5px; font-size: 14px; line-height: 1.4; color: #e8e8eb; }
.deck-location text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deck-occupation, .deck-bio { display: block; margin-top: 8px; font-size: 13px; line-height: 1.5; color: #e0e0e3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deck-bio { opacity: .85; }
.deck-actions { position: absolute; z-index: 4; bottom: 20px; left: 24px; right: 24px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.deck-action { flex: 0 0 62px; width: 62px; height: 62px; margin: 0; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(35,35,37,.54); border: 1px solid rgba(255,255,255,.24); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: transform 180ms; }
.deck-action:active { transform: scale(.92); }
.deck-action[disabled] { opacity: .45; }
.deck-action-cross, .deck-action-heart { position: relative; flex-shrink: 0; pointer-events: none; }
.deck-action-cross { width: 30px; height: 30px; }
.deck-action-cross::before, .deck-action-cross::after { content: ''; position: absolute; left: 13px; top: 0; width: 4px; height: 30px; border-radius: 2px; background: #fff; transform: rotate(45deg); }
.deck-action-cross::after { transform: rotate(-45deg); }
.deck-action-heart { width: 20px; height: 20px; margin-top: 5px; border-radius: 2px; background: #ff453a; transform: rotate(-45deg); }
.deck-action-heart::before, .deck-action-heart::after { content: ''; position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #ff453a; }
.deck-action-heart::before { top: -10px; left: 0; }
.deck-action-heart::after { top: 0; left: 10px; }
.deck-action-caption { max-width: 125px; font-size: 11px; line-height: 1.7; text-align: center; color: rgba(255,255,255,.75); }
.deck-empty { min-height: 340px; margin: 8px 0 12px; border-radius: 28px; background: #fff; }
.deck-error, .deck-more-error { padding: 10px 12px; font-size: 13px; line-height: 1.6; text-align: center; color: #b93128; }
.deck-more-error { color: #686b72; }
@keyframes shimmer { to { background-position: -220% 0; } }
@media (max-height: 720px) { .deck-caption { bottom: 96px; } .deck-bio { display: none; } .deck-actions { bottom: 16px; } .deck-action { width: 54px; height: 54px; flex-basis: 54px; } .deck-name { font-size: 25px; } }
@media (prefers-reduced-motion: reduce) { .deck-moving, .deck-action, .deck-empty-rewind { transition-duration: .01ms; } .deck-image-loading { animation: none; } .deck-empty-rewind:active { transform: none; } }
</style>
