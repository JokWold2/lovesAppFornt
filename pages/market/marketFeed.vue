<template>
  <swiper class="feed" vertical :current="current" @change="current=$event.detail.current"><swiper-item v-for="post in posts" :key="post.id"><view class="item"><swiper class="photos" circular><swiper-item v-for="src in post.images" :key="src"><image class="photo" :src="src" mode="aspectFit" @click="onPhotoTap(post)"/></swiper-item></swiper><view class="meta"><text class="name">{{ post.title }}</text><text>¥ {{ post.price }}</text><view><text @click="like(post)">{{ post.isLiked ? '♥' : '♡' }} {{ post.likeCount }}</text><text class="comment" @click="openComments(post)">评论 {{ post.commentCount }}</text></view></view></view></swiper-item></swiper>
  <view v-if="commentPost" class="comment-panel"><input v-model="commentText" placeholder="说点什么…" confirm-type="send" @confirm="sendComment"/><text @click="sendComment">发送</text></view>
</template>
<script setup>
import { ref } from 'vue'; import { onLoad } from '@dcloudio/uni-app'; import { addMarketCommentApi, getMarketPostsApi, toggleMarketLikeApi } from '@/api/market.js'
const posts=ref([]), current=ref(0), commentPost=ref(null), commentText=ref(''); let lastTap=0
onLoad(async o=>{ const d=await getMarketPostsApi({category:o.category}); posts.value=d?.posts||[]; current.value=Math.max(0,posts.value.findIndex(p=>String(p.id)===String(o.postId))) })
async function like(post){const old={isLiked:post.isLiked,likeCount:post.likeCount};post.isLiked=!old.isLiked;post.likeCount+=post.isLiked?1:-1;try{Object.assign(post,await toggleMarketLikeApi(post.id))}catch(e){Object.assign(post,old)}}
function onPhotoTap(post){const now=Date.now();if(now-lastTap<280) like(post);lastTap=now}
function openComments(post){commentPost.value=post;commentText.value=''}
async function sendComment(){const text=commentText.value.trim();if(!text)return;const post=commentPost.value;await addMarketCommentApi(post.id,{content:text});post.commentCount++;commentPost.value=null}
</script>
<style scoped>.feed{height:100vh;background:#111}.item{height:100vh;display:flex;flex-direction:column}.photos{height:76vh}.photo{width:100%;height:100%}.meta{color:#fff;padding:28rpx;display:flex;flex-direction:column;gap:18rpx}.name{font-size:38rpx;font-weight:700}.comment{margin-left:36rpx}.comment-panel{position:fixed;bottom:0;left:0;right:0;background:#fff;padding:24rpx;display:flex;gap:20rpx}.comment-panel input{background:#f4f4f4;flex:1;padding:18rpx;border-radius:12rpx}</style>
