<template><view class="page"><scroll-view class="messages" scroll-y><view v-for="m in messages" :key="m.id" class="message" :class="{mine:m.sender_user_id===myId}"><text>{{ m.sender_name }}：{{ m.content }}</text></view></scroll-view><view class="input"><input v-model="draft" confirm-type="send" @confirm="send" placeholder="输入消息"/><text @click="send">发送</text></view></view></template>
<script setup>
import { ref } from 'vue'; import { onLoad, onShow } from '@dcloudio/uni-app'; import { getChatMessagesApi, sendChatMessageApi } from '@/api/chat.js';
const groupId=ref(''), messages=ref([]), draft=ref(''); const myId=Number(uni.getStorageSync('USER_INFO')?.id)
async function load(){if(!groupId.value)return;try{const d=await getChatMessagesApi(groupId.value);messages.value=d?.messages||[]}catch(e){uni.showToast({title:e?.error||'无权访问群聊',icon:'none'})}}
onLoad(o=>{groupId.value=o.id;load()});onShow(load)
async function send(){const content=draft.value.trim();if(!content)return;try{const d=await sendChatMessageApi(groupId.value,content);messages.value.push(d.message);draft.value=''}catch(e){uni.showToast({title:e?.error||'发送失败',icon:'none'})}}
</script>
<style scoped>.page{height:100vh;background:#f6f6f6;display:flex;flex-direction:column}.messages{flex:1;padding:24rpx}.message{max-width:80%;margin:14rpx 0;padding:18rpx;background:#fff;border-radius:14rpx}.mine{margin-left:auto;background:#ffce00}.input{display:flex;gap:18rpx;padding:20rpx;background:#fff}.input input{flex:1;background:#f3f3f3;border-radius:10rpx;padding:14rpx}</style>
