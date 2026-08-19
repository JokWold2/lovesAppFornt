<template>
  <view class="profile-container" v-if="profile">
    <view class="status-header">
      <view v-for="item in statusList" :key="item.label" class="status-item">
        <text class="label">{{ item.label }}</text>
        <text class="value">{{ item.value || '—' }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">照片展示</view>
      <ProfilePhotoGallery
        :photos="photoList"
        :enable-like="enableLike"
        :liked="liked"
        :like-count="likeCount"
        @toggle-like="emit('toggle-like')"
        @photo-error="onPhotoError"
      />
    </view>

    <view class="section">
      <view class="section-title">自我介绍</view>
      <view class="intro-box"><text class="intro-text">{{ profile.Selfintroduction || profile.bio || '暫無自我介绍' }}</text></view>
    </view>

    <ProfileTableSection title="个人资料" :rows="personalInfo" />
    <ProfileTableSection title="最高学历" :rows="educationInfo" />
    <ProfileTableSection title="就業" :rows="jobInfo" />
    <ProfileTableSection title="協助者的資料" :rows="assistantInfo" />

    <view class="section">
      <view class="section-title">生活與信仰</view>
      <view class="table">
        <view class="tr"><view class="th flex-1">愛好/興趣</view><view class="th flex-1">我的信仰生活</view><view class="th flex-1">我希望配偶的信仰生活</view></view>
        <view class="tr"><view class="td flex-1 center">{{ hobbyText }}</view><view class="td flex-1 center">{{ profile.faith_life || '—' }}</view><view class="td flex-1 center">{{ spouseFaithText }}</view></view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">對對象的希望</view>
      <view class="table">
        <view class="tr"><view class="th flex-1">分析工具</view><view class="th flex-1">我的類型</view><view class="th flex-1">推薦類型</view></view>
        <view v-for="item in analysisInfo" :key="item.tool" class="tr"><view class="td flex-1 center">{{ item.tool }}</view><view class="td flex-1 center">{{ item.myType || '—' }}</view><view class="td flex-1 center">{{ item.recommend }}</view></view>
      </view>
    </view>

    <view class="section"><view class="section-title">父母資料</view><view class="empty-text">暫無父母資料</view></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import ProfilePhotoGallery from './ProfilePhotoGallery.vue'
import ProfileTableSection from './ProfileTableSection.vue'

const props = defineProps({
  profile: { type: Object, required: true },
  enableLike: { type: Boolean, default: false },
  liked: { type: Boolean, default: false },
  likeCount: { type: Number, default: 0 }
})
const emit = defineEmits(['toggle-like'])
const failedPhotos = ref([])

const photoList = computed(() => normalizePhotos(props.profile.photos).filter(url => !failedPhotos.value.includes(url)))
const statusList = computed(() => [
  { label: '健康', value: props.profile.health }, { label: '世代', value: props.profile.generation },
  { label: '祝福', value: props.profile.blessing_type }, { label: '性別', value: props.profile.gender },
  { label: '區域', value: props.profile.region }, { label: '國家', value: props.profile.country }
])
const birthDateText = computed(() => {
  const p = props.profile
  if (!p.birth_year) return ''
  const age = new Date().getFullYear() - Number(p.birth_year)
  return `${p.birth_year}年 ${p.birth_month || '?'}月${p.birth_day || '?'}日 (${age})`
})
const bloodText = computed(() => [props.profile.blood_type, props.profile.blood_rh].filter(Boolean).join(' '))
const personalInfo = computed(() => {
  const p = props.profile
  return [
    { label: '姓名（母語）', value: [p.native_last_name, p.native_first_name].filter(Boolean).join(' ') },
    { label: '姓名（英文）', value: [p.en_last_name, p.en_first_name].filter(Boolean).join(' ') },
    { label: '出生日期', value: birthDateText.value }, { label: '身高(cm)', value: p.height ? `${p.height}cm` : '' },
    { label: '體重', value: p.weight ? `${p.weight}kg` : '' }, { label: '血型', value: bloodText.value },
    { label: '國籍', value: p.nationality }, { label: '資格', value: [p.qualification1, p.qualification2].filter(Boolean).join(' / ') },
    { label: '首選國家', value: [p.preferred_country1, p.preferred_country2].filter(Boolean).join(' / ') },
    { label: '外語能力 #1', value: [p.lang1_name, p.lang1_level].filter(Boolean).join('/') },
    { label: '外語能力 #2', value: [p.lang2_name, p.lang2_level].filter(Boolean).join('/') }
  ]
})
const educationInfo = computed(() => [{ label: '學位', value: [props.profile.degree_level, props.profile.degree_status].filter(Boolean).join(' / ') }, { label: '學校名稱', value: props.profile.school_name }, { label: '主要', value: props.profile.major }])
const jobInfo = computed(() => [{ label: '工作', value: props.profile.occupation }, { label: '公司名稱', value: props.profile.company_name }])
const assistantInfo = computed(() => {
  const email = props.profile.helper_email || ''
  const masked = email ? email.replace(/^([^@]{1,3})([^@]*)@/, (_, head, tail) => `${head}${'*'.repeat(Math.max(tail.length, 1))}@`) : ''
  return [{ label: '姓名', value: props.profile.helper_name }, { label: '手機', value: props.profile.helper_mobile }, { label: '電子郵件', value: masked }]
})
const hobbyText = computed(() => [props.profile.hobby1, props.profile.hobby2].filter(Boolean).join(' / ') || '—')
const spouseFaithText = computed(() => {
  const value = props.profile.spouse_faith_life
  if (Array.isArray(value)) return value.join(' / ') || '—'
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.join(' / ') : value } catch (_) { return value || '—' } }
  return '—'
})
const analysisInfo = computed(() => [
  { tool: '雙手交握', myType: props.profile.tool_hands, recommend: '—' }, { tool: '陰/陽', myType: props.profile.tool_yinyang, recommend: '—' },
  { tool: '五要素', myType: props.profile.tool_five_elements, recommend: '—' }, { tool: '九型人格', myType: props.profile.tool_enneagram, recommend: '—' },
  { tool: 'MBTI', myType: props.profile.tool_mbti, recommend: '—' }
])

function normalizePhotos(value) {
  if (Array.isArray(value)) return value.filter(url => typeof url === 'string' && url)
  if (typeof value !== 'string') return []
  try { return normalizePhotos(JSON.parse(value)) } catch (_) { return [] }
}
function onPhotoError(index) {
  const url = photoList.value[index]
  if (url && !failedPhotos.value.includes(url)) failedPhotos.value.push(url)
}
</script>

<style scoped lang="scss">
$primary-color: #fff6df;
$border-color: #e0e0e0;
.profile-container { padding: 20rpx; background: #fff6df; min-height: 100vh; }
.status-header, .section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, .05); }
.status-header { display: flex; flex-wrap: wrap; border-top: 6rpx solid $primary-color; }
.status-item { width: 33.33%; display: flex; flex-direction: column; align-items: center; margin-bottom: 16rpx; }
.label { font-size: 24rpx; color: #666; margin-bottom: 8rpx; }.value { font-size: 26rpx; color: #333; font-weight: bold; }
.section { padding: 24rpx; }.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 16rpx; border-left: 8rpx solid $primary-color; }
.intro-box { background: #fff6df; padding: 20rpx; border-radius: 8rpx; }.intro-text { font-size: 28rpx; color: #333; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.table { width: 100%; border-top: 1px solid $border-color; border-left: 1px solid $border-color; border-radius: 4rpx; overflow: hidden; }.tr { display: flex; width: 100%; }
.th, .td { padding: 16rpx 20rpx; font-size: 28rpx; border-right: 1px solid $border-color; border-bottom: 1px solid $border-color; word-break: break-all; }.th { background: rgba(255, 246, 223, .1); color: #333; font-weight: bold; width: 35%; flex-shrink: 0; }.td { color: #333; width: 65%; background: #fff; }.flex-1 { flex: 1; width: auto; }.center { text-align: center; justify-content: center; }.empty-text { color: #999; font-size: 26rpx; padding: 20rpx 0; text-align: center; }
</style>
