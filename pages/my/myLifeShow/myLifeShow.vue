<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 1. 顶部背景与用户信息 -->
    <view class="header">
      <!-- 资料照片同时是个人页封面；没有照片时显示本地默认封面。 -->
      <swiper class="cover-swiper" :autoplay="profilePhotos.length > 1" circular :interval="3500" :duration="450" @tap="changeCover">
        <swiper-item v-for="(photo, index) in profilePhotos" :key="`${photo}-${index}`">
          <image class="cover-bg" :src="photo" mode="aspectFill"></image>
        </swiper-item>
        <swiper-item v-if="!profilePhotos.length">
          <view class="cover-default"><image class="cover-default-logo" src="/static/logo.png" mode="aspectFit"></image></view>
        </swiper-item>
      </swiper>

      <!-- 用户名与头像 -->
      <view class="user-info">
        <view class="user-text">
          <text class="username">{{ userInfo.username || '用户' }}</text>
          <text v-if="userInfo.email" class="email">{{ userInfo.email }}</text>
        </view>
        <image class="avatar" :src="userInfo.avatarUrl || 'https://via.placeholder.com/150/cccccc/ffffff?text=Avatar'"
          mode="aspectFill" @click="changeAvatar"></image>
      </view>
    </view>

    <!-- 收到点赞：只展示最近 3 个头像与最新点赞人的名称。 -->
    <view v-if="receivedLikeTotal > 0" class="received-likes" @tap="showLikesSheet = true">
      <view class="received-avatars">
        <image v-for="like in receivedLikes.slice(0, 3)" :key="`${like.userId}-${like.createdAt}`" class="received-avatar" :src="getFullImageUrl(like.avatarUrl) || '/static/logo.png'" mode="aspectFill"></image>
      </view>
      <text class="received-likes-text">{{ receivedLikes[0]?.name || '好友' }}<text v-if="receivedLikeTotal > 1">和其他 {{ receivedLikeTotal - 1 }} 人</text> 为您点赞</text>
    </view>

    <!-- 2. 个性签名 -->
    <view class="signature" @click="editSignature">
      <text v-if="!editingBio" @click.stop="editSignature">{{ userInfo.bio || '这个人很懒，什么都没写' }}</text>
      <input v-else class="bio-input" v-model="bioDraft" :focus="true" confirm-type="done" maxlength="50"
        placeholder="填写个性签名" @confirm="saveBio" @blur="saveBio" />
    </view>
    <view style="position: relative;">
      <view style=" position: absolute; top: -100rpx; left: 40rpx;width: 176rpx;height: 90rpx;" @click="goToSearch">
        <botton2 text="搜寻" />
        <!-- <loading2 /> -->
      </view>
    </view>
    <ProfileDetailSections
      v-if="profileData"
      :profile="profileData"
      :enable-like="false"
      :liked="false"
      :like-count="0"
    />
    <!-- 3. 内容列表区域 -->
    <view class="moments-list">
      <!-- 空状态 -->
      <view v-if="!loading && moments.length === 0" class="empty-state">
        <text class="empty-text">还没有动态</text>
        <text class="empty-hint">点击下方按钮发布第一条动态</text>
      </view>

      <!-- 动态列表 -->
      <block v-for="(item, index) in moments" :key="item.id">
        <!-- 日期分隔线 -->
        <view v-if="showDateDivider(index)" class="date-divider">
          <text class="date-text">{{ getDateLabel(item.created_at) }}</text>
        </view>

        <!-- 列表项 -->
        <view class="list-item" @click="goToDetail(item)" @longpress="showItemActions(item)">
          <view class="left-time">
            <view v-if="item.is_pinned" class="pin-badge">
              <text>置顶</text>
            </view>
            <view v-else class="time-info">
              <text class="time-hour">{{ formatTime(item.created_at) }}</text>
            </view>
          </view>
          <view class="right-content" :class="getMediaAlignClass(item)">
            <!-- 视频 -->
            <view v-if="item.video_url" class="media-box video-box" @click.stop="playVideo(item)">
              <image class="video-cover" :src="getVideoCover(item)" mode="aspectFill"></image>
              <view class="play-icon">▶</view>
            </view>
            <!-- 文本内容 -->
            <view v-if="item.content" class="post-text"
              :class="{ 'with-media': item.images.length > 0 || item.video_url }">
              <text>{{ item.content }}</text>
            </view>
            <!-- 图片 -->
            <template v-if="item.images && item.images.length > 0">
              <view v-if="item.images.length === 1" class="single-image" @click.stop="previewImage(item.images, 0)">
                <image class="media-box single-img" :src="getFullImageUrl(item.images[0])" mode="widthFix"></image>
              </view>
              <view v-else class="image-grid">
                <image v-for="(img, imgIndex) in item.images.slice(0, 9)" :key="imgIndex" class="media-box grid-img"
                  :src="getFullImageUrl(img)" mode="aspectFit" @click.stop="previewImage(item.images, imgIndex)">
                </image>
              </view>
            </template>



            <!-- 位置信息 -->
            <view v-if="item.location_name" class="location-info">
              <text class="location-icon">📍</text>
              <text class="location-text">{{ item.location_name }}</text>
            </view>

            <!-- 操作按钮：点赞按钮直接生效，评论按钮只负责唤出输入框 -->
            <view class="action-buttons" @click.stop>
              <view class="action-btn" @click="toggleLike(item)">
                <text class="action-icon">{{ item.is_liked ? '❤️' : '🤍' }}</text>
                <text class="action-count">{{ item.like_count || 0 }}</text>
              </view>
              <view class="action-btn" @click="focusComment(item)">
                <text class="action-icon">💬</text>
                <text class="action-count">{{ item.comment_count || 0 }}</text>
              </view>
            </view>

            <!-- 点赞人 + 全部评论：只要有一项就显示这个灰底信息区，跟点没点击评论图标无关 -->
            <view v-if="(item.likedBy && item.likedBy.length > 0) || (item.comments && item.comments.length > 0)"
              class="meta-box" @click.stop>
              <!-- 点赞人名单 -->
              <view v-if="item.likedBy && item.likedBy.length > 0" class="liked-by-row">
                <text class="liked-by-icon">❤️</text>
                <text class="liked-by-names">{{item.likedBy.map(u => u.email).join('，')}}</text>
              </view>

              <!-- 点赞和评论都有时加一条分隔线 -->
              <view v-if="item.likedBy && item.likedBy.length > 0 && item.comments && item.comments.length > 0"
                class="meta-divider"></view>

              <!-- 全部评论，点某条评论 = 回复这条评论的作者 -->
              <view v-for="c in item.comments" :key="c.id" class="comment-item" @click="startReply(item, c)">
                <text class="comment-author">{{ c.email }}</text>
                <text v-if="c.reply_to_email" class="comment-reply-arrow"> 回复 {{ c.reply_to_email }}</text>
                <text class="comment-colon">：</text>
                <text class="comment-content">{{ c.content }}</text>
              </view>
            </view>

            <!-- 评论输入框：点💬图标，或者点某条评论（回复）后展开 -->
            <view v-if="item.showCommentInput" class="comment-input-row" @click.stop>
              <view v-if="item.replyTarget" class="reply-target-tag">
                <text>回复 {{ item.replyTarget.email }}</text>
                <text class="reply-cancel" @click="cancelReply(item)">×</text>
              </view>
              <view class="comment-input-inner">
                <input class="comment-input" v-model="item.commentDraft" :focus="item.showCommentInput"
                  confirm-type="send" :placeholder="item.replyTarget ? `回复 ${item.replyTarget.email}` : '说点什么…'"
                  @confirm="submitComment(item)" />
                <text class="comment-send-btn" @click="submitComment(item)">发送</text>
              </view>
            </view>
          </view>
        </view>
      </block>
    </view>

    <!-- 底部发布按钮 -->
    <view class="fab-container" @click="goToEdit">
      <botton3 text="+" />
      <!-- <view class="fab" @click="goToEdit">
        <text class="fab-icon">+</text>
      </view> -->
    </view>

    <!-- 底部安全区域占位 -->
    <view class="footer-spacer"></view>
    <ProfileLikesSheet :visible="showLikesSheet" :likes="receivedLikes" :total="receivedLikeTotal" @close="showLikesSheet = false" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getMomentsApi, togglePinMomentApi, deleteMomentApi,
  toggleLikeMomentApi, uploadAvatarApi, uploadProfilePhotosApi,
  getProfileApi, getCommentsApi, addCommentApi, updateBioApi,
  getLikesApi, getProfileLikesApi
} from '@/api/index.js'
import { config } from '@/utils/config.js'
import botton2 from '@/static/botton/botton2.vue'
import botton3 from '@/static/botton/botton3.vue'
import ProfileDetailSections from '@/components/profile/ProfileDetailSections.vue'
import ProfileLikesSheet from '@/components/profile/ProfileLikesSheet.vue'
// import loading2 from '@/static/loading/loading2.vue'
// 状态
const loading = ref(false)
const moments = ref([])
const profileData = ref(null)
const profilePhotos = ref([])
const receivedLikes = ref([])
const receivedLikeTotal = ref(0)
const showLikesSheet = ref(false)
const userInfo = ref({
  username: '',
  email: '',
  avatarUrl: '',
  coverUrl: '',
  bio: ''
})

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

function goToSearch() {
  uni.navigateTo({
    url: '/pages/searchPerson/searchPerson'
  })
}
// 获取视频封面（如果有的话）
function getVideoCover(item) {
  // 这里可以使用视频的第一帧作为封面，暂时返回占位图
  return 'https://via.placeholder.com/300/333333/ffffff?text=Video'
}

// 判断是否显示日期分隔线
function showDateDivider(index) {
  if (index === 0) return true
  const current = moments.value[index]
  const prev = moments.value[index - 1]
  return getDateLabel(current.created_at) !== getDateLabel(prev.created_at)
}

// 获取日期标签
function getDateLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return '今天'
  if (itemDate.getTime() === yesterday.getTime()) return '昨天'

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}


const editingBio = ref(false)
const bioDraft = ref('')

// 从后端拉取最新头像/背景/签名，覆盖本地缓存（本地缓存只作为首屏兜底展示）
async function loadUserProfile() {
  try {
    const res = await getProfileApi()
    const profile = res.profile
    if (profile) {
      profileData.value = profile
      profilePhotos.value = normalizePhotoUrls(profile.photos).map(getFullImageUrl)
      userInfo.value.avatarUrl = getFullImageUrl(profile.avatar_url) || userInfo.value.avatarUrl
      userInfo.value.coverUrl = getFullImageUrl(profile.cover_url) || userInfo.value.coverUrl
      userInfo.value.username = profile.en_first_name || userInfo.value.username
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
    console.error('获取用户资料失败，暂用本地缓存', e)
  }
}

async function loadReceivedLikes(profileId) {
  try {
    const result = await getProfileLikesApi(profileId)
    const likes = Array.isArray(result.likes) ? result.likes : []
    // 兼容线上旧接口的 snake_case 字段；后端更新后会直接使用完整的 camelCase 数据。
    receivedLikes.value = likes.map(normalizeProfileLike)
    receivedLikeTotal.value = Number(result.total ?? receivedLikes.value.length)
  } catch (error) {
    console.error('获取收到的点赞失败', error)
  }
}

function normalizeProfileLike(like) {
  const email = like.email || ''
  return {
    userId: like.userId ?? like.user_id,
    email,
    name: like.name || email.split('@')[0] || '好友',
    avatarUrl: like.avatarUrl || like.avatar_url || '',
    createdAt: like.createdAt || like.created_at || ''
  }
}

function editSignature() {
  bioDraft.value = userInfo.value.bio
  editingBio.value = true
}

async function saveBio() {
  editingBio.value = false
  const text = (bioDraft.value || '').trim()
  if (text === userInfo.value.bio) return // 没改就不请求
  try {
    await updateBioApi(text)
    userInfo.value.bio = text
    const cached = uni.getStorageSync('USER_INFO') || {}
    uni.setStorageSync('USER_INFO', { ...cached, bio: text })
  } catch (e) {
    console.error('签名保存失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 获取媒体对齐方式
function getMediaAlignClass(item) {
  if (item.images && item.images.length > 0) return 'flex-row-start'
  return 'flex-row-center'
}

// 加载动态列表
async function loadMoments() {
  loading.value = true
  try {
    const res = await getMomentsApi()
    moments.value = (res.moments || []).map(m => ({
      ...m,
      images: parseImages(m.images),
      likedBy: [],           // 点赞人名单
      comments: [],          // 全部评论
      showCommentInput: false, // 是否展开评论输入框
      replyTarget: null,     // 当前正在回复谁 { userId, email }
      commentDraft: ''
    }))
    loadMetaForMoments()
  } catch (e) {
    console.error('加载动态失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
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
    return JSON.parse(images)
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
function goToDetail(item) {
  return
  uni.navigateTo({
    url: `/pages/my/myLifeShowEdit/myLifeShowEdit?id=${item.id}&mode=view`
  })
}

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
  console.log(item, 'item');

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
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// 点💬图标：唤出输入框，普通评论（不回复任何人）
function focusComment(item) {
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
  const text = (item.commentDraft || '').trim()
  if (!text) return
  try {
    const res = await addCommentApi(item.id, text, item.replyTarget?.userId)
    item.comments.push(res.comment) // 后端已经把当前用户的 email 和回复对象一起返回了，直接用
    item.comment_count = (item.comment_count || 0) + 1
    item.commentDraft = ''
    item.replyTarget = null
    item.showCommentInput = false
  } catch (e) {
    console.error('评论失败', e)
    uni.showToast({ title: '评论失败', icon: 'none' })
  }
}

// 长按动态：置顶/取消置顶、删除
function showItemActions(item) {
  const pinLabel = item.is_pinned ? '取消置顶' : '置顶'
  uni.showActionSheet({
    itemList: [pinLabel, '删除'],
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
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      } else if (res.tapIndex === 1) {
        uni.showModal({
          title: '确认删除',
          content: '删除后无法恢复，确定删除这条动态吗？',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              try {
                await deleteMomentApi(item.id)
                moments.value = moments.value.filter(m => m.id !== item.id)
                uni.showToast({ title: '已删除', icon: 'success' })
              } catch (e) {
                console.error('删除失败', e)
                uni.showToast({ title: '删除失败', icon: 'none' })
              }
            }
          }
        })
      }
    }
  })
}

// 修改封面
function changeCover() {
  const remaining = 9 - profilePhotos.value.length
  if (remaining <= 0) {
    uni.showToast({ title: '最多只能上传 9 张照片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remaining,
    sourceType: ['album'],
    success: async (res) => {
      try {
        uni.showLoading({ title: '上传中...' })
        const result = await uploadProfilePhotosApi(res.tempFilePaths)
        profilePhotos.value = normalizePhotoUrls(result.photos).map(getFullImageUrl)
        if (profileData.value) profileData.value.photos = profilePhotos.value
        // 同步更新本地缓存，避免下次进页面读到旧照片。
        const cached = uni.getStorageSync('USER_INFO') || {}
        uni.setStorageSync('USER_INFO', { ...cached, photos: profilePhotos.value })
        // 以服务端最终保存的数据刷新资料区，确保轮播与下方照片展示完全一致。
        await loadUserProfile()
      } catch (e) {
        console.error('封面上传失败', e)
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

// 修改头像
function changeAvatar() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album'],
    success: async (res) => {
      try {
        uni.showLoading({ title: '上传中...' })
        const result = await uploadAvatarApi(res.tempFilePaths[0])
        userInfo.value.avatarUrl =  result.url
        const cached = uni.getStorageSync('USER_INFO') || {}
        uni.setStorageSync('USER_INFO', { ...cached, avatar_url: result.url })
      } catch (e) {
        console.error('头像上传失败', e)
        uni.showToast({ title: '上传失败', icon: 'none' })
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
      profilePhotos.value = normalizePhotoUrls(info.photos).map(getFullImageUrl)
    }
  } catch (e) {
    console.error('获取用户信息失败', e)
  }
}

onShow(() => {
  getUserInfo()     // 本地缓存先展示，避免首屏空白
  loadUserProfile() // 再用后端最新数据覆盖，保证回显准确
  loadMoments()
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 150rpx;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  color: #888888;
  font-size: 28rpx;
}

/* --- 头部区域 --- */
.header {
  position: relative;
  width: 100%;
  height: 500rpx;
  background-color: #f5f5f5;
}

.cover-bg {
  width: 100%;
  height: 100%;
}

.cover-swiper {
  width: 100%;
  height: 100%;
}

.cover-default {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fff1bf, #f2ca72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-default-logo {
  width: 144rpx;
  height: 144rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.76);
  padding: 24rpx;
}

.user-info {
  position: absolute;
  bottom: -60rpx;
  right: 30rpx;
  display: flex;
  align-items: flex-end;
}

.user-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 30rpx;
  margin-bottom: 48rpx;
}

.username {
  color: #ffffff;
  font-size: 38rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
}

.email {
  color: rgba(255, 255, 255, 0.88);
  font-size: 24rpx;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background-color: #fff;
  padding: 4rpx;
  box-sizing: border-box;
}

/* --- 个性签名 --- */
.signature {
  text-align: right;
  padding: 80rpx 30rpx 20rpx;
  color: #888888;
  font-size: 26rpx;
  background: #fff6df;
}

.received-likes {
  min-height: 68rpx;
  padding: 18rpx 30rpx 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff6df;
}

.received-avatars {
  display: flex;
  align-items: center;
  padding-left: 10rpx;
}

.received-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  margin-left: -24rpx;
  background: #eee;
}

.received-likes-text {
  color: #333;
  font-size: 26rpx;
}

/* --- 列表区域 --- */
.moments-list {
  padding-top: 20rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-text {
  color: #888888;
  font-size: 32rpx;
  margin-bottom: 20rpx;
}

.empty-hint {
  color: #aaaaaa;
  font-size: 26rpx;
}

.date-divider {
  padding: 30rpx;
  text-align: center;
}

.date-text {
  color: #888888;
  font-size: 28rpx;
  background-color: #e0e0e0;
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
}

.list-item {
  display: flex;
  padding: 30rpx;
  background-color: #ffffff;
  margin-bottom: 2rpx;
}

/* 左侧时间 */
.left-time {
  width: 100rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10rpx;
}

.pin-badge {
  background-color: #fff6df;
  color: #333333;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.time-info {
  text-align: center;
}

.time-hour {
  font-size: 24rpx;
  color: #888888;
}

/* 右侧内容区 */
.right-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.flex-row-center {
  align-items: center;
}

.flex-row-start {
  align-items: flex-start;
}

/* 单图样式 */
.single-image {
  width: 100%;
}

.single-img {
  width: 400rpx;
  height: auto;
  display: block;
  border-radius: 8rpx;
}

/* 图片网格 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  width: 100%;
}

.grid-img {
  width: calc((100vw - 180rpx) / 3);
  height: calc((100vw - 180rpx) / 3);
  border-radius: 4rpx;
  background-color: #f0f0f0;
}

/* 媒体方块通用样式 */
.media-box {
  background-color: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

/* 视频特殊样式 */
.video-box {
  position: relative;
  width: 300rpx;
  height: 300rpx;
}

.video-cover {
  width: 100%;
  height: 100%;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 50rpx;
  width: 80rpx;
  height: 80rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 文本内容 */
.post-text {
  width: 100%;
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  padding: 10rpx 0;

  &.with-media {
    width: 100%;
  }
}

/* 位置信息 */
.location-info {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10rpx 0;
}

.location-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.location-text {
  font-size: 24rpx;
  color: #fff6df;
}

/* 操作按钮 */
.action-buttons {
  width: 100%;
  display: flex;
  gap: 40rpx;
  padding: 10rpx 0;
  border-top: 1rpx solid #f0f0f0;
  margin-top: 10rpx;
}

/* 点赞人 + 评论 灰底信息区（跟微信朋友圈一个样） */
.meta-box {
  width: 100%;
  margin-top: 10rpx;
  padding: 16rpx 20rpx;
  background-color: #f7f7f7;
  border-radius: 8rpx;
}

.liked-by-row {
  display: flex;
  align-items: flex-start;
  font-size: 26rpx;
}

.liked-by-icon {
  margin-right: 8rpx;
}

.liked-by-names {
  color: #576b95;
  flex: 1;
}

.meta-divider {
  height: 1rpx;
  background-color: #e5e5e5;
  margin: 12rpx 0;
}

.comment-item {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 6rpx;
}

.comment-author {
  color: #576b95;
}

.comment-reply-arrow {
  color: #576b95;
}

.comment-colon {
  color: #333;
}

/* 评论输入框 */
.comment-input-row {
  width: 100%;
  margin-top: 10rpx;
}

.reply-target-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
  color: #888888;
  margin-bottom: 8rpx;
  padding: 0 6rpx;
}

.reply-cancel {
  color: #aaaaaa;
  font-size: 32rpx;
  padding: 0 10rpx;
}

.comment-input-inner {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.comment-input {
  flex: 1;
  height: 60rpx;
  background-color: #f5f5f5;
  border-radius: 30rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}

.comment-send-btn {
  color: #fff6df;
  font-size: 28rpx;
  flex-shrink: 0;
}

.bio-input {
  text-align: right;
  font-size: 26rpx;
  color: #888888;
  height: 40rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 32rpx;
}

.action-count {
  font-size: 26rpx;
  color: #888888;
}

/* --- 底部发布按钮 --- */
.fab-container {
  position: fixed;
  bottom: 60rpx;
  right: 40rpx;
//   z-index: 100;
}

.fab {
  width: 100rpx;
  height: 100rpx;
  background-color: #fff6df;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 20rpx rgba(255, 246, 223, 0.4);
}

.fab-icon {
  font-size: 60rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}

/* 底部安全区域占位 */
.footer-spacer {
  height: calc(100rpx + var(--safe-area-inset-bottom));
}
</style>
