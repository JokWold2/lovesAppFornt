<template>
  <view class="profile-container" :class="{ 'profile-container--cards': presentation === 'cards' }" v-if="profile">
    <template v-if="presentation === 'cards'">
      <view v-if="showPhotos" class="profile-card-photos">
        <ProfilePhotoGallery
          :photos="photoList"
          :presentation="presentation"
          :show-like-control="presentation !== 'cards'"
          :enable-like="enableLike"
          :liked="liked"
          :like-count="likeCount"
          @toggle-like="emit('toggle-like')"
          @photo-error="onPhotoError"
        />
      </view>

      <slot name="after-photos" />
      <view v-show="showDetails">
      <view class="profile-card">
        <view class="profile-card-heading">
          <text class="profile-card-icon profile-card-quote" aria-hidden="true">“</text>
          <text class="profile-card-title">{{ t('profile.introduction') }}</text>
          <button v-if="editable" class="profile-card-edit" :aria-label="`${t('profileEditor.common.edit')} ${t('profile.introduction')}`" hover-class="profile-card-edit--pressed" @tap.stop="emit('edit', 'introduction')">{{ t('profileEditor.common.edit') }}</button>
        </view>
        <text class="profile-card-intro">{{ profile.Selfintroduction || profile.bio || t('profile.noIntroduction') }}</text>
      </view>

      <ProfileTableSection :title="t('profile.basicInfo')" :rows="statusList" :presentation="presentation" icon="info" :editable="editable" @edit="emit('edit', 'basic')" />
      <ProfileTableSection :title="t('profile.personalInfo')" :rows="personalInfo" :presentation="presentation" icon="person" :editable="editable" @edit="emit('edit', 'personal')" />
      <ProfileTableSection :title="t('profile.education')" :rows="educationInfo" :presentation="presentation" icon="flag" :editable="editable" @edit="emit('edit', 'education')" />
      <ProfileTableSection :title="t('profile.employment')" :rows="jobInfo" :presentation="presentation" icon="wallet" :editable="editable" @edit="emit('edit', 'employment')" />
      <ProfileTableSection :title="t('profile.assistantInfo')" :rows="assistantInfo" :presentation="presentation" icon="contact" :editable="editable" @edit="emit('edit', 'helper')" />
      <ProfileTableSection
        :title="t('profile.lifestyle')"
        :rows="[
          { label: t('profile.hobby'), value: hobbyText },
          { label: t('profile.myFaith'), value: profile.faith_life || '—' },
          { label: t('profile.spouseFaith'), value: spouseFaithText }
        ]"
        :presentation="presentation"
        icon="star"
        :editable="editable"
        @edit="emit('edit', 'lifestyle')"
      />

      <view class="profile-card">
        <view class="profile-card-heading">
          <uni-icons class="profile-card-icon" type="heart" :size="19" color="#79756f" />
          <text class="profile-card-title">{{ t('profile.partnerPreference') }}</text>
          <button v-if="editable" class="profile-card-edit" :aria-label="`${t('profileEditor.common.edit')} ${t('profile.partnerPreference')}`" hover-class="profile-card-edit--pressed" @tap.stop="emit('edit', 'personality')">{{ t('profileEditor.common.edit') }}</button>
        </view>
        <view v-for="item in analysisInfo" :key="item.tool" class="profile-card-analysis">
          <view class="profile-card-field profile-card-analysis-tool">
            <text class="profile-card-label">{{ t('profile.analysisTools') }}</text>
            <text class="profile-card-value profile-card-tool-name">{{ item.tool }}</text>
          </view>
          <view class="profile-card-analysis-values">
            <view class="profile-card-field profile-card-analysis-value">
              <text class="profile-card-label">{{ t('profile.myType') }}</text>
              <text class="profile-card-value">{{ item.myType || '—' }}</text>
            </view>
            <view class="profile-card-field profile-card-analysis-value">
              <text class="profile-card-label">{{ t('profile.recommendedType') }}</text>
              <text class="profile-card-value">{{ item.recommend }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="profile-card">
        <view class="profile-card-heading">
          <uni-icons class="profile-card-icon" type="home" :size="19" color="#79756f" />
          <text class="profile-card-title">{{ t('profile.parents') }}</text>
        </view>
        <text class="profile-card-empty">{{ t('profile.noParents') }}</text>
      </view>
      </view>
    </template>

    <template v-else>
    <view class="status-header">
      <view v-for="item in statusList" :key="item.label" class="status-item">
        <text class="label">{{ item.label }}</text>
        <text class="value">{{ item.value || '—' }}</text>
      </view>
    </view>

    <view v-if="showPhotos" class="section">
      <view class="section-title">{{ t('profile.photos') }}</view>
      <ProfilePhotoGallery
        :photos="photoList"
        :presentation="presentation"
        :show-like-control="presentation !== 'cards'"
        :enable-like="enableLike"
        :liked="liked"
        :like-count="likeCount"
        @toggle-like="emit('toggle-like')"
        @photo-error="onPhotoError"
      />
    </view>

    <view class="section">
      <view class="section-title">{{ t('profile.introduction') }}</view>
      <view class="intro-box"><text class="intro-text">{{ profile.Selfintroduction || profile.bio || t('profile.noIntroduction') }}</text></view>
    </view>

    <ProfileTableSection :title="t('profile.personalInfo')" :rows="personalInfo" />
    <ProfileTableSection :title="t('profile.education')" :rows="educationInfo" />
    <ProfileTableSection :title="t('profile.employment')" :rows="jobInfo" />
    <ProfileTableSection :title="t('profile.assistantInfo')" :rows="assistantInfo" />

    <view class="section">
      <view class="section-title">{{ t('profile.lifestyle') }}</view>
      <view class="table">
        <view class="tr"><view class="th flex-1">{{ t('profile.hobby') }}</view><view class="th flex-1">{{ t('profile.myFaith') }}</view><view class="th flex-1">{{ t('profile.spouseFaith') }}</view></view>
        <view class="tr"><view class="td flex-1 center">{{ hobbyText }}</view><view class="td flex-1 center">{{ profile.faith_life || '—' }}</view><view class="td flex-1 center">{{ spouseFaithText }}</view></view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">{{ t('profile.partnerPreference') }}</view>
      <view class="table">
        <view class="tr"><view class="th flex-1">{{ t('profile.analysisTools') }}</view><view class="th flex-1">{{ t('profile.myType') }}</view><view class="th flex-1">{{ t('profile.recommendedType') }}</view></view>
        <view v-for="item in analysisInfo" :key="item.tool" class="tr"><view class="td flex-1 center">{{ item.tool }}</view><view class="td flex-1 center">{{ item.myType || '—' }}</view><view class="td flex-1 center">{{ item.recommend }}</view></view>
      </view>
    </view>

    <view class="section"><view class="section-title">{{ t('profile.parents') }}</view><view class="empty-text">{{ t('profile.noParents') }}</view></view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import ProfilePhotoGallery from './ProfilePhotoGallery.vue'
import ProfileTableSection from './ProfileTableSection.vue'
import { t } from '@/utils/localeRuntime.js'
import { buildProfileAnalysisRows } from '@/utils/profileAnalysisPresentation.js'

const props = defineProps({
  profile: { type: Object, required: true },
  presentation: { type: String, default: 'classic' },
  showPhotos: { type: Boolean, default: true },
  showDetails: { type: Boolean, default: true },
  editable: { type: Boolean, default: false },
  enableLike: { type: Boolean, default: false },
  liked: { type: Boolean, default: false },
  likeCount: { type: Number, default: 0 }
})
const emit = defineEmits(['toggle-like', 'edit'])
const failedPhotos = ref([])

const photoList = computed(() => normalizePhotos(props.profile.photos).filter(url => !failedPhotos.value.includes(url)))
const statusList = computed(() => [
  { label: t('profile.health'), value: props.profile.health }, { label: t('profile.generation'), value: props.profile.generation },
  { label: t('profile.blessing'), value: props.profile.blessing_type }, { label: t('profile.gender'), value: props.profile.gender },
  { label: t('profile.region'), value: props.profile.region }, { label: t('profile.country'), value: props.profile.country }
])
const birthDateText = computed(() => {
  const p = props.profile
  if (!p.birth_year) return ''
  const age = new Date().getFullYear() - Number(p.birth_year)
  if (props.presentation === 'cards') {
    const month = p.birth_month ? String(p.birth_month).padStart(2, '0') : '?'
    const day = p.birth_day ? String(p.birth_day).padStart(2, '0') : '?'
    return `${p.birth_year}-${month}-${day} (${age})`
  }
  return `${p.birth_year}年 ${p.birth_month || '?'}月${p.birth_day || '?'}日 (${age})`
})
const bloodText = computed(() => [props.profile.blood_type, props.profile.blood_rh].filter(Boolean).join(' '))
const personalInfo = computed(() => {
  const p = props.profile
  return [
    { label: t('profile.nativeName'), value: [p.native_last_name, p.native_first_name].filter(Boolean).join(' ') },
    { label: t('profile.englishName'), value: [p.en_last_name, p.en_first_name].filter(Boolean).join(' ') },
    { label: t('profile.birthDate'), value: birthDateText.value }, { label: t('profile.height'), value: p.height ? `${p.height}cm` : '' },
    { label: t('profile.weight'), value: p.weight ? `${p.weight}kg` : '' }, { label: t('profile.bloodType'), value: bloodText.value },
    { label: t('profile.nationality'), value: p.nationality }, { label: t('profile.qualification'), value: [p.qualification1, p.qualification2].filter(Boolean).join(' / ') },
    { label: t('profile.preferredCountry'), value: [p.preferred_country1, p.preferred_country2].filter(Boolean).join(' / ') },
    { label: t('profile.language1'), value: [p.lang1_name, p.lang1_level].filter(Boolean).join('/') },
    { label: t('profile.language2'), value: [p.lang2_name, p.lang2_level].filter(Boolean).join('/') }
  ]
})
const educationInfo = computed(() => [{ label: t('profile.degree'), value: [props.profile.degree_level, props.profile.degree_status].filter(Boolean).join(' / ') }, { label: t('profile.school'), value: props.profile.school_name }, { label: t('profile.major'), value: props.profile.major }])
const jobInfo = computed(() => [{ label: t('profile.occupation'), value: props.profile.occupation }, { label: t('profile.company'), value: props.profile.company_name }])
const assistantInfo = computed(() => {
  const email = props.profile.helper_email || ''
  const masked = email ? email.replace(/^([^@]{1,3})([^@]*)@/, (_, head, tail) => `${head}${'*'.repeat(Math.max(tail.length, 1))}@`) : ''
  return [{ label: t('profile.name'), value: props.profile.helper_name }, { label: t('profile.phone'), value: props.profile.helper_mobile }, { label: t('profile.email'), value: masked }]
})
const hobbyText = computed(() => [props.profile.hobby1, props.profile.hobby2].filter(Boolean).join(' / ') || '—')
const spouseFaithText = computed(() => {
  const value = props.profile.spouse_faith_life
  if (Array.isArray(value)) return value.join(' / ') || '—'
  if (typeof value === 'string') return value || '—'
  return '—'
})
const analysisInfo = computed(() => buildProfileAnalysisRows(props.profile, t))

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

.profile-container--cards { min-height: 0; max-width: 680px; margin: 0 auto; padding: 16px; background: #f5f4f1; box-sizing: border-box; }
.profile-card-photos { min-width: 0; margin-bottom: 16px; }
.profile-card { min-width: 0; padding: 22px 20px; margin-bottom: 16px; border-radius: 24px; background: #fff; box-sizing: border-box; }
.profile-card:last-child { margin-bottom: 0; }
.profile-card-heading { display: flex; align-items: flex-start; min-width: 0; margin-bottom: 18px; }
.profile-card-icon { flex: 0 0 20px; margin-top: 3px; margin-right: 10px; }
.profile-card-quote { display: block; height: 26px; margin-top: 0; color: #79756f; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; font-weight: 700; line-height: 1; }
.profile-card-title { flex: 1; min-width: 0; color: #25231f; font-size: 18px; font-weight: 600; line-height: 1.45; }
.profile-card-intro { display: block; color: #3c3934; font-size: 15px; line-height: 1.75; white-space: pre-wrap; }
.profile-card-analysis { min-width: 0; padding: 17px 0; border-top: 1px solid #eeece7; }
.profile-card-analysis:last-child { padding-bottom: 0; }
.profile-card-field { display: flex; flex-direction: column; min-width: 0; }
.profile-card-label { display: block; color: #777269; font-size: 12px; line-height: 1.5; }
.profile-card-value { display: block; margin-top: 6px; color: #292621; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
.profile-card-tool-name { font-weight: 600; }
.profile-card-analysis-values { display: flex; min-width: 0; margin-top: 14px; }
.profile-card-analysis-value { flex: 1; width: 0; }
.profile-card-analysis-value + .profile-card-analysis-value { margin-left: 20px; }
.profile-card-empty { display: block; color: #777269; font-size: 14px; line-height: 1.6; }
.profile-card-title, .profile-card-intro, .profile-card-label, .profile-card-value, .profile-card-empty { word-break: break-word; overflow-wrap: anywhere; }
.profile-card-edit { flex: 0 0 auto; min-width: 44px; min-height: 44px; max-width: 50%; margin: -8px -8px -8px 8px; padding: 10px 8px; border: 0; border-radius: 16px; background: transparent; color: #777269; font-size: 13px; font-weight: 500; line-height: 24px; white-space: normal; word-break: break-word; overflow-wrap: anywhere; transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease; }
.profile-card-edit::after { border: 0; }
.profile-card-edit--pressed, .profile-card-edit:active { transform: scale(.97); background: #f5f4f1; }
.profile-card-edit:focus-visible { outline: 2px solid #ba9400; outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .profile-card-edit { transition: none; }.profile-card-edit--pressed, .profile-card-edit:active { transform: none; } }
</style>
