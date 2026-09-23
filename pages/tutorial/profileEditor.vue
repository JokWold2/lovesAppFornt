<template>
  <view class="editor-entry" :style="{ paddingTop: top + 'px' }">
    <view class="entry-header"><GlassCircleButton :label="c.back" @tap="requestBack"><uni-icons type="left" size="23" color="#302e29" /></GlassCircleButton><text>{{ t('profileEditor.common.title') }}</text></view>
    <view v-if="loading" class="entry-state">{{ t('home.loading') }}</view>
    <view v-else-if="failed" class="entry-state"><text>{{ c.unavailable }}</text><button @click="load">{{ c.retry }}</button></view>
    <ProfileEditor v-if="profile && !loading && !failed" ref="editor" :profile="profile" :initial-group="initialGroup" @closed="back" @saved="saved" />
  </view>
</template>
<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import ProfileEditor from './components/ProfileEditor.vue'
import GlassCircleButton from '@/components/chat/GlassCircleButton.vue'
import { getProfileApi } from '@/api/index.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { tutorialMessages } from '@/utils/tutorials.js'
import { readPageHeaderInset } from '@/utils/pageHeaderLayout.js'
const top = readPageHeaderInset(uni)
const c = computed(() => tutorialMessages[currentLocale.value] || tutorialMessages.en)
const editor = ref(null), profile = ref(null), loading = ref(true), failed = ref(false), initialGroup = ref('')
let revision = 0, leaving = false
async function load() {
  const request = ++revision
  loading.value = true; failed.value = false
  try {
    const data = await getProfileApi()
    if (!data?.profile) throw new Error('Profile unavailable')
    if (request === revision) profile.value = data.profile
  } catch (_) { if (request === revision) failed.value = true }
  finally { if (request === revision) loading.value = false }
}
function back() {
  if (leaving) return
  leaving = true
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/my/myLifeShow/myLifeShow' }) })
}
function requestBack() {
  if (leaving) return
  if (editor.value) editor.value.back()
  else back()
}
function saved() { uni.showToast({ title: t('profileEditor.common.saved'), icon: 'none' }) }
onLoad(options => {
  initialGroup.value = typeof options?.group === 'string' ? options.group : ''
  load()
})
onBackPress(() => {
  if (leaving || !editor.value) return false
  editor.value.back()
  return true
})
onBeforeUnmount(() => { revision++ })
</script>
<style scoped>
.editor-entry{min-height:100vh;box-sizing:border-box;background:#f5f4f1;color:#302e29;padding-left:20px;padding-right:20px}.entry-header{display:flex;gap:12px;align-items:center;min-height:60px;font-size:18px;font-weight:600}.entry-state{display:flex;align-items:center;flex-direction:column;justify-content:center;gap:20px;padding:60px 20px;font-size:14px;color:#928878;line-height:1.7;text-align:center}.entry-state button{background:#f1e4bd;color:#775e25;border-radius:24px;font-size:14px;padding:8px 24px}.entry-state button::after{border:0}
</style>
