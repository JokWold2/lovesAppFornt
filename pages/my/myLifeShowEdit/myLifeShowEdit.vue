<template>
  <view class="container">
    <!-- 顶部状态栏占位 -->
    <view class="status-bar"></view>

    <!-- 顶部导航栏 -->
    <view class="header">
      <text class="cancel-btn" @click="onCancel">{{ t('common.cancel') }}</text>
      <view class="publish-btn" :class="{ disabled: publishing }" @click="onPublish">
        <text class="publish-text">{{ publishing ? t('publish.publishing') : t('publish.publish') }}</text>
      </view>
    </view>

    <!-- 文本输入区域 -->
    <view class="content-wrapper">
      <textarea
        v-model="postContent"
        class="textarea"
        :placeholder="t('publish.thought')"
        auto-height
        placeholder-style="color: #BBBBBB; font-size: 32rpx;"
        :maxlength="2000"
      />

      <!-- 图片上传区域 -->
      <view class="image-grid" v-if="config.baseURL" >
        <!-- 已上传的图片 -->
        <view v-for="(img, index) in imageList" :key="index" class="image-item uploaded">
          <image :src="getFullImageUrl(img.url)" mode="aspectFill" @click="previewImage(index)" />
          <view class="delete-btn" @click="deleteImage(index)">
            <text class="delete-icon">×</text>
          </view>
        </view>

        <!-- 添加图片按钮 (最多9张) -->
        <view v-if="imageList.length < 9" class="image-item add-btn" @click="addImages">
          <text class="plus-icon">+</text>
        </view>
      </view>

      <!-- 上传进度 -->
      <view v-if="uploading" class="upload-progress">
        <text class="progress-text">{{ t('publish.uploading') }}</text>
      </view>
    </view>

    <!-- 设置列表 -->
    <view class="settings-list">
      <!-- 所在位置 -->
      <view class="settings-item" @click="selectLocation">
        <view class="item-left">
          <view class="item-icon location-icon">📍</view>
          <text class="item-title">{{ t('publish.location') }}</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ location.name || t('publish.notSelected') }}</text>
          <view class="arrow-right"></view>
        </view>
      </view>

      <!-- 提醒谁看 -->
      <view class="settings-item" @click="selectRemind">
        <view class="item-left">
          <view class="item-icon at-icon">@</view>
          <text class="item-title">{{ t('publish.remind') }}</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ remindUsers.length > 0 ? t('publish.friends', { count: remindUsers.length }) : t('publish.notSelected') }}</text>
          <view class="arrow-right"></view>
        </view>
      </view>

      <!-- 谁可以看 -->
      <view class="settings-item" @click="selectVisibility">
        <view class="item-left">
          <view class="item-icon people-icon">👥</view>
          <text class="item-title">{{ t('publish.visibility') }}</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ visibilityLabel }}</text>
          <view class="arrow-right"></view>
        </view>
      </view>

      <!-- 部分可见好友列表 -->
      <view v-if="visibility === 'partial' && visibleUsers.length > 0" class="visible-users-list">
        <text class="visible-users-label">{{ t('publish.visibleFriends') }}</text>
        <view class="visible-user-tags">
          <view v-for="user in visibleUsers" :key="user.id" class="user-tag">
            <text class="user-tag-text">{{ user.username }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全区域占位 -->
    <view class="footer-spacer"></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { uploadMomentImagesApi, createMomentApi } from '@/api/index.js'
import {config} from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'

// 页面状态
const pageReady = ref(false)

// 文本内容
const postContent = ref('')

// 图片列表
const imageList = ref([])
const uploading = ref(false)
const publishing = ref(false)

// 位置信息
const location = ref({
  name: '',
  latitude: null,
  longitude: null
})

// 提醒的好友
const remindUsers = ref([])

// 可见性
const visibilityOptions = [
  { value: 'public', label: () => t('publish.public') },
  { value: 'friends', label: () => t('publish.friendsOnly') },
  { value: 'partial', label: () => t('publish.partial') },
  { value: 'private', label: () => t('publish.private') }
]
const visibility = ref('public')

// 可见用户列表
const visibleUsers = ref([])

// 计算可见性标签
const visibilityLabel = computed(() => {
  const option = visibilityOptions.find(v => v.value === visibility.value)
  return option ? option.label() : t('publish.public')
})

// 页面加载
onLoad((options) => {
  if (options && options.id) {
    // 编辑模式
    loadMoment(options.id)
  }

  // 监听从选择好友页面返回的事件
  uni.$on('onFriendSelected', (data) => {
    if (data.mode === 'remind') {
      remindUsers.value = data.users
    } else if (data.mode === 'visible') {
      visibleUsers.value = data.users
    }
  })
})

onUnload(() => {
  uni.$off('onFriendSelected')
})

// 加载动态数据
async function loadMoment(id) {
  // TODO: 从 API 获取动态详情
  console.log('加载动态', id)
}

// 取消
const onCancel = () => {
  if (postContent.value.trim() || imageList.value.length > 0) {
    uni.showModal({
      title: t('publish.notice'),
      content: t('publish.discard'),
      cancelText: t('common.cancel'),
      confirmText: t('common.confirm'),
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}
function getFullImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return config.baseURL + path
}
// 发表
const onPublish = async () => {
  if (publishing.value) return

  // 验证内容
  if (!postContent.value.trim() && imageList.value.length === 0) {
    uni.showToast({ title: t('publish.contentRequired'), icon: 'none' })
    return
  }

  publishing.value = true

  try {
    const payload = {
      content: postContent.value.trim(),
      images: imageList.value.map(img => img.url)
    }

    // 添加位置信息
    if (location.value.latitude && location.value.longitude) {
      payload.locationName = location.value.name
      payload.locationLat = location.value.latitude
      payload.locationLng = location.value.longitude
    }

    // 添加可见性
    payload.visibility = visibility.value

    // 添加部分可见好友
    if (visibility.value === 'partial' && visibleUsers.value.length > 0) {
      payload.visibleUserIds = visibleUsers.value.map(u => u.id)
    }

    // 添加提醒好友
    if (remindUsers.value.length > 0) {
      payload.remindUserIds = remindUsers.value.map(u => u.id)
    }

    const res = await createMomentApi(payload)
    console.log('发布成功', res)

    uni.showToast({ title: t('publish.publishSuccess'), icon: 'success' })

    // 返回上一页并刷新列表
    setTimeout(() => {
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage) {
        prevPage.onRefresh && prevPage.onRefresh()
      }
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('发布失败', e)
    uni.showToast({ title: t('publish.publishFailed'), icon: 'none' })
  } finally {
    publishing.value = false
  }
}

// 添加图片
const addImages = () => {
  const remainCount = 9 - imageList.value.length
  if (remainCount <= 0) {
    uni.showToast({ title: t('publish.imageLimit'), icon: 'none' })
    return
  }

  uni.chooseImage({
    count: remainCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePaths = res.tempFilePaths
      if (tempFilePaths.length === 0) return

      uploading.value = true

      try {
        // 先显示本地预览
        const newImages = tempFilePaths.map(path => ({
          url: path,
          uploading: true
        }))
        imageList.value = [...imageList.value, ...newImages]

        // 上传到服务器
        const uploadedUrls = await uploadMomentImagesApi(tempFilePaths)

        // 更新已上传的图片 URL
        let urlIndex = 0
        imageList.value = imageList.value.map(img => {
          if (img.uploading && urlIndex < uploadedUrls.length) {
            const url = uploadedUrls[urlIndex]
            urlIndex++
            return { url, uploading: false }
          }
          return img
        })

        uni.showToast({ title: t('publish.uploadSuccess'), icon: 'success' })
      } catch (e) {
        console.error('上传失败', e)
        // 移除上传失败的图片
        imageList.value = imageList.value.filter(img => !img.uploading)
        uni.showToast({ title: t('publish.uploadFailed'), icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}

// 删除图片
const deleteImage = (index) => {
  uni.showModal({
    title: t('publish.notice'),
    content: t('publish.deleteImage'),
    cancelText: t('common.cancel'),
    confirmText: t('common.confirm'),
    success: (res) => {
      if (res.confirm) {
        imageList.value.splice(index, 1)
      }
    }
  })
}

// 预览图片
const previewImage = (index) => {
  const urls = imageList.value.map(img => img.url)
  uni.previewImage({
    urls,
    current: index
  })
}

// 选择位置
const selectLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      console.log('选择的位置', res)
      location.value = {
        name: res.name || res.address,
        latitude: res.latitude,
        longitude: res.longitude
      }
    },
    fail: (err) => {
      console.log('选择位置失败', err)
      // 如果用户拒绝了定位权限，给提示
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        uni.showToast({ title: t('publish.locationPermission'), icon: 'none' })
      }
    }
  })
}

// 提醒谁看
const selectRemind = () => {
  // 跳转到好友选择页面
  uni.navigateTo({
    url: '/pages/my/friendSelect/friendSelect?mode=remind&selected=' + JSON.stringify(remindUsers.value.map(u => u.id))
  })
}

// 选择可见性
const selectVisibility = () => {
  uni.showActionSheet({
    itemList: visibilityOptions.map(v => v.label()),
    success: (res) => {
      const selected = visibilityOptions[res.tapIndex]
      visibility.value = selected.value

      // 如果选择部分可见，跳转到好友选择
      if (selected.value === 'partial') {
        setTimeout(() => {
          selectVisibleUsers()
        }, 300)
      }
    }
  })
}

// 选择可见的好友
const selectVisibleUsers = () => {
  uni.navigateTo({
    url: '/pages/my/friendSelect/friendSelect?mode=visible&selected=' + JSON.stringify(visibleUsers.value.map(u => u.id))
  })
}

onUnload(() => {
  uni.$off('onFriendSelected')
})
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #FFFFFF;
}

.status-bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: #FFFFFF;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 30rpx;
  height: 90rpx;
  background-color: #FFFFFF;
}

.cancel-btn {
  font-size: 32rpx;
  color: #000000;
}

.publish-btn {
  background-color: #fff6df;
  color: #333333;
  border-radius: 8rpx;
  padding: 12rpx 36rpx;
  display: flex;
  justify-content: center;
  align-items: center;

  &.disabled {
    background-color: #e6dcc4;
  }
}

.publish-text {
  font-size: 28rpx;
  font-weight: 500;
}

.content-wrapper {
  padding: 30rpx;
  flex: 1;
}

.textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 32rpx;
  line-height: 1.6;
  color: #000000;
  margin-bottom: 40rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  width: calc((100vw - 100rpx) / 3);
  height: calc((100vw - 100rpx) / 3);
  background-color: #F8F8F8;
  border-radius: 4rpx;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  &.uploaded {
    image {
      width: 100%;
      height: 100%;
    }
  }

  &.add-btn {
    border: 2rpx solid #EEEEEE;
  }
}

.delete-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 44rpx;
  height: 44rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.delete-icon {
  font-size: 32rpx;
  color: #FFFFFF;
  line-height: 1;
}

.plus-icon {
  font-size: 80rpx;
  color: #AAAAAA;
  line-height: 1;
}

.upload-progress {
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  text-align: center;
}

.progress-text {
  font-size: 28rpx;
  color: #888888;
}

.settings-list {
  padding: 0 30rpx;
  margin-top: 40rpx;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 35rpx 0;
  border-bottom: 1rpx solid #EEEEEE;

  &:last-child {
    border-bottom: none;
  }
}

.item-left {
  display: flex;
  align-items: center;
}

.item-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 25rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #000000;

  &.location-icon { font-size: 38rpx; }
  &.at-icon { font-size: 38rpx; font-weight: bold; }
  &.people-icon { font-size: 36rpx; }
}

.item-title {
  font-size: 32rpx;
  color: #000000;
}

.item-right {
  display: flex;
  align-items: center;
}

.item-value {
  font-size: 30rpx;
  color: #888888;
  margin-right: 12rpx;
  max-width: 300rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-right {
  width: 16rpx;
  height: 16rpx;
  border-top: 2rpx solid #CCCCCC;
  border-right: 2rpx solid #CCCCCC;
  transform: rotate(45deg);
}

.visible-users-list {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #EEEEEE;
}

.visible-users-label {
  font-size: 28rpx;
  color: #888888;
  margin-bottom: 15rpx;
  display: block;
}

.visible-user-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.user-tag {
  background-color: #f0f0f0;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.user-tag-text {
  font-size: 26rpx;
  color: #333333;
}

.footer-spacer {
  height: calc(50rpx + var(--safe-area-inset-bottom));
}
</style>
