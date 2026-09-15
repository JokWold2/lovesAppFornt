<template>
  <view class="blessing-deck">
    <view v-if="current" class="deck-stage" :class="{ 'is-busy': busy }">
      <view v-if="items[2]" class="deck-back deck-back-far"></view>
      <view v-if="items[1]" class="deck-back deck-back-near">
        <image v-if="nextPhoto" class="deck-photo" :src="nextPhoto" mode="aspectFill" />
      </view>
      <view
        class="deck-moving"
        :class="{ 'is-dragging': dragging, 'is-leaving': leaving }"
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
        <view v-if="photos.length > 1" class="deck-photo-controls" @touchstart.stop @mousedown.stop>
          <button class="photo-control" :aria-label="t('deck.previousPhoto')" @click.stop="changePhoto(-1)"><uni-icons type="left" color="#fff" size="20" /></button>
          <button class="photo-control" :aria-label="t('deck.nextPhoto')" @click.stop="changePhoto(1)"><uni-icons type="right" color="#fff" size="20" /></button>
        </view>
        <view class="deck-stamp deck-stamp-like" :style="{ opacity: likeOpacity }">LIKE</view>
        <view class="deck-stamp deck-stamp-pass" :style="{ opacity: passOpacity }">NOPE</view>
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
        <button class="deck-detail" :aria-label="t('deck.viewProfile')" :disabled="busy" @click.stop="openDetail">
          <view class="deck-detail-arrow" aria-hidden="true"></view>
        </button>
      </view>
      </view>
      <view class="deck-actions" @touchstart.stop @mousedown.stop>
        <button class="deck-action deck-action-pass" :disabled="busy || loading" :aria-label="t('deck.pass')" @click="decide('pass')"><uni-icons type="closeempty" size="32" color="#fff" /></button>
        <text class="deck-action-caption" aria-live="polite">{{ busy ? t('deck.saving') : t('deck.swipeHint') }}</text>
        <button class="deck-action deck-action-like" :disabled="busy || loading" :aria-label="t('deck.like')" @click="decide('like')"><uni-icons type="heart-filled" size="32" color="#ff453a" /></button>
      </view>
    </view>
    <view v-else class="deck-empty" aria-live="polite">
      <view v-if="loading || loadingMore" class="deck-spinner"></view>
      <uni-icons v-else type="person" size="48" color="#95969a" />
      <text class="deck-empty-title">{{ loading || loadingMore ? t('home.loading') : (error ? t('home.loadFailed') : t('deck.caughtUp')) }}</text>
      <text v-if="!loading && !loadingMore" class="deck-empty-hint">{{ error ? t('deck.retryHint') : t('deck.emptyHint') }}</text>
      <button v-if="!loading && !loadingMore" class="deck-reload" @click="emit(error ? 'retry' : (hasMore ? 'load-more' : 'refresh'))">{{ error ? t('deck.retry') : t('deck.newRound') }}</button>
    </view>
    <view v-if="actionError" class="deck-error" role="status">{{ actionError }}</view>
    <view v-else-if="current && error" class="deck-more-error" @click="emit('retry')">{{ t('deck.moreFailed') }}</view>
  </view>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'
import { createPhotoTapGesture, getProfileAge, getProfilePhotos, getSwipeDecision } from '@/utils/blessingDeck.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  loadingMore: Boolean,
  hasMore: Boolean,
  error: Boolean,
  active: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
  likeProfile: { type: Function, required: true }
})
const emit = defineEmits(['dismiss', 'open', 'refresh', 'retry', 'load-more', 'busy-change'])
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
  busy.value = false
  leaving.value = false
  photoIndex.value = 0
  actionError.value = ''
  cancelGesture()
})
watch(() => props.active, active => { if (!active) cancelGesture() })

function changePhoto(direction) {
  if (busy.value || !photos.value.length) return
  photoIndex.value = (photoIndex.value + direction + photos.value.length) % photos.value.length
}
function openDetail() {
  if (busy.value || !current.value) return
  emit('open', current.value)
}
function point(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event
  return { x: touch.clientX ?? touch.pageX, y: touch.clientY ?? touch.pageY }
}
function startGesture(event, photoDirection) {
  if (busy.value || props.loading || !props.active || !current.value) return
  const start = point(event)
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return
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
  if (event.cancelable && event.preventDefault) event.preventDefault()
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
  if (busy.value || props.loading || !props.active || !current.value) return
  const profile = current.value
  const requestGeneration = generation
  const revision = props.revision
  busy.value = true
  actionError.value = ''
  dragging.value = false
  offset.value = { x: direction === 'like' ? 24 : -24, y: 0 }
  try {
    if (direction === 'like') {
      const saved = await props.likeProfile(profile)
      if (!saved?.isLiked) throw new Error('Like was not saved')
    }
    if (requestGeneration !== generation) return
    leaving.value = true
    offset.value = { x: direction === 'like' ? 900 : -900, y: 0 }
    leaveTimer = setTimeout(async () => {
      if (requestGeneration !== generation) return
      emit('dismiss', { profileId: profile.profileId, direction, revision })
      await nextTick()
      leaving.value = false
      offset.value = { x: 0, y: 0 }
      busy.value = false
    }, 260)
  } catch (_) {
    if (requestGeneration !== generation) return
    offset.value = { x: 0, y: 0 }
    busy.value = false
    actionError.value = t('deck.likeFailed')
  }
}
onHide(cancelGesture)
onBeforeUnmount(() => { generation++; clearTimeout(leaveTimer); cancelGesture(); emit('busy-change', false) })
</script>

<style scoped lang="scss">
.blessing-deck { width: 100%; max-width: 460px; margin: 0 auto; }
.deck-stage { position: relative; height: var(--blessing-card-height, 540px); min-height: 280px; margin: 8px 0 12px; }
.deck-card, .deck-back { position: absolute; inset: 0; border-radius: 28px; overflow: hidden; background: #242529; }
.deck-back-far { transform: translateY(12px) scale(.94); background: #d7d7da; }
.deck-back-near { transform: translateY(6px) scale(.975); opacity: .55; }
.deck-moving { position: absolute; inset: 0; z-index: 2; transform-origin: 50% 85%; transition: transform 280ms cubic-bezier(.2,.75,.25,1); }
.deck-card { z-index: 2; touch-action: pan-y; user-select: none; -webkit-user-select: none; box-shadow: 0 10px 28px rgba(18,19,22,.1); }
.deck-moving.is-dragging { transition: none; cursor: grabbing; }
.deck-moving.is-leaving { transition: transform 260ms ease-in; pointer-events: none; }
.deck-photo { width: 100%; height: 100%; position: absolute; inset: 0; pointer-events: none; }
.deck-photo-fallback, .deck-image-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #bfc0c3; font-size: 14px; background: #303136; }
.deck-image-loading { background: linear-gradient(110deg, #303136 25%, #45464a 45%, #303136 65%); background-size: 220% 100%; animation: shimmer 1.6s linear infinite; }
.deck-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.14), transparent 28%, transparent 38%, rgba(8,9,11,.5) 68%, rgba(8,9,11,.94)); }
.deck-photo-tap-zones { position: absolute; inset: 0; display: flex; z-index: 1; }
.deck-photo-zone { flex: 1; height: 100%; }
.deck-photo-dots { position: absolute; top: 12px; left: 18px; right: 18px; display: flex; gap: 4px; pointer-events: none; }
.deck-photo-dot { height: 3px; flex: 1; border-radius: 4px; background: rgba(255,255,255,.28); }
.deck-photo-dot.active { background: #fff; }
.deck-photo-controls { position: absolute; z-index: 2; top: 28px; right: 12px; display: flex; gap: 4px; }
.photo-control { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border-radius: 50%; background: rgba(20,20,22,.25); }
.photo-control::after, .deck-detail::after, .deck-action::after, .deck-reload::after { border: none; }
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
.deck-action-caption { max-width: 125px; font-size: 11px; line-height: 1.7; text-align: center; color: rgba(255,255,255,.75); }
.deck-empty { min-height: var(--blessing-card-height, 480px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; box-sizing: border-box; border-radius: 28px; background: #f0f1f3; color: #66686d; }
.deck-empty-title { font-size: 18px; font-weight: 600; color: #292a2e; text-align: center; }
.deck-empty-hint { font-size: 13px; line-height: 1.7; text-align: center; }
.deck-reload { margin: 8px 0 0; min-height: 44px; padding: 0 24px; background: #25262a; border-radius: 24px; color: #fff; font-size: 14px; line-height: 44px; }
.deck-error, .deck-more-error { padding: 10px 12px; font-size: 13px; line-height: 1.6; text-align: center; color: #b93128; }
.deck-more-error { color: #686b72; }
.deck-spinner { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #d6d7da; border-top-color: #35363a; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { to { background-position: -220% 0; } }
@media (max-height: 720px) { .deck-caption { bottom: 96px; } .deck-bio { display: none; } .deck-actions { bottom: 16px; } .deck-action { width: 54px; height: 54px; flex-basis: 54px; } .deck-name { font-size: 25px; } }
@media (prefers-reduced-motion: reduce) { .deck-moving, .deck-action { transition-duration: .01ms; } .deck-spinner, .deck-image-loading { animation: none; } }
</style>
