<template>
  <view class="page"><view class="title">{{ title }}</view><view v-if="!posts.length" class="empty">暂无{{ title }}内容</view><view v-for="post in posts" :key="post.id" class="card" @click="openFeed(post.id)"><image class="cover" :src="post.images?.[0]" mode="aspectFill"/><view class="info"><text>{{ post.title }}</text><text class="price">¥ {{ post.price }}</text></view></view></view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMarketPostsApi } from '@/api/market.js'
const category = ref('antique'); const posts = ref([])
const title = computed(() => category.value === 'antique' ? '古董' : '二手市场')
onLoad(o => { if (o.category === 'second_hand') category.value = 'second_hand' })
onShow(async () => { const data = await getMarketPostsApi({ category: category.value }); posts.value = data?.posts || [] })
function openFeed(id) { uni.navigateTo({ url: `/pages/market/marketFeed?category=${category.value}&postId=${id}` }) }
</script>
<style scoped>.page{min-height:100vh;background:#fff6df;padding:24rpx}.title{font-size:38rpx;font-weight:700;margin:12rpx 0 24rpx}.card{display:flex;background:#fff;border-radius:18rpx;margin-bottom:20rpx;overflow:hidden}.cover{width:220rpx;height:170rpx;background:#eee}.info{padding:22rpx;display:flex;flex-direction:column;gap:20rpx}.price{color:#e84b35;font-size:32rpx;font-weight:700}.empty{text-align:center;padding:100rpx;color:#999}</style>
