<template>
  <view class="user-activity">
    <view class="moments-tabs" role="tablist">
      <button class="moments-tab" :class="{ active: section === 'profile' }" role="tab" :aria-selected="section === 'profile'" @tap="select('profile')">{{ t('momentsHub.profileTab') }}</button>
      <button class="moments-tab" :class="{ active: section === 'moments' }" role="tab" :aria-selected="section === 'moments'" @tap="select('moments')">{{ momentsTitle }}</button>
    </view>
    <view v-if="section === 'moments'" role="tabpanel">
      <view v-if="loading" class="hub-state">{{ t('momentsHub.loading') }}</view>
      <view v-else-if="failed" class="hub-state"><text>{{ t('momentsHub.loadError') }}</text><button @tap="load">{{ t('momentsHub.retry') }}</button></view>
      <view v-else-if="!moments.length" class="hub-state">{{ t('life.empty') }}</view>
      <view v-for="item in moments" :key="item.id" class="post-card" @tap="open(item)">
        <view class="post-header">
          <image v-if="profile.avatar_url" class="post-avatar" :src="url(profile.avatar_url)" mode="aspectFill" />
          <view v-else class="post-avatar avatar-fallback"><uni-icons type="person" size="22" color="#8f9383" /></view>
          <view class="post-author"><text class="post-name">{{ name }}</text><text class="post-date">{{ dateLabel(item.created_at) }}</text></view>
          <text v-if="item.is_pinned" class="post-pin">{{ t('life.pinned') }}</text>
        </view>
        <text v-if="item.content" class="post-text">{{ item.content }}</text>
        <video v-if="item.video_url" class="post-video" :src="url(item.video_url)" :poster="url(item.video_cover)" controls @tap.stop />
        <view v-if="item.images.length" class="post-images" :class="{ single: item.images.length === 1 }">
          <image v-for="(photo, index) in item.images.slice(0, 9)" :key="index" :src="url(photo)" mode="aspectFill" @tap.stop="preview(item.images, index)" />
        </view>
        <view v-if="item.location_name" class="post-location"><uni-icons type="location" size="14" color="#8f9587" /><text>{{ item.location_name }}</text></view>
        <view class="post-actions">
          <button :disabled="item.pending" :aria-label="t('momentsHub.likeAction')" :aria-pressed="!!item.is_liked" @tap.stop="like(item)"><uni-icons :type="item.is_liked ? 'heart-filled' : 'heart'" size="23" :color="item.is_liked ? 'var(--bless-primary, #C2A052)' : '#7e8677'" /><text>{{ item.like_count || 0 }}</text></button>
          <button :aria-label="t('life.saySomething')" @tap.stop="open(item)"><uni-icons type="chatbubble" size="22" color="#7e8677" /><text>{{ item.comment_count || 0 }}</text></button>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getMomentsApi, toggleLikeMomentApi } from '@/api/index.js'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'
const props = defineProps({ profile: { type: Object, required: true }, name: String })
const emit = defineEmits(['change'])
const section = ref('profile'), moments = ref([]), loading = ref(false), failed = ref(false), loaded = ref(false)
let generation = 0
const momentsTitle = computed(() => {
  const gender = String(props.profile.gender || '').trim().toLowerCase()
  const key = ['女', 'female', 'f', '女性', '여성', '여'].includes(gender) ? 'female' : ['男', 'male', 'm', '男性', '남성', '남'].includes(gender) ? 'male' : 'neutral'
  return t(`profileActivity.${key}`)
})
watch(() => props.profile.user_id, () => {
  generation++; moments.value = []; loaded.value = false; failed.value = false; loading.value = false
  section.value = 'profile'; emit('change', 'profile')
})
onBeforeUnmount(() => { generation++ })
function select(value) { section.value = value; emit('change', value); if (value === 'moments' && !loaded.value && !loading.value) load() }
function images(value) { try { const list = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(list) ? list.filter(item => typeof item === 'string' && item) : [] } catch { return [] } }
function url(value) { return !value ? '' : /^https?:\/\//i.test(value) ? value : `${config.baseURL}${value.startsWith('/') ? '' : '/'}${value}` }
function dateLabel(value) { return String(value || '').replace('T', ' ').slice(0, 16) }
async function load() {
  const request = ++generation, userId = Number(props.profile.user_id)
  failed.value = false; loading.value = true
  try {
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Missing profile user ID')
    const data = await getMomentsApi(userId)
    if (request !== generation) return
    moments.value = (data.moments || []).map(item => ({ ...item, images: images(item.images), pending: false }))
    loaded.value = true
  } catch { if (request === generation) failed.value = true }
  finally { if (request === generation) loading.value = false }
}
function open(item) { uni.navigateTo({ url: `/pages/moments/momentDetail?id=${item.id}` }) }
function preview(list, index) { const urls = list.map(url); uni.previewImage({ urls, current: urls[index] }) }
async function like(item) {
  if (item.pending) return
  const request = generation
  item.pending = true
  try { const data = await toggleLikeMomentApi(item.id); if (request === generation) { item.is_liked = data.isLiked; item.like_count = data.likeCount } }
  catch { if (request === generation) uni.showToast({ title: t('life.actionFailed'), icon: 'none' }) }
  finally { item.pending = false }
}
</script>
<style scoped>
button{margin:0;border:0;background:transparent;line-height:1.5;}button::after{border:0;}
.moments-tabs{display:flex;gap:22px;align-items:stretch;border-bottom:1px solid #e4e5dc;margin:0 4px 14px;}
.moments-tab{position:relative;display:flex;justify-content:center;align-items:center;min-width:0;min-height:51px;font-size:16px;color:#969b8d;padding:10px 1px;border-radius:0;text-align:left;overflow-wrap:anywhere;}
.moments-tab.active{font-weight:650;color:#292e25;}.moments-tab.active::before{content:'';position:absolute;bottom:-1px;left:0;right:0;height:3px;background:var(--bless-primary, #C2A052);border-radius:4px;}
.hub-state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:36px 18px;color:#8c9182;background:#fff;border-radius:23px;margin-bottom:14px;font-size:14px;}.hub-state button{padding:10px 22px;background:var(--bless-primary, #C2A052);border-radius:22px;color:#292e25;}
.post-card{padding:18px;background:#fff;border:1px solid #edeee5;border-radius:23px;margin-bottom:14px;}.post-header{display:flex;align-items:center;gap:10px;margin-bottom:13px;}.post-avatar{width:38px;height:38px;border-radius:50%;flex:none;}.avatar-fallback{display:flex;align-items:center;justify-content:center;background:#e9e9de;}.post-author{flex:1;min-width:0;}.post-name{display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere;}.post-date,.post-pin{display:block;font-size:11px;color:#969d8b;margin-top:3px;}.post-text{display:block;font-size:14px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;margin-bottom:12px;}.post-images{display:flex;flex-wrap:wrap;gap:6px;}.post-images image{width:calc((100% - 12px)/3);height:100px;border-radius:10px;}.post-images.single image{width:100%;height:230px;border-radius:15px;}.post-video{width:100%;height:230px;border-radius:15px;margin-bottom:10px;}.post-location{display:flex;gap:5px;align-items:center;color:#8f9587;font-size:11px;margin-top:10px;}.post-actions{display:flex;gap:20px;margin-top:10px;}.post-actions button{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 4px;color:#7e8677;font-size:12px;}
@media(max-width:350px){.moments-tabs{gap:16px;}.moments-tab{font-size:14px;}.post-card{padding:14px;}.post-images.single image{height:185px;}}
</style>
