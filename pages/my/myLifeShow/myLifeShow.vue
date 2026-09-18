<template>
  <view class="moments-page app-h5-min-screen liquid-tab-page">
    <view class="moments-page-header" :style="headerStyle">
      <view class="moments-title-row"><text class="moments-title">{{ t('navigation.moments') }}</text></view>
      <view class="moments-identity">
        <button class="avatar-button identity-photo-stack" :aria-label="t('life.changeAvatar')" @click="changeAvatar">
          <image v-if="identityBackPhoto && !backPhotoFailed" class="identity-photo-back" :src="getFullImageUrl(identityBackPhoto)" mode="aspectFill" @error="backPhotoFailed = true" />
          <image v-if="userInfo.avatarUrl && !avatarFailed" class="identity-avatar identity-photo-front" :src="getFullImageUrl(userInfo.avatarUrl)" mode="aspectFill" @error="avatarFailed = true" />
          <view v-else class="identity-avatar identity-photo-front avatar-fallback"><uni-icons type="person" size="36" color="#8f9383" /></view>
        </button>
        <view class="identity-copy">
          <text class="identity-name">{{ userInfo.username || t('life.user') }}</text>
          <button v-if="!editingBio" class="identity-bio" :disabled="bioSaving" @click="editSignature">{{ userInfo.bio || t('momentsHub.noBio') }}</button>
          <input v-else v-model="bioDraft" class="bio-input" :focus="true" maxlength="50" confirm-type="done" :placeholder="t('life.bioPlaceholder')" @confirm="saveBio" @focus="navigationInputActive = true" @blur="navigationInputActive = false; saveBio()" />
          <button class="profile-edit-entry" :disabled="profileLoading || profileError || bioSaving" @click="openProfileEditor()"><text>{{ t('profileEditor.common.title') }}</text><uni-icons type="right" size="14" color="#827b6f" /></button>
        </view>
        <button v-if="profileData && !profileError" class="profile-completion-badge" :aria-label="t('profileEditor.common.completion', { percent: profileCompletion.percent })" @click="openProfileEditor(profileCompletion.missingGroups[0])"><view class="completion-ring"><view class="completion-half completion-half-right"><view :style="{ transform: `rotate(${Math.min(180, profileCompletion.percent * 3.6)}deg)` }" /></view><view class="completion-half completion-half-left"><view :style="{ transform: `rotate(${Math.max(0, profileCompletion.percent * 3.6 - 180)}deg)` }" /></view><text>{{ profileCompletion.percent }}%</text></view><text class="completion-badge-label">{{ t('profileEditor.common.completionLabel') }}</text></button>
      </view>
      <button v-if="profileData && !profileError && profileCompletion.percent < 100" class="profile-completion-prompt" @click="openProfileEditor(profileCompletion.missingGroups[0])"><view class="completion-alert">!</view><text>{{ t('profileEditor.common.missingCount', { count: profileCompletion.missingGroups.length }) }}</text><uni-icons type="right" size="14" color="#a39888" /></button>
      <view class="moments-tabs" role="tablist">
        <button class="moments-tab" :class="{ active: activeTab === 'profile' }" role="tab" :aria-selected="activeTab === 'profile'" @click="switchSection('profile')">{{ t('momentsHub.profileTab') }}</button>
        <button class="moments-tab" :class="{ active: activeTab === 'moments' }" role="tab" :aria-selected="activeTab === 'moments'" @click="switchSection('moments')"><text>{{ t('momentsHub.momentsTab') }}</text><text v-if="moments.length" class="tab-count">{{ moments.length }}</text></button>
        <button class="publish-button" :aria-label="t('momentsHub.publish')" @click="goToEdit"><uni-icons type="plusempty" size="24" color="#303329" /></button>
      </view>
    </view>
    <view class="header-spacer" :style="spacerStyle" aria-hidden="true" />

    <view v-show="activeTab === 'moments'" class="moments-pane" role="tabpanel">
      <button class="moments-composer" @click="goToEdit">
        <view class="composer-symbol"><uni-icons type="compose" size="24" color="#a08632" /></view>
        <view class="composer-copy"><text class="composer-title">{{ t('momentsHub.composeTitle') }}</text><text class="composer-hint">{{ t('momentsHub.composeHint') }}</text></view>
        <uni-icons class="composer-photo" type="image" size="21" color="#8b907e" />
      </button>
      <view class="timeline-heading"><text>{{ t('momentsHub.recent') }}</text></view>
      <view v-if="loading && !moments.length" class="hub-state"><view class="state-icon"><uni-icons type="more-filled" size="28" color="#a09159" /></view><text>{{ t('momentsHub.loading') }}</text></view>
      <view v-else-if="momentsError" class="hub-state error-state"><view class="state-icon"><uni-icons type="reload" size="26" color="#9f8738" /></view><text>{{ t('momentsHub.momentsError') }}</text><button class="state-button moments-retry" @click="loadMoments">{{ t('momentsHub.retry') }}</button></view>
      <view v-else-if="!moments.length" class="hub-state empty-state"><view class="state-icon"><uni-icons type="compose" size="28" color="#a09159" /></view><text class="state-title">{{ t('momentsHub.emptyTitle') }}</text><text class="state-hint">{{ t('momentsHub.emptyHint') }}</text><button class="state-button" @click="goToEdit">{{ t('momentsHub.publish') }}</button></view>
      <view v-for="item in moments" :key="item.id" class="post-card" @longpress="showItemActions(item)">
        <view class="post-header">
          <image v-if="userInfo.avatarUrl && !avatarFailed" class="post-avatar" :src="getFullImageUrl(userInfo.avatarUrl)" mode="aspectFill" />
          <view v-else class="post-avatar avatar-fallback"><uni-icons type="person" size="20" color="#8f9383" /></view>
          <view class="post-author"><text class="post-name">{{ userInfo.username || t('life.user') }}</text><text class="post-date">{{ getDateLabel(item.created_at) }} · {{ formatTime(item.created_at) }}</text></view>
          <text v-if="item.is_pinned" class="post-pin">{{ t('life.pinned') }}</text>
          <button class="post-more-button icon-button" :aria-label="t('momentsHub.more')" @click.stop="showItemActions(item)"><uni-icons type="more-filled" size="23" color="#8c9282" /></button>
        </view>
        <text v-if="item.content" class="post-text">{{ item.content }}</text>
        <view v-if="item.video_url" class="video-box" @click.stop="playVideo(item)"><image class="video-cover" :src="getVideoCover(item)" mode="aspectFill" /><view class="video-play"><uni-icons type="videocam-filled" size="32" color="#fff" /></view></view>
        <view v-if="item.images.length === 1" class="single-image" @click.stop="previewImage(item.images, 0)"><image class="single-img" :src="getFullImageUrl(item.images[0])" mode="aspectFill" /></view>
        <view v-else-if="item.images.length > 1" class="post-image-grid"><image v-for="(img, imageIndex) in item.images.slice(0, 9)" :key="`${img}-${imageIndex}`" class="post-grid-image" :src="getFullImageUrl(img)" mode="aspectFill" @click.stop="previewImage(item.images, imageIndex)" /></view>
        <view v-if="item.location_name" class="post-location"><uni-icons type="location" size="14" color="#8f9587" /><text>{{ item.location_name }}</text></view>
        <view class="post-actions">
          <button class="post-like-button" :class="{ 'is-liked': item.is_liked }" :disabled="item.likePending" :aria-label="t('momentsHub.likeAction')" :aria-pressed="!!item.is_liked" @click.stop="toggleLike(item)"><uni-icons :type="item.is_liked ? 'heart-filled' : 'heart'" size="23" :color="item.is_liked ? '#c49b22' : '#7e8677'" /><text>{{ item.like_count || 0 }}</text></button>
          <button class="post-comment-button" :aria-label="t('life.saySomething')" @click.stop="focusComment(item)"><uni-icons type="chatbubble" size="22" color="#7e8677" /><text>{{ item.comment_count || 0 }}</text></button>
        </view>
        <button v-if="item.like_count || item.comment_count" class="interactions-toggle" :aria-expanded="!!item.showInteractions" @click.stop="toggleInteractions(item)"><text class="interaction-summary">{{ interactionSummary(item) }}</text><text class="interaction-label">{{ item.showInteractions ? t('momentsHub.collapseInteractions') : t('momentsHub.interactions') }}</text><uni-icons type="right" size="13" color="#969d8b" /></button>
        <view v-if="item.showInteractions" class="post-interactions">
          <view v-if="item.likedBy.length" class="liked-by-row"><uni-icons type="heart-filled" size="15" color="#b79a45" /><text>{{ item.likedBy.map(user => user.name || user.email).join('，') }}</text></view>
          <view v-for="comment in item.comments" :key="comment.id" class="comment-item" @click.stop="startReply(item, comment)"><text class="comment-author">{{ comment.email }}</text><text v-if="comment.reply_to_email"> {{ t('life.reply') }} {{ comment.reply_to_email }}</text><text>：{{ comment.content }}</text></view>
        </view>
        <view v-if="item.showCommentInput" class="comment-input-row">
          <view v-if="item.replyTarget" class="reply-target-tag"><text>{{ t('life.reply') }} {{ item.replyTarget.email }}</text><button class="reply-cancel" :aria-label="t('common.cancel')" @click.stop="cancelReply(item)"><uni-icons type="closeempty" size="17" color="#888d81" /></button></view>
          <view class="comment-input-inner"><input v-model="item.commentDraft" class="comment-input" :focus="item.showCommentInput" confirm-type="send" :placeholder="item.replyTarget ? `${t('life.reply')} ${item.replyTarget.email}` : t('life.saySomething')" @confirm="submitComment(item)" @focus="navigationInputActive = true" @blur="navigationInputActive = false" /><button class="comment-send-button" :disabled="item.commentPending" @click.stop="submitComment(item)">{{ t('life.send') }}</button></view>
        </view>
      </view>
    </view>

    <view v-show="activeTab === 'profile'" class="profile-pane" role="tabpanel">
      <button v-if="!receivedLikesError" class="profile-likes-entry" @click="goToLikes"><uni-icons type="heart" size="24" color="#ad8b27" /><text class="profile-likes-label">{{ t('momentsHub.profileLikes', { count: receivedLikeTotal }) }}</text><uni-icons type="right" size="17" color="#96917b" /></button>
      <view v-else class="likes-error"><text>{{ t('momentsHub.likesError') }}</text><button @click="loadReceivedLikes(profileData?.id)">{{ t('momentsHub.retry') }}</button></view>
      <view v-if="profileLoading && !profileData" class="hub-state"><text>{{ t('momentsHub.loading') }}</text></view>
      <view v-else-if="profileError" class="hub-state error-state"><text>{{ t('momentsHub.profileError') }}</text><button class="state-button profile-retry" @click="loadUserProfile">{{ t('momentsHub.retry') }}</button></view>
      <view v-if="profileData && !profileError" class="photo-summary-section">
        <text class="photo-summary-title">{{ t('photoManager.title') }}</text>
        <view class="photo-summary-card">
          <scroll-view class="photo-summary-strip" scroll-x>
            <button v-for="(photo, index) in summaryPhotoSlots" :key="index" class="profile-photo-button" :aria-label="photo ? t('photoManager.photoLabel', { index: index + 1 }) : t('photoManager.emptySlot', { index: index + 1 })" @click="openPhotoManager(photo ? index : -1)"><image v-if="photo" :src="getFullImageUrl(photo)" mode="aspectFill" /><uni-icons v-else type="plusempty" size="25" color="#35332f" /></button>
          </scroll-view>
          <view class="photo-summary-footer"><view class="photo-summary-copy"><text>{{ t('photoManager.hint') }}</text><text class="photo-summary-count">{{ t('photoManager.count', { count: profilePhotos.length, max: 9 }) }}</text></view><button class="photos-manage-button" @click="openPhotoManager()">{{ t('photoManager.edit') }}</button></view>
        </view>
      </view>
      <view class="profile-sections"><ProfileDetailSections v-if="profileData" :profile="profileData" presentation="cards" :show-photos="false" :enable-like="false" :liked="false" :like-count="0" editable @edit="openProfileEditor" /></view>
      <view v-if="userInfo.email" class="account-section"><view class="section-heading"><uni-icons type="person" size="19" color="#868d7a" /><text class="section-title">{{ t('momentsHub.account') }}</text></view><text class="account-label">{{ t('momentsHub.email') }}</text><text class="account-email">{{ userInfo.email }}</text></view>
    </view>

    <LiquidGlassTabBar active-route="pages/my/myLifeShow/myLifeShow" :input-active="navigationInputActive" :hidden="photoManagerOpen || showFacebookPhotoPicker || profileEditorOpen" />
    <ProfileEditor v-if="profileEditorOpen" ref="profileEditor" :profile="profileData || {}" :initial-group="profileEditorGroup" @closed="profileEditorOpen = false" @saved="profileSaved" />
    <ProfilePhotoManager v-if="photoManagerOpen" ref="photoManager" :photos="profilePhotos" :busy="photoBusy || facebookImporting" :blocking-overlay="showFacebookPhotoPicker" :initial-index="photoInitialIndex" @closed="photoManagerOpen = false" @overlay-back="closeFacebookPhotoPicker" @upload="chooseProfilePhotos" @remove="deletePhoto" @facebook="openFacebookPhotoImporter" />
    <view v-if="showFacebookPhotoPicker" class="facebook-photo-mask" @click="closeFacebookPhotoPicker">
      <view class="facebook-photo-sheet" @click.stop>
        <view class="facebook-photo-header"><view class="facebook-header-copy"><text class="facebook-photo-title">{{ t('momentsHub.facebookTitle') }}</text><text class="facebook-photo-hint">{{ t('momentsHub.facebookCapacity', { count: facebookPhotoCapacity }) }}</text></view><button class="facebook-photo-close" :aria-label="t('momentsHub.close')" @click="closeFacebookPhotoPicker"><uni-icons type="closeempty" size="22" color="#818875" /></button></view>
        <scroll-view class="facebook-photo-grid" scroll-y><view v-for="photo in facebookPhotos" :key="photo.id" class="facebook-photo-item" :class="{ selected: facebookSelectedPhotoIds.includes(photo.id) }" @click="toggleFacebookPhoto(photo.id)"><image :src="photo.picture" mode="aspectFill" /><view class="facebook-photo-check">{{ facebookSelectedPhotoIds.includes(photo.id) ? '✓' : '' }}</view></view></scroll-view>
        <view class="facebook-photo-actions"><text>{{ t('momentsHub.selectedPhotos', { count: facebookSelectedPhotoIds.length, total: facebookPhotoCapacity }) }}</text><button :disabled="!facebookSelectedPhotoIds.length || facebookImporting" @click="importSelectedFacebookPhotos">{{ t('momentsHub.importAction') }}</button></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onShow, onPageScroll, onPullDownRefresh } from '@dcloudio/uni-app'
// #ifdef APP-PLUS
import { onBackPress } from '@dcloudio/uni-app'
// #endif
import {
  getMomentsApi, togglePinMomentApi, deleteMomentApi,
  toggleLikeMomentApi, uploadAvatarApi, uploadProfilePhotosApi, deleteProfilePhotoApi, importFacebookProfilePhotosApi,
  getProfileApi, getCommentsApi, addCommentApi, updateBioApi,
  getLikesApi, getProfileLikesApi
} from '@/api/index.js'
import { config } from '@/utils/config.js'
import { useFixedPageHeader } from '@/utils/useFixedPageHeader.js'
import { openIncomingLikes } from '@/utils/likesTabIntent.js'
import ProfileDetailSections from '@/components/profile/ProfileDetailSections.vue'
import ProfilePhotoManager from '@/components/profile/ProfilePhotoManager.vue'
import ProfileEditor from '@/components/profile/ProfileEditor.vue'
import { getProfileCompletion, hydrateProfileEditor } from '@/utils/profileEditorModel.js'
import LiquidGlassTabBar from '@/components/navigation/LiquidGlassTabBar.vue'
import { t, updateTabBarLocale } from '@/utils/localeRuntime.js'
import { requestFacebookPhotoAccess } from '@/utils/facebookAuth.js'
import { normalizeFacebookPhotos, toggleFacebookPhotoSelection } from '@/utils/facebookPhotoSelection.js'

// 状态
const loading = ref(false)
const momentsError = ref(false)
const profileLoading = ref(false)
const profileError = ref(false)
const receivedLikesError = ref(false)
const avatarFailed = ref(false)
const backPhotoFailed = ref(false)
const facebookImporting = ref(false)
const activeTab = ref('profile')
const editingBio = ref(false)
const bioDraft = ref('')
const sectionScroll = { moments: 0, profile: 0 }
let restoringScroll = false
const bioSaving = ref(false)
const navigationInputActive = ref(false)
const moments = ref([])
const profileData = ref(null)
const profileEditor = ref(null), profileEditorOpen = ref(false), profileEditorGroup = ref('')
let profileRevision = 0
const profileCompletion = computed(() => getProfileCompletion(profileData.value || {}))
const profilePhotos = ref([])
const identityBackPhoto = computed(() => profilePhotos.value.find(photo => getFullImageUrl(photo) !== getFullImageUrl(userInfo.value.avatarUrl)) || '')
const photoManager = ref(null)
const photoManagerOpen = ref(false)
const photoInitialIndex = ref(-1)
const photoBusy = ref(false)
let photoRevision = 0
const summaryPhotoSlots = computed(() => Array.from({ length: Math.min(9, Math.max(6, profilePhotos.value.length + 1)) }, (_, index) => profilePhotos.value[index] || ''))
const receivedLikeTotal = ref(0)
const showFacebookPhotoPicker = ref(false)
const facebookPhotos = ref([])
const facebookSelectedPhotoIds = ref([])
const facebookAccessToken = ref('')
const facebookPhotoCapacity = computed(() => Math.max(0, 9 - profilePhotos.value.length))
const userInfo = ref({
  username: '',
  email: '',
  avatarUrl: '',
  coverUrl: '',
  bio: ''
})

const headerCopy = computed(() => [t('navigation.moments'), t('momentsHub.momentsTab'), t('momentsHub.profileTab'), userInfo.value.username, userInfo.value.bio, editingBio.value, moments.value.length, profileCompletion.value.percent, !!profileData.value, profileError.value].join('|'))
const { headerStyle, spacerStyle } = useFixedPageHeader('.moments-page-header', 279, headerCopy)

function openProfileEditor(group = '') {
  if (profileEditorOpen.value || profileLoading.value || profileError.value || bioSaving.value) return
  editingBio.value = false; navigationInputActive.value = false
  profileEditorGroup.value = typeof group === 'string' ? group : ''
  profileEditorOpen.value = true
}
function profileSaved({ patch, draft }) {
  profileRevision++
  const previous = profileData.value || {}, baseline = hydrateProfileEditor(previous), next = { ...previous }
  for (const key of Object.keys(draft)) if (key !== 'birth_date' && draft[key] !== baseline[key]) next[key] = draft[key] === '' ? null : draft[key]
  for (const [camel, snake] of [['birthYear','birth_year'], ['birthMonth','birth_month'], ['birthDay','birth_day']]) if (Object.prototype.hasOwnProperty.call(patch, camel)) next[snake] = patch[camel]
  profileData.value = next
  userInfo.value.username = next.en_first_name || [next.native_last_name, next.native_first_name].filter(Boolean).join(' ') || userInfo.value.username
  userInfo.value.bio = next.bio || ''
  const cached = uni.getStorageSync('USER_INFO') || {}
  uni.setStorageSync('USER_INFO', { ...cached, name: userInfo.value.username, bio: userInfo.value.bio })
  uni.showToast({ title: t('profileEditor.common.saved'), icon: 'none' })
}

onPageScroll(event => {
  if (!restoringScroll) sectionScroll[activeTab.value] = Number(event.scrollTop) || 0
})
async function switchSection(section) {
  if (section === activeTab.value || !['moments', 'profile'].includes(section)) return
  restoringScroll = true
  activeTab.value = section
  navigationInputActive.value = false
  await nextTick()
  uni.pageScrollTo({
    scrollTop: sectionScroll[section],
    duration: 0,
    complete: () => { restoringScroll = false }
  })
}
function goToLikes() { openIncomingLikes() }
function openPhotoManager(index = -1) {
  if (photoBusy.value || photoManagerOpen.value) return
  photoInitialIndex.value = typeof index === 'number' ? index : -1
  photoManagerOpen.value = true
}
// #ifdef APP-PLUS
onBackPress(() => {
  if (profileEditorOpen.value) { profileEditor.value?.back(); return true }
  if (showFacebookPhotoPicker.value) { if (!facebookImporting.value) closeFacebookPhotoPicker(); return true }
  if (!photoManagerOpen.value) return false
  photoManager.value?.back()
  return true
})
// #endif
function interactionSummary(item) {
  const comment = item.comments[0]
  if (comment) return (comment.email || t('life.friend')) + '：' + comment.content
  return item.likedBy.map(user => user.name || user.email).join('，')
}
function toggleInteractions(item) {
  item.showInteractions = !item.showInteractions
  if (item.showInteractions) { loadLikes(item); loadComments(item) }
}

// 获取完整的图片 URL
function getFullImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return config.baseURL + path
}

function normalizePhotoUrls(value) {
  if (Array.isArray(value)) return value.filter(url => typeof url === 'string' && url)
  if (typeof value !== 'string') return []
  try {
    return normalizePhotoUrls(JSON.parse(value))
  } catch (_) {
    return []
  }
}

// 获取视频封面（如果有的话）
function getVideoCover(item) {
  // 这里可以使用视频的第一帧作为封面，暂时返回占位图
  return item.video_cover ? getFullImageUrl(item.video_cover) : '/static/logo.png'
}

// 获取日期标签
function getDateLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return t('life.today')
  if (itemDate.getTime() === yesterday.getTime()) return t('life.yesterday')

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

// 从后端拉取最新头像/背景/签名，覆盖本地缓存（本地缓存只作为首屏兜底展示）
async function loadUserProfile() {
  if (profileLoading.value) return
  const requestedPhotoRevision = photoRevision
  const requestedProfileRevision = profileRevision
  profileLoading.value = true
  profileError.value = false
  try {
    const res = await getProfileApi()
    if (requestedProfileRevision !== profileRevision) return
    const profile = res.profile
    if (profile) {
      // A response started before a photo mutation must not restore the old album.
      if (requestedPhotoRevision !== photoRevision) profile.photos = [...profilePhotos.value]
      profileData.value = profile
      profilePhotos.value = normalizePhotoUrls(profile.photos)
      userInfo.value.avatarUrl = getFullImageUrl(profile.avatar_url) || userInfo.value.avatarUrl
      userInfo.value.coverUrl = getFullImageUrl(profile.cover_url) || userInfo.value.coverUrl
      userInfo.value.username = profile.en_first_name || [profile.native_last_name, profile.native_first_name].filter(Boolean).join(' ') || userInfo.value.username
      userInfo.value.email = profile.email || userInfo.value.email
      avatarFailed.value = false
      backPhotoFailed.value = false
      if (profile.bio !== undefined && profile.bio !== null) {
        userInfo.value.bio = profile.bio
      }

      // 同步更新本地缓存，保持和后端一致
      const cached = uni.getStorageSync('USER_INFO') || {}
      uni.setStorageSync('USER_INFO', {
        ...cached,
        name: profile.en_first_name || cached.name,
        avatar_url: profile.avatar_url,
        cover_url: profile.cover_url,
        photos: profilePhotos.value,
        bio: profile.bio
      })
      loadReceivedLikes(profile.id)
    }
  } catch (e) {
    profileError.value = true
    console.error('获取用户资料失败，暂用本地缓存', e)
  } finally { profileLoading.value = false }
}

async function loadReceivedLikes(profileId) {
  if (!profileId) return
  receivedLikesError.value = false
  try {
    const result = await getProfileLikesApi(profileId)
    receivedLikeTotal.value = Number(result.total ?? result.likes?.length ?? 0)
  } catch (error) {
    receivedLikesError.value = true
    console.error('获取收到的点赞失败', error)
  }
}

function editSignature() {
  if (bioSaving.value) return
  bioDraft.value = userInfo.value.bio
  editingBio.value = true
}

async function saveBio() {
  editingBio.value = false
  navigationInputActive.value = false
  if (bioSaving.value) return
  const text = (bioDraft.value || '').trim()
  if (text === userInfo.value.bio) return // 没改就不请求
  bioSaving.value = true
  try {
    await updateBioApi(text)
    profileRevision++
    if (profileData.value) profileData.value = { ...profileData.value, bio: text }
    userInfo.value.bio = text
    const cached = uni.getStorageSync('USER_INFO') || {}
    uni.setStorageSync('USER_INFO', { ...cached, bio: text })
  } catch (e) {
    console.error('签名保存失败', e)
    uni.showToast({ title: t('life.saveFailed'), icon: 'none' })
  } finally { bioSaving.value = false }
}
// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 加载动态列表
async function loadMoments() {
  if (loading.value) return
  loading.value = true
  momentsError.value = false
  try {
    const res = await getMomentsApi()
    const previous = new Map(moments.value.map(item => [item.id, item]))
    moments.value = (res.moments || []).map(moment => {
      const cached = previous.get(moment.id)
      return { ...moment, images: parseImages(moment.images),
        likedBy: moment.like_count > 0 ? cached?.likedBy || [] : [],
        comments: moment.comment_count > 0 ? cached?.comments || [] : [],
        showInteractions: cached?.showInteractions || false, showCommentInput: cached?.showCommentInput || false,
        replyTarget: cached?.replyTarget || null, commentDraft: cached?.commentDraft || '', likePending: false, commentPending: false }
    })
    loadMetaForMoments()
  } catch (error) {
    momentsError.value = true
    console.error('加载动态失败', error)
  } finally { loading.value = false }
}

// 有点赞/评论的动态，进页面就直接拉取详情（不用等用户点开）
function loadMetaForMoments() {
  moments.value.forEach(item => {
    if (item.like_count > 0) loadLikes(item)
    if (item.comment_count > 0) loadComments(item)
  })
}

async function loadLikes(item) {
  try {
    const res = await getLikesApi(item.id)
    item.likedBy = res.likes || []
  } catch (e) {
    console.error('获取点赞人失败', e)
  }
}

async function loadComments(item) {
  try {
    const res = await getCommentsApi(item.id)
    item.comments = res.comments || []
  } catch (e) {
    console.error('获取评论失败', e)
  }
}

// 解析 images 字段（可能是 JSON 字符串或数组）
function parseImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// 跳转到编辑页面
function goToEdit() {
  uni.navigateTo({
    url: '/pages/my/myLifeShowEdit/myLifeShowEdit'
  })
}

// 跳转到详情页


// 预览图片
function previewImage(images, index) {
  const urls = images.map(img => getFullImageUrl(img))
  uni.previewImage({
    urls,
    current: index
  })
}

// 播放视频
function playVideo(item) {
  if (item.video_url) {
    uni.navigateTo({
      url: `/pages/video/videoPlayer?url=${encodeURIComponent(item.video_url)}`
    })
  }
}

// 切换点赞
async function toggleLike(item) {
  if (item.likePending) return
  item.likePending = true

  // 先本地乐观更新，让用户点击有即时反馈
  const prevLiked = item.is_liked
  const prevCount = item.like_count || 0
  item.is_liked = !prevLiked
  item.like_count = prevCount + (item.is_liked ? 1 : -1)

  try {
    const res = await toggleLikeMomentApi(item.id)
    // 用后端返回的真实数据覆盖，避免并发点击导致数字不一致
    item.is_liked = res.isLiked
    item.like_count = res.likeCount
    loadLikes(item) // 点赞人名单也刷新一下
  } catch (e) {
    console.error('点赞失败', e)
    // 请求失败则回滚
    item.is_liked = prevLiked
    item.like_count = prevCount
    uni.showToast({ title: t('life.actionFailed'), icon: 'none' })
  } finally { item.likePending = false }
}

// 点💬图标：唤出输入框，普通评论（不回复任何人）
function focusComment(item) {
  item.showInteractions = true
  item.replyTarget = null
  item.showCommentInput = true
}

// 点某一条评论：回复这条评论的作者
function startReply(item, comment) {
  item.replyTarget = { userId: comment.user_id, email: comment.email }
  item.showCommentInput = true
}

// 取消回复，变回普通评论
function cancelReply(item) {
  item.replyTarget = null
}

async function submitComment(item) {
  if (item.commentPending) return
  const text = (item.commentDraft || '').trim()
  if (!text) return
  item.commentPending = true
  try {
    const res = await addCommentApi(item.id, text, item.replyTarget?.userId)
    item.comments.push(res.comment) // 后端已经把当前用户的 email 和回复对象一起返回了，直接用
    item.comment_count = (item.comment_count || 0) + 1
    item.commentDraft = ''
    item.replyTarget = null
    item.showCommentInput = false
    item.showInteractions = true
    navigationInputActive.value = false
    uni.hideKeyboard?.()
  } catch (e) {
    console.error('评论失败', e)
    uni.showToast({ title: t('life.commentFailed'), icon: 'none' })
  } finally { item.commentPending = false }
}

// 长按动态：置顶/取消置顶、删除
function showItemActions(item) {
  const pinLabel = item.is_pinned ? t('life.unpin') : t('life.pin')
  uni.showActionSheet({
    itemList: [pinLabel, t('life.delete')],
    success: async (res) => {
      if (res.tapIndex === 0) {
        try {
          const result = await togglePinMomentApi(item.id)
          item.is_pinned = result.isPinned
          // 置顶状态变了，重新排序列表
          moments.value.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
            return new Date(b.created_at) - new Date(a.created_at)
          })
        } catch (e) {
          console.error('置顶操作失败', e)
          uni.showToast({ title: t('life.actionFailed'), icon: 'none' })
        }
      } else if (res.tapIndex === 1) {
        uni.showModal({
          title: t('life.deleteTitle'),
          content: t('life.deleteContent'),
          cancelText: t('common.cancel'),
          confirmText: t('life.delete'),
          success: async (modalRes) => {
            if (modalRes.confirm) {
              try {
                await deleteMomentApi(item.id)
                moments.value = moments.value.filter(m => m.id !== item.id)
                uni.showToast({ title: t('life.deleted'), icon: 'success' })
              } catch (e) {
                console.error('删除失败', e)
                uni.showToast({ title: t('life.deleteFailed'), icon: 'none' })
              }
            }
          }
        })
      }
    }
  })
}

function applyProfilePhotos(result) {
  photoRevision += 1
  profilePhotos.value = normalizePhotoUrls(result.photos)
  if (profileData.value) profileData.value.photos = profilePhotos.value
  const cached = uni.getStorageSync('USER_INFO') || {}
  uni.setStorageSync('USER_INFO', { ...cached, photos: profilePhotos.value })
}

// Capture the original URL before opening the native picker; replacement preserves its slot.
function chooseProfilePhotos({ source, replaceIndex = -1 }) {
  if (photoBusy.value || facebookImporting.value) return
  const replacePhotoUrl = replaceIndex >= 0 ? profilePhotos.value[replaceIndex] : undefined
  if (replaceIndex >= 0 && !replacePhotoUrl) return
  const remaining = 9 - profilePhotos.value.length
  if (!replacePhotoUrl && remaining <= 0) {
    uni.showToast({ title: t('life.photoLimit'), icon: 'none' })
    return
  }
  photoBusy.value = true
  uni.chooseImage({
    count: replacePhotoUrl || source === 'camera' ? 1 : remaining,
    sourceType: [source === 'camera' ? 'camera' : 'album'],
    success: async (res) => {
      try {
        if (!res.tempFilePaths?.length) return
        uni.showLoading({ title: t('photoManager.saving'), mask: true })
        const paths = res.tempFilePaths.slice(0, replacePhotoUrl ? 1 : remaining)
        await uploadProfilePhotosApi(paths, { replacePhotoUrl, onUploaded: applyProfilePhotos })
      } catch (e) {
        console.error('资料照片上传失败', e)
        uni.showToast({ title: t(replacePhotoUrl ? 'photoManager.replaceFailed' : 'photoManager.uploadFailed'), icon: 'none' })
      } finally {
        photoBusy.value = false
        uni.hideLoading()
      }
    },
    fail: error => {
      photoBusy.value = false
      if (!/cancel/i.test(error?.errMsg || '')) uni.showToast({ title: t('photoManager.permissionHint'), icon: 'none' })
    }
  })
}

async function openFacebookPhotoImporter() {
  if (photoBusy.value || facebookImporting.value) return
  if (facebookPhotoCapacity.value <= 0) {
    uni.showToast({ title: t('life.photoLimit'), icon: 'none' })
    return
  }
  photoBusy.value = true
  try {
    uni.showLoading({ title: t('momentsHub.facebookLoading') })
    const result = await requestFacebookPhotoAccess()
    facebookAccessToken.value = result.accessToken
    facebookPhotos.value = normalizeFacebookPhotos(result.photos)
    facebookSelectedPhotoIds.value = []
    if (!facebookPhotos.value.length) {
      uni.showToast({ title: t('momentsHub.facebookEmpty'), icon: 'none' })
      return
    }
    showFacebookPhotoPicker.value = true
  } catch (error) {
    console.error('读取 Facebook 相册失败', error)
    uni.showToast({ title: error?.message || t('momentsHub.facebookFailed'), icon: 'none' })
  } finally {
    photoBusy.value = false
    uni.hideLoading()
  }
}

function closeFacebookPhotoPicker() {
  if (facebookImporting.value) return
  showFacebookPhotoPicker.value = false
  facebookPhotos.value = []
  facebookSelectedPhotoIds.value = []
  facebookAccessToken.value = ''
}

function toggleFacebookPhoto(photoId) {
  facebookSelectedPhotoIds.value = toggleFacebookPhotoSelection(
    facebookSelectedPhotoIds.value,
    photoId,
    facebookPhotoCapacity.value
  )
}

async function importSelectedFacebookPhotos() {
  if (facebookImporting.value || !facebookSelectedPhotoIds.value.length || !facebookAccessToken.value) return
  facebookImporting.value = true
  try {
    uni.showLoading({ title: t('momentsHub.importing') })
    const result = await importFacebookProfilePhotosApi(facebookAccessToken.value, facebookSelectedPhotoIds.value)
    applyProfilePhotos(result)
    facebookImporting.value = false
    closeFacebookPhotoPicker()
    uni.showToast({ title: t('momentsHub.importSuccess'), icon: 'success' })
  } catch (error) {
    console.error('导入 Facebook 照片失败', error)
    uni.showToast({ title: error?.message || t('momentsHub.importFailed'), icon: 'none' })
  } finally {
    facebookImporting.value = false
    uni.hideLoading()
  }
}

function deletePhoto(index) {
  const photo = profilePhotos.value[index]
  if (!photo || photoBusy.value || facebookImporting.value) return
  photoBusy.value = true
  uni.showModal({
    title: t('photoManager.removeTitle'),
    content: t('photoManager.removeContent'),
    cancelText: t('common.cancel'),
    confirmText: t('life.delete'),
    confirmColor: '#fe385c',
    success: async ({ confirm }) => {
      if (!confirm) { photoBusy.value = false; return }
      try {
        uni.showLoading({ title: t('life.deleting'), mask: true })
        const result = await deleteProfilePhotoApi(photo)
        applyProfilePhotos(result)
      } catch (e) {
        console.error('删除资料照片失败', e)
        uni.showToast({ title: t('photoManager.removeFailed'), icon: 'none' })
      } finally {
        photoBusy.value = false
        uni.hideLoading()
      }
    },
    fail: () => { photoBusy.value = false }
  })
}

// 修改头像
function changeAvatar() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album'],
    success: async (res) => {
      try {
        uni.showLoading({ title: t('life.uploading') })
        const result = await uploadAvatarApi(res.tempFilePaths[0])
        userInfo.value.avatarUrl = getFullImageUrl(result.url)
        avatarFailed.value = false
        const cached = uni.getStorageSync('USER_INFO') || {}
        uni.setStorageSync('USER_INFO', { ...cached, avatar_url: result.url })
      } catch (e) {
        console.error('头像上传失败', e)
        uni.showToast({ title: t('life.uploadFailed'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

// 获取用户信息
function getUserInfo() {
  try {
    const info = uni.getStorageSync('USER_INFO')
    if (info) {
      userInfo.value = {
        username: info.username || info.name || '',
        email: info.email || '',
        avatarUrl: info.avatar_url || '',
        coverUrl: info.cover_url || '',
        bio: info.bio || ''
      }
      profilePhotos.value = normalizePhotoUrls(info.photos)
    }
  } catch (e) {
    console.error('获取用户信息失败', e)
  }
}

onShow(() => {
  navigationInputActive.value = false
  updateTabBarLocale()
  // Returning from the system camera/album must not overwrite an upload in flight.
  if (photoManagerOpen.value || photoBusy.value || profileEditorOpen.value) return
  getUserInfo()     // 本地缓存先展示，避免首屏空白
  loadUserProfile() // 再用后端最新数据覆盖，保证回显准确
  loadMoments()
})

onPullDownRefresh(async () => {
  try { await Promise.all([loadUserProfile(), loadMoments()]) }
  finally { uni.stopPullDownRefresh() }
})
</script>

<style lang="scss" scoped>
.moments-page{--liquid-tabbar-space:112px;min-height:100vh;box-sizing:border-box;background:#f5f4f1;color:#272b23;padding:0 14px calc(112px + env(safe-area-inset-bottom));}
button{margin:0;box-sizing:border-box;border:0;line-height:1.5;font-weight:400;white-space:normal;overflow-wrap:anywhere;background:transparent;color:inherit;transition:transform 140ms cubic-bezier(.23,1,.32,1);}button::after{border:0;}button:active{transform:scale(.97);}button[disabled]{opacity:.55;}button :deep(.uni-icons){pointer-events:none;}
.moments-page-header{position:fixed;top:0;left:0;right:0;z-index:30;padding:0 20px;background:#f5f4f1;box-sizing:border-box;}
.moments-title-row{min-height:62px;display:flex;align-items:center;padding:8px 2px 12px;box-sizing:border-box;}.moments-title{font-size:28px;font-weight:700;line-height:1.25;overflow-wrap:anywhere;}
.moments-identity{display:flex;gap:14px;align-items:center;padding:4px 2px 19px;min-width:0;}.avatar-button{flex:0 0 60px;width:60px;height:60px;border-radius:21px;padding:0;overflow:hidden;border:2px solid #fff;}.identity-avatar{display:block;width:100%;height:100%;}.avatar-fallback{display:flex;align-items:center;justify-content:center;background:#e9e9de;}.identity-copy{flex:1;min-width:0;}.identity-name{font-size:22px;line-height:1.35;font-weight:650;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.identity-bio{padding:5px 0 0;color:#828679;text-align:left;font-size:12px;line-height:1.6;min-height:34px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.bio-input{width:100%;height:38px;min-width:0;font-size:13px;background:#fff;border-radius:9px;padding:0 8px;box-sizing:border-box;}
.moments-tabs{display:flex;gap:22px;align-items:stretch;border-bottom:1px solid #e4e5dc;margin-bottom:14px;}.moments-tab{position:relative;display:flex;gap:6px;justify-content:center;align-items:center;min-width:0;min-height:51px;font-size:16px;color:#969b8d;padding:10px 1px;border-radius:0;text-align:left;}.moments-tab.active{font-weight:650;color:#292e25;}.moments-tab.active::before{content:'';position:absolute;bottom:-1px;left:0;right:0;height:3px;background:#ffda46;border-radius:4px;}.tab-count{font-size:12px;font-weight:400;flex-shrink:0;color:#8c9182;}.publish-button{flex:0 0 44px;align-self:center;width:44px;height:44px;min-height:44px;margin-left:auto;padding:0;background:#ffdc49;border-radius:50%;display:flex;justify-content:center;align-items:center;}.header-spacer{pointer-events:none;}
.moments-pane,.profile-pane{min-width:0;}.moments-composer{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:14px;border:1px solid #eaece2;border-radius:20px;background:#fff;margin-bottom:21px;}.composer-symbol{display:flex;align-items:center;justify-content:center;width:37px;height:37px;border-radius:50%;background:#fff7d9;flex-shrink:0;}.composer-copy{flex:1;min-width:0;}.composer-title{display:block;font-size:14px;line-height:1.5;font-weight:550;}.composer-hint{display:block;margin-top:4px;color:#a0a596;font-size:11px;line-height:1.55;}.composer-photo{flex-shrink:0;}.timeline-heading{font-size:14px;font-weight:600;margin:0 8px 12px;}
.post-card{min-width:0;background:#fff;border:1px solid #eceee5;border-radius:23px;margin-bottom:13px;padding:17px;}.post-header{display:flex;gap:10px;align-items:center;min-width:0;margin-bottom:12px;}.post-avatar{width:35px;height:35px;flex-shrink:0;border-radius:12px;}.post-author{flex:1;min-width:0;}.post-name{display:block;font-size:13px;font-weight:600;line-height:1.5;overflow-wrap:anywhere;}.post-date{display:block;font-size:10px;color:#9a9f92;margin-top:3px;}.post-pin{max-width:25%;font-size:10px;line-height:1.5;color:#a48b36;overflow-wrap:anywhere;}.icon-button{flex-shrink:0;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;margin-right:-8px;}.post-text{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.8;margin-bottom:13px;}.single-image{border-radius:15px;overflow:hidden;}.single-img{display:block;width:100%;height:208px;background:#eee;}.post-image-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}.post-grid-image{display:block;width:100%;height:calc((100vw - 76px)/3);max-height:180px;background:#eee;border-radius:9px;}.video-box{position:relative;overflow:hidden;border-radius:15px;margin-bottom:13px;background:#353b30;}.video-cover{display:block;height:200px;width:100%;opacity:.5;}.video-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);}.post-location{display:flex;gap:4px;align-items:center;margin-top:11px;color:#949b8a;font-size:11px;line-height:1.5;}.post-location text{min-width:0;overflow-wrap:anywhere;}.post-actions{display:flex;align-items:center;gap:16px;margin:3px 0 -5px;}.post-like-button,.post-comment-button{display:flex;align-items:center;gap:6px;min-height:44px;min-width:46px;padding:0;font-size:12px;color:#818b76;}.post-like-button.is-liked{color:#bb982e;}.interactions-toggle{display:flex;align-items:center;gap:7px;width:100%;min-height:44px;margin-top:8px;padding:10px 0 0;border-top:1px solid #efefe8;text-align:left;color:#8e9682;font-size:11px;border-radius:0;}.interaction-summary{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}.interaction-label{flex:0 1 auto;max-width:45%;line-height:1.5;}.post-interactions{background:#f6f6f0;border-radius:13px;padding:11px 12px;margin-top:10px;font-size:12px;line-height:1.8;overflow-wrap:anywhere;}.liked-by-row{display:flex;gap:7px;align-items:flex-start;color:#8c845b;margin-bottom:5px;}.liked-by-row text{min-width:0;flex:1;}.comment-item{padding:5px 0;color:#68755b;}.comment-author{font-weight:550;}.comment-input-row{padding-top:10px;}.reply-target-tag{display:flex;align-items:center;justify-content:space-between;color:#859375;font-size:11px;overflow-wrap:anywhere;}.reply-target-tag>text{min-width:0;flex:1;}.reply-cancel{width:40px;min-height:36px;padding:0;flex-shrink:0;}.comment-input-inner{display:flex;align-items:center;gap:8px;}.comment-input{flex:1;min-width:0;height:44px;background:#f5f6ef;border-radius:12px;padding:0 11px;font-size:13px;box-sizing:border-box;}.comment-send-button{min-height:44px;max-width:32%;padding:10px 13px;border-radius:14px;background:#ffe06b;font-size:12px;}
.hub-state{padding:38px 20px;margin:8px 0 18px;background:#fff;border:1px solid #edeee5;border-radius:23px;display:flex;align-items:center;flex-direction:column;gap:12px;text-align:center;color:#929a85;font-size:13px;line-height:1.75;}.state-icon{height:62px;width:62px;display:flex;align-items:center;justify-content:center;border-radius:22px;background:#f7f3e5;margin-bottom:6px;}.state-title{color:#515a47;font-size:18px;font-weight:550;}.state-hint{font-size:12px;max-width:260px;}.state-button{background:#ffdc49;min-height:44px;border-radius:24px;padding:11px 23px;font-size:13px;margin-top:5px;}.profile-likes-entry{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:16px;margin-bottom:14px;background:#f0ecdc;border:1px solid #e7e1c7;border-radius:19px;font-size:13px;line-height:1.65;}.profile-likes-label{flex:1;min-width:0;}.profile-likes-entry :deep(.uni-icons){line-height:1;flex-shrink:0;}.likes-error{display:flex;gap:9px;align-items:center;background:#f0ecdc;padding:12px 15px;border-radius:18px;margin-bottom:14px;font-size:12px;}.likes-error>text{flex:1;min-width:0;}.likes-error button{font-size:12px;min-height:44px;flex-shrink:0;padding:10px;color:#8b7839;}
.photo-section,.account-section{background:#fff;border:1px solid #edeee5;border-radius:23px;padding:18px;margin-bottom:14px;}.section-heading{display:flex;gap:8px;align-items:center;min-width:0;margin-bottom:15px;}.section-title{font-size:16px;font-weight:600;line-height:1.5;flex:1;min-width:0;overflow-wrap:anywhere;}.profile-sections{min-width:0;}.profile-sections :deep(.profile-container--cards){padding:0 0 14px;max-width:none;}.profile-sections :deep(.profile-card),.profile-sections :deep(.profile-table-card){border:1px solid #edeee5;}.account-label{display:block;font-size:12px;color:#98a089;margin-bottom:8px;}.account-email{font-size:14px;line-height:1.7;overflow-wrap:anywhere;}
.facebook-photo-mask{position:fixed;z-index:1500;top:0;left:0;right:0;bottom:0;display:flex;align-items:flex-end;background:rgba(15,19,12,.42);}.facebook-photo-sheet{width:100%;max-height:85vh;padding:22px 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;border-radius:28px 28px 0 0;background:#f7f7f0;}.facebook-photo-header,.facebook-photo-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;}.facebook-header-copy{min-width:0;flex:1;}.facebook-photo-title{display:block;font-size:19px;line-height:1.5;font-weight:600;overflow-wrap:anywhere;}.facebook-photo-hint,.facebook-photo-actions>text{display:block;font-size:12px;line-height:1.6;color:#8a947c;overflow-wrap:anywhere;}.facebook-photo-hint{margin-top:6px;}.facebook-photo-close{padding:0;min-height:44px;width:44px;flex-shrink:0;}.facebook-photo-grid{height:45vh;margin:20px 0;}.facebook-photo-item{position:relative;display:inline-block;width:calc((100% - 16px)/3);height:120px;margin:0 8px 8px 0;overflow:hidden;border:2px solid transparent;border-radius:13px;box-sizing:border-box;}.facebook-photo-item:nth-child(3n){margin-right:0;}.facebook-photo-item.selected{border-color:#d4b139;}.facebook-photo-item image{width:100%;height:100%;}.facebook-photo-check{position:absolute;top:6px;right:6px;width:23px;height:23px;border:1px solid white;border-radius:50%;font-size:14px;line-height:21px;text-align:center;color:#fff;background:rgba(0,0,0,.3);}.selected .facebook-photo-check{background:#cfad32;}.facebook-photo-actions>text{flex:1;min-width:0;}.facebook-photo-actions button{min-height:44px;padding:11px 24px;border-radius:24px;background:#ffdb49;font-size:13px;max-width:45%;}

.photo-summary-section{margin:7px 0 18px;}.photo-summary-title{display:block;font-size:21px;line-height:1.4;font-weight:550;margin:0 8px 14px;}.photo-summary-card{background:#fff;border-radius:24px;padding:9px 9px 13px;border:1px solid #eeece7;}.photo-summary-strip{height:91px;white-space:nowrap;border-radius:17px;overflow:hidden;width:100%;}.profile-photo-button{display:inline-flex;align-items:center;justify-content:center;vertical-align:top;width:16.6667%;height:91px;min-width:44px;border-radius:0;padding:0;background:#eeecea;border-right:1px solid #e8e5e2;overflow:hidden;}.profile-photo-button image{display:block;width:100%;height:100%;pointer-events:none;}.photo-summary-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 7px 0;}.photo-summary-copy{flex:1;min-width:0;font-size:12px;line-height:1.6;overflow-wrap:anywhere;color:#66665c;}.photo-summary-copy>text{display:block;}.photo-summary-count{font-size:11px;color:#9a968d;margin-top:3px;font-variant-numeric:tabular-nums;}.photos-manage-button{display:flex;align-items:center;justify-content:center;flex:0 1 auto;min-width:76px;max-width:42%;min-height:44px;padding:10px 20px;border-radius:25px;background:#242321;color:#fff;font-size:14px;}

.moments-identity{gap:16px;padding-bottom:14px;}.avatar-button.identity-photo-stack{position:relative;flex:0 0 82px;width:82px;height:102px;border:0;border-radius:0;overflow:visible;}.identity-photo-stack .identity-avatar,.identity-photo-back{position:absolute;width:63px;height:88px;top:6px;border-radius:14px;box-shadow:0 4px 10px rgba(38,31,20,.1);pointer-events:none;}.identity-photo-back{left:17px;transform:rotate(9deg);background:#e8e5dd;}.identity-photo-front{left:2px;transform:rotate(-7deg);border:2px solid #fff;box-sizing:border-box;}.profile-edit-entry{display:flex;align-items:center;gap:3px;padding:5px 0;min-height:44px;font-size:12px;color:#817b70;text-align:left;}.profile-edit-entry>text{min-width:0;overflow-wrap:anywhere;}.profile-completion-badge{flex:0 0 64px;max-width:64px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:74px;padding:0;font-size:10px;line-height:1.5;color:#8e8165;}.completion-badge-label{max-width:100%;overflow-wrap:anywhere;}.completion-ring{position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:#e9e4d7;}.completion-ring>text{position:absolute;inset:4px;display:flex;align-items:center;justify-content:center;background:#f5f4f1;border-radius:50%;font-size:12px;font-weight:600;color:#8d7435;font-variant-numeric:tabular-nums;}.completion-half{position:absolute;top:0;width:24px;height:48px;overflow:hidden;}.completion-half-right{right:0;}.completion-half-left{left:0;}.completion-half>view{position:absolute;top:0;width:48px;height:48px;border-radius:50%;box-sizing:border-box;border:0;}.completion-half-right>view{right:0;background:linear-gradient(90deg,#d2ac49 50%,transparent 50%);transform-origin:center;}.completion-half-left>view{left:0;background:linear-gradient(90deg,transparent 50%,#d2ac49 50%);transform-origin:center;}.profile-completion-prompt{display:flex;align-items:center;justify-content:center;gap:9px;min-height:45px;background:#fff;border-radius:24px;padding:9px 13px;width:100%;font-size:12px;margin:0 0 8px;color:#82796c;}.profile-completion-prompt>text{min-width:0;overflow-wrap:anywhere;}.completion-alert{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:17px;height:17px;border-radius:50%;background:#c97e4f;color:#fff;font-size:12px;font-weight:700;}

@media(max-width:350px){.moments-page-header{padding-left:17px;padding-right:17px;}.moments-tabs{gap:16px;}.moments-tab{font-size:14px;}.moments-title{font-size:26px;}.identity-name{font-size:20px;}.identity-bio{font-size:11px;}.avatar-button{flex-basis:54px;width:54px;height:54px;}.moments-identity{gap:11px;}.post-card{padding:14px;}.single-img{height:185px;}.profile-likes-entry{font-size:12px;}.section-title{font-size:15px;}}
@media(min-width:600px){.moments-page,.moments-page-header{max-width:680px;margin-left:auto;margin-right:auto;}.single-img{height:330px;}.facebook-photo-sheet{max-width:680px;margin:0 auto;}}
/* #ifdef H5 */
.facebook-photo-mask{z-index:950;}
/* #endif */
@media(prefers-reduced-motion:reduce){button{transition:none;}button:active{transform:none;}}
</style>
