<template>
  <view class="guide" :style="pageStyle">
    <view class="guide-nav" :style="navStyle">
      <view class="nav-row" :style="{ paddingTop: geometry.contentTop + 'px', paddingRight: geometry.contentRight + 'px' }">
        <GlassCircleButton :label="c.back" @tap="back"><view class="back-chevron" /></GlassCircleButton>
        <text class="nav-title">{{ c.title }}</text>
      </view>
    </view>
    <view class="body" :style="{ paddingTop: navHeight + 'px' }">
      <view class="brand-row"><text class="brand">BLESS</text><text v-if="lesson">{{ current + 1 }} / {{ lesson.slides.length }}</text></view>
      <text v-if="lesson && lesson.fallback" class="fallback">{{ ec.fallback }}{{ contentLanguageNames[lesson.locale] }}</text>
      <view v-if="loading" class="state">{{ c.loading }}</view>
      <view v-else-if="failed" class="state"><text>{{ c.error }}</text><button @click="load">{{ c.retry }}</button></view>
      <swiper v-else-if="lesson" class="slides" :current="current" :circular="false" :autoplay="false" :duration="reducedMotion ? 0 : 260" @change="onSlideChange">
        <swiper-item v-for="(slide, index) in lesson.slides" :key="slide.id">
          <scroll-view scroll-y class="slide-scroll" @scroll="onSlideScroll($event, index)">
            <view class="slide-content">
              <view class="illustration" :class="{ 'form-illustration': !slide.image && ['compose','photos','publish','profile-overview','profile-groups','profile-save'].includes(slide.scene) }"><image v-if="slide.image" class="custom-art" :src="slide.image" mode="aspectFit"/><TutorialArtwork v-else :scene="slide.scene" :topic="lesson.id" /></view>
              <text class="step-title">{{ slide.title }}</text>
              <text class="step-body">{{ slide.body }}</text>
            </view>
          </scroll-view>
        </swiper-item>
      </swiper>
      <view v-if="lesson && !loading && !failed" class="footer">
        <view class="dots"><button v-for="(slide, index) in lesson.slides" :key="slide.id" :aria-label="c.page + ' ' + (index + 1)" :aria-pressed="current === index" @click="selectSlide(index)"><view :class="{ active: current === index }" /></button></view>
        <view class="action-space"><button v-if="current === lesson.slides.length - 1" class="primary" :disabled="navigating" hover-class="pressed" @click="finish">{{ lesson.actionLabel }}</button></view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { onLoad, onResize, onShow } from '@dcloudio/uni-app'
import { currentLocale } from '@/utils/localeRuntime.js'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import { getTutorial, tutorialMessages, queueTutorialHomeTarget } from '@/utils/tutorials.js'
import TutorialArtwork from '@/components/tutorial/TutorialArtwork.vue'
import { editorialMessages, contentLanguageNames } from '@/utils/editorial.js'
import GlassCircleButton from '@/components/chat/GlassCircleButton.vue'

let platform = ''
// #ifdef MP-WEIXIN
platform = 'mp-weixin'
// #endif
const geometry = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, platform))
const viewportHeight = ref(0)
function updateGeometry() {
  geometry.value = readChatHeaderGeometry(uni, { clearCapsule: false }, platform)
  try { const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync(); viewportHeight.value = info.windowHeight || 0 } catch (_) {}
}
updateGeometry()
onResize(updateGeometry)
onShow(updateGeometry)
const navHeight = computed(() => geometry.value.contentTop + 52)
const pageStyle = computed(() => viewportHeight.value ? { height: viewportHeight.value + 'px' } : {})
const scrollTop = ref(0)
const slideScrollPositions = {}
const navStyle = computed(() => {
  const amount = Math.min(1, scrollTop.value / 36)
  return { backgroundColor: `rgba(247,246,242,${amount * .94})`, backdropFilter: `blur(${amount * 12}px)`, WebkitBackdropFilter: `blur(${amount * 12}px)` }
})
const reducedMotion = ref(false)
// #ifdef H5
reducedMotion.value = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// #endif
const ec = computed(() => editorialMessages[currentLocale.value] || editorialMessages.en)
const c = computed(() => tutorialMessages[currentLocale.value] || tutorialMessages.en)
const lessonId = ref(''), lesson = ref(null), loading = ref(true), failed = ref(false), current = ref(0), navigating = ref(false)
let revision = 0
async function load() {
  if (!lessonId.value) return
  const request = ++revision
  loading.value = true; failed.value = false
  try {
    const data = await getTutorial(lessonId.value, currentLocale.value)
    if (!Array.isArray(data?.slides) || !data.slides.length) throw new Error('Empty guide')
    if (request === revision) { lesson.value = data; current.value = Math.min(current.value, data.slides.length - 1); scrollTop.value = 0 }
  } catch (_) { if (request === revision) failed.value = true }
  finally { if (request === revision) loading.value = false }
}
onLoad(query => { lessonId.value = typeof query.id === 'string' && query.id ? query.id : 'blessing'; load() })
watch(currentLocale, load)
onBeforeUnmount(() => { revision++ })
function onSlideChange(event) { selectSlide(event.detail.current) }
function selectSlide(index) { current.value = index; scrollTop.value = slideScrollPositions[index] || 0 }
function onSlideScroll(event, index) {
  slideScrollPositions[index] = Math.max(0, event.detail.scrollTop || 0)
  if (index === current.value) scrollTop.value = slideScrollPositions[index]
}
function back() {
  uni.navigateBack({ fail: () => { queueTutorialHomeTarget('tutorial'); uni.switchTab({ url: '/pages/index/index360' }) } })
}
function finish() {
  if (navigating.value || !lesson.value) return
  const destination = lesson.value.destination
  const homeTargets = ['blessing', 'antique', 'second_hand']
  const options = {
    complete: () => { navigating.value = false },
    fail: () => { queueTutorialHomeTarget(null); uni.showToast({ title: c.value.unavailable, icon: 'none' }) }
  }
  navigating.value = true
  if (homeTargets.includes(destination)) {
    queueTutorialHomeTarget(destination)
    uni.switchTab({ ...options, url: '/pages/index/index360' })
  } else if (destination === 'moments') {
    uni.navigateTo({ ...options, url: '/pages/my/myLifeShowEdit/myLifeShowEdit' })
  } else if (destination === 'profile') {
    uni.navigateTo({ ...options, url: '/pages/tutorial/profileEditor' })
  } else if (destination === 'likes') {
    uni.switchTab({ ...options, url: '/pages/likes/likes' })
  } else { navigating.value = false; uni.showToast({ title: c.value.unavailable, icon: 'none' }) }
}
</script>
<style scoped>
.guide{height:100vh;height:100dvh;background:#f7f6f2;color:#302e29;overflow:hidden;box-sizing:border-box}.guide button::after{border:0}.guide-nav{position:fixed;top:0;left:0;right:0;z-index:10;transition:background-color 160ms ease,backdrop-filter 160ms ease}.nav-row{display:flex;align-items:center;height:52px;padding-left:20px;box-sizing:content-box;max-width:540px;margin:auto;gap:8px}.back{width:44px;height:44px;padding:0;margin:0;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent}.nav-title{font-size:16px;line-height:1.3;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.body{box-sizing:border-box;height:100%;max-width:540px;margin:0 auto;display:flex;flex-direction:column}.brand-row{display:flex;justify-content:space-between;align-items:center;padding:18px 26px 8px;color:#979083;font-size:12px;flex-shrink:0}.brand{color:#997831;letter-spacing:4px;font-size:13px;font-weight:700}.slides{flex:1;min-height:0;width:100%}.slide-scroll{height:100%;width:100%}.slide-content{padding:0 24px 20px;box-sizing:border-box;min-height:100%;display:flex;flex-direction:column;align-items:center}.illustration{width:100%;height:42vh;min-height:230px;max-height:430px;flex-shrink:0}.step-title{display:block;font-size:26px;line-height:1.35;font-weight:700;text-align:center;margin:10px 0 16px;overflow-wrap:break-word;width:100%}.step-body{display:block;max-width:420px;width:100%;font-size:15px;line-height:1.8;color:#827b70;text-align:center;overflow-wrap:break-word}.footer{flex-shrink:0;padding:0 24px calc(12px + env(safe-area-inset-bottom));background:#f7f6f2}.dots{display:flex;justify-content:center;gap:0}.dots button{width:38px;height:36px;background:transparent;border:0;margin:0;padding:0;display:flex;align-items:center;justify-content:center}.dots view{height:7px;width:7px;border-radius:8px;background:#d8d5ce}.dots .active{width:23px;background:#c2a052}.action-space{min-height:52px}.primary{width:100%;min-height:50px;margin:0;padding:12px 20px;line-height:1.5;font-size:16px;font-weight:600;background:#c2a052;color:#fff;border-radius:18px;white-space:normal;overflow-wrap:break-word;transition:transform 140ms ease}.primary[disabled]{opacity:.6}.pressed{transform:scale(.985)}.state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#928878;line-height:1.7;text-align:center}.state button{background:#f1e4bd;color:#775e25;font-size:14px;border-radius:22px;margin-top:20px}@media(max-height:700px){.illustration{height:35vh;min-height:190px}.brand-row{padding-top:8px}.step-title{font-size:23px;margin-bottom:12px}.step-body{font-size:14px;line-height:1.7}}@media(prefers-reduced-motion:reduce){.guide-nav,.primary{transition:none}}
.back-chevron{width:12px;height:12px;border-left:2px solid #292825;border-bottom:2px solid #292825;transform:translateX(3px) rotate(45deg);}
.illustration.form-illustration{height:450px;min-height:450px;max-height:none;}
.custom-art{width:100%;height:100%;display:block}.fallback{display:block;padding:4px 26px 8px;color:#918674;font-size:11px;line-height:1.5}
</style>
