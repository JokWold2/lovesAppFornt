<template>
  <view class="market-preview">
    <view class="preview-header" @click="openAll">
      <view><text class="preview-title">{{ title }}</text><text class="preview-subtitle">最新好物</text></view>
      <text class="more">查看全部 ›</text>
    </view>

    <view v-if="loading" class="preview-state">加载中...</view>
    <view v-else-if="!posts.length" class="preview-state">暂时还没有{{ title }}内容</view>
    <scroll-view v-else class="preview-scroll" scroll-x show-scrollbar="false">
      <view class="preview-list">
        <view v-for="post in posts" :key="post.id" class="preview-card" @click="openPost(post.id)">
          <image v-if="firstImage(post.images)" class="preview-image" :src="firstImage(post.images)" mode="aspectFill" />
          <view v-else class="image-placeholder">暂无图片</view>
          <text class="post-title">{{ post.title }}</text>
          <text class="post-price">¥ {{ post.price }}</text>
          <text class="post-stats">♥ {{ post.likeCount || 0 }}　评论 {{ post.commentCount || 0 }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getMarketPostsApi } from '@/api/market.js'
import { marketFeedRoute, marketListRoute } from '@/utils/marketNavigation.js'

const props = defineProps({ category: { type: String, required: true }, title: { type: String, required: true } })
const posts = ref([])
const loading = ref(true)

function firstImage(images) {
  return Array.isArray(images) ? images.find(image => typeof image === 'string' && image) || '' : ''
}
function openAll() { uni.navigateTo({ url: marketListRoute(props.category) }) }
function openPost(postId) { uni.navigateTo({ url: marketFeedRoute(props.category, postId) }) }

onMounted(async () => {
  try {
    const data = await getMarketPostsApi({ category: props.category, pageSize: 3 })
    posts.value = Array.isArray(data?.posts) ? data.posts : []
  } catch (error) {
    console.warn('加载市场预览失败', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.market-preview { margin: 24rpx 28rpx; padding: 24rpx; background: #fff; border-radius: 22rpx; }
.preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.preview-title { display: block; font-size: 34rpx; font-weight: 700; color: #202020; }
.preview-subtitle, .more, .preview-state, .post-stats { color: #999; font-size: 22rpx; }
.more { color: #8f6b16; }
.preview-scroll { width: 100%; white-space: nowrap; }
.preview-list { display: flex; gap: 18rpx; }
.preview-card { width: 220rpx; flex: 0 0 220rpx; overflow: hidden; white-space: normal; }
.preview-image, .image-placeholder { width: 220rpx; height: 180rpx; border-radius: 16rpx; background: #f2ead8; }
.image-placeholder { display: flex; align-items: center; justify-content: center; color: #a99972; font-size: 24rpx; }
.post-title { display: block; margin-top: 12rpx; color: #222; font-size: 26rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-price { display: block; margin-top: 6rpx; color: #cc5737; font-size: 27rpx; font-weight: 700; }
.post-stats { display: block; margin-top: 8rpx; }
.preview-state { padding: 20rpx 0; text-align: center; }
</style>
