<template>
  <view class="library">
    <view class="intro"><view class="intro-copy"><text class="eyebrow">BLESS</text><text class="hero-title">{{ c.hero }}</text><text class="subtitle">{{ c.intro }}</text></view><view class="intro-art"><image class="connection-art" src="/static/brand/tutorial-connection.png" mode="aspectFit"/><text class="handwritten" :class="{cjk:currentLocale === 'zh-Hans' || currentLocale === 'zh-Hant'}">{{ slogan }}</text></view></view>
    <scroll-view scroll-x class="categories" :show-scrollbar="false"><view class="category-row"><button v-for="key in categories" :key="key" :class="{ selected: category === key }" :aria-pressed="category === key" @click="category = key">{{ c[key] }}</button></view></scroll-view>
    <view v-if="loading" class="state">{{ c.loading }}</view>
    <view v-else-if="failed" class="state"><text>{{ c.error }}</text><button @click="load">{{ c.retry }}</button></view>
    <view v-else-if="!visible.length" class="state">{{ c.empty }}</view>
    <view v-else class="lessons">
      <button v-for="item in visible" :key="item.id" class="lesson" hover-class="lesson-pressed" @click="open(item.id)">
        <view class="cover"><image v-if="item.cover" class="cover-image" :src="item.cover" mode="aspectFill"/><TutorialArtwork v-else :scene="item.scene" compact /></view>
        <view class="lesson-copy"><text class="lesson-tag">{{ c[item.category] }} · {{ item.steps }} {{ c.steps }}</text><text class="lesson-title">{{ item.title }}</text><text class="lesson-summary">{{ item.summary }}</text><text v-if="item.fallback" class="lesson-tag">{{ ec.fallback }}{{ contentLanguageNames[item.locale] }}</text></view>
        <uni-icons type="right" size="16" color="#aaa393" />
      </button>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { currentLocale } from '@/utils/localeRuntime.js'
import { getTutorials, tutorialMessages } from '@/utils/tutorials.js'
import { editorialMessages, contentLanguageNames } from '@/utils/editorial.js'
import { loadBlessHandwriting } from '@/utils/brandFont.js'
import TutorialArtwork from '@/components/tutorial/TutorialArtwork.vue'
loadBlessHandwriting()
const slogans={ 'zh-Hans':'美好的缘分，\n从这里开始', 'zh-Hant':'美好的緣分，\n從這裡開始', en:'Good connections\nstart here', ru:'Тёплые встречи\nначинаются здесь', ja:'素敵なご縁は\nここから', ko:'좋은 인연은\n여기서 시작해요' }
const slogan=computed(()=>slogans[currentLocale.value]||slogans.en)
const ec = computed(() => editorialMessages[currentLocale.value] || editorialMessages.en)
const c = computed(() => tutorialMessages[currentLocale.value] || tutorialMessages.en)
const categories = ['all', 'start', 'social', 'trade']
const category = ref('all'), items = ref([]), loading = ref(false), failed = ref(false)
const visible = computed(() => items.value.filter(item => category.value === 'all' || item.category === category.value))
let revision = 0
async function load() {
  const request = ++revision
  loading.value = true; failed.value = false
  try { const data = await getTutorials(currentLocale.value); if (request === revision) items.value = data.items || [] }
  catch (_) { if (request === revision) failed.value = true }
  finally { if (request === revision) loading.value = false }
}
function open(id) { uni.navigateTo({ url: `/pages/tutorial/detail?id=${encodeURIComponent(id)}`, fail: () => uni.showToast({ title: c.value.unavailable, icon: 'none' }) }) }
watch(currentLocale, load, { immediate: true })
onBeforeUnmount(() => { revision++ })
defineExpose({ refresh: load })
</script>
<style scoped>
/* #ifdef H5 */
@font-face{font-family:BlessHandwriting;src:url('/static/fonts/bless-handwriting.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
/* #endif */
.library{max-width:560px;margin:0 auto;padding:16px 18px 28px;color:#302e29}.intro{position:relative;overflow:hidden;display:flex;align-items:center;min-height:176px;padding:22px 18px 22px 22px;background:linear-gradient(115deg,#fff 20%,#faf5e9);border:1px solid #fff;border-radius:25px;gap:6px}.intro-copy{flex:1;min-width:0}.eyebrow{display:block;font-size:10px;letter-spacing:3px;color:#a88b50;margin-bottom:12px}.hero-title{display:block;font-size:22px;font-weight:650;line-height:1.5;overflow-wrap:break-word}.subtitle{display:block;font-size:12px;color:#a09683;line-height:1.7;margin-top:12px}.intro-art{width:43%;max-width:190px;flex-shrink:0;display:flex;flex-direction:column;align-items:center}.connection-art{width:100%;height:105px}.handwritten{display:block;white-space:pre-line;text-align:center;font-size:13px;font-style:italic;line-height:1.65;color:#a98b4d;max-width:100%;overflow-wrap:break-word;transform:rotate(-5deg);margin-top:-4px}.handwritten.cjk{font-family:BlessHandwriting,KaiTi,serif;font-size:19px;font-style:normal;line-height:1.3;letter-spacing:1px}.categories{margin:22px 0 16px;width:100%;white-space:nowrap}.category-row{display:flex;gap:8px}.category-row button{flex-shrink:0;margin:0;padding:9px 15px;border:0;border-radius:22px;background:#fff;color:#8e8678;font-size:12px;line-height:1.5;white-space:nowrap}.category-row .selected{background:#efe3c2;color:#806534}.category-row button::after,.lesson::after,.state button::after{border:0}.lessons{display:flex;flex-direction:column;gap:12px}.lesson{display:flex;align-items:center;gap:14px;width:100%;margin:0;padding:16px 14px;background:#fff;border:0;border-radius:22px;text-align:left;line-height:1.5;transition:transform 140ms ease}.lesson-pressed{transform:scale(.985)}.cover{width:82px;height:98px;flex-shrink:0;border-radius:17px;background:#f8f5ed;overflow:hidden}.cover-image{width:100%;height:100%}.lesson-copy{flex:1;min-width:0}.lesson-tag{display:block;font-size:10px;color:#a48a54}.lesson-title{display:block;font-size:16px;font-weight:650;color:#302e29;margin:6px 0;overflow-wrap:break-word}.lesson-summary{display:block;font-size:12px;color:#9b9385;line-height:1.7;overflow-wrap:break-word}.state{padding:54px 16px;text-align:center;color:#928878;line-height:1.6}.state text{display:block}.state button{margin:18px auto 0;background:#efe3c2;color:#806534;border-radius:24px;font-size:14px;max-width:200px}.lesson uni-icons{flex-shrink:0}@media(max-width:360px){.library{padding-left:12px;padding-right:12px}.intro{padding:18px 12px 18px 18px}.hero-title{font-size:19px}.subtitle{font-size:11px}.handwritten.cjk{font-size:17px}.handwritten{font-size:11px}.cover{width:64px;height:86px}.lesson{gap:10px}}@media(prefers-reduced-motion:reduce){.lesson{transition:none}}
</style>
