<template>
  <view class="page"><view class="title">{{ title }}</view><view v-if="loading" class="state">加载中...</view><view v-else-if="!posts.length" class="state">暂无{{ title }}内容</view><view v-else class="waterfall"><view class="column"><view v-for="post in leftPosts" :key="post.id" class="card" @click="openFeed(post.id)"><image v-if="imageOf(post)" class="cover" :src="imageOf(post)" mode="widthFix"/><view v-else class="empty-cover">暂无图片</view><view class="card-body"><text class="post-title">{{ post.title }}</text><text class="price">¥ {{ post.price }}</text><view class="foot"><text>{{ post.author_name || '用户' }}</text><text>♡ {{ post.likeCount || 0 }}</text></view></view></view></view><view class="column"><view v-for="post in rightPosts" :key="post.id" class="card" @click="openFeed(post.id)"><image v-if="imageOf(post)" class="cover" :src="imageOf(post)" mode="widthFix"/><view v-else class="empty-cover">暂无图片</view><view class="card-body"><text class="post-title">{{ post.title }}</text><text class="price">¥ {{ post.price }}</text><view class="foot"><text>{{ post.author_name || '用户' }}</text><text>♡ {{ post.likeCount || 0 }}</text></view></view></view></view></view></view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMarketPostsApi } from '@/api/market.js'
import { marketFeedRoute } from '@/utils/marketNavigation.js'
const category=ref('antique'),posts=ref([]),loading=ref(true)
const title=computed(()=>category.value==='antique'?'古董':'二手市场')
const leftPosts=computed(()=>posts.value.filter((_,index)=>index%2===0)),rightPosts=computed(()=>posts.value.filter((_,index)=>index%2===1))
function imageOf(post){return Array.isArray(post.images)?post.images.find(Boolean)||'':''}
async function load(){loading.value=true;try{const data=await getMarketPostsApi({category:category.value});posts.value=data?.posts||[]}catch(error){uni.showToast({title:'加载失败',icon:'none'})}finally{loading.value=false}}
onLoad(options=>{if(options.category==='second_hand')category.value='second_hand'});onShow(load)
function openFeed(id){uni.navigateTo({url:marketFeedRoute(category.value,id)})}
</script>
<style scoped lang="scss">.page{min-height:100vh;background:#f6f6f6;padding:20rpx 16rpx}.title{padding:12rpx 12rpx 24rpx;font-size:38rpx;font-weight:700}.state{padding:160rpx 0;text-align:center;color:#999}.waterfall{display:flex;align-items:flex-start;gap:16rpx}.column{width:calc(50% - 8rpx)}.card{overflow:hidden;margin-bottom:16rpx;border-radius:16rpx;background:#fff}.cover{display:block;width:100%;min-height:200rpx;background:#eee}.empty-cover{display:flex;height:260rpx;align-items:center;justify-content:center;background:#eee;color:#999}.card-body{padding:18rpx}.post-title{display:block;color:#222;font-size:28rpx;font-weight:600;line-height:1.4}.price{display:block;margin-top:10rpx;color:#dc5b3f;font-size:28rpx;font-weight:700}.foot{display:flex;justify-content:space-between;margin-top:14rpx;color:#999;font-size:21rpx}</style>
