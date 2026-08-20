<template>
  <view class="page">
    <view v-if="isGroupAdmin" class="group-tools"><text class="add-member" @click="pickerVisible = true">＋ 拉成员</text></view>
    <scroll-view class="messages" scroll-y><view v-for="message in messages" :key="message.id" class="message" :class="{ mine: message.sender_user_id === myId }"><text>{{ message.sender_name }}：{{ message.content }}</text></view></scroll-view>
    <view class="input-bar"><input v-model="draft" confirm-type="send" @confirm="send" placeholder="输入消息" /><text @click="send">发送</text></view>
    <MemberPickerSheet :visible="pickerVisible" title="选择要拉入群聊的成员" @close="pickerVisible = false" @confirm="addMembers" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { addChatMemberApi, getChatGroupsApi, getChatMessagesApi, sendChatMessageApi } from '@/api/chat.js';
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue';

const groupId = ref('');
const messages = ref([]);
const draft = ref('');
const pickerVisible = ref(false);
const isGroupAdmin = ref(false);
const myId = Number(uni.getStorageSync('USER_INFO')?.id);

async function load() {
  if (!groupId.value) return;
  try {
    const [messageData, groupData] = await Promise.all([getChatMessagesApi(groupId.value), getChatGroupsApi()]);
    messages.value = messageData?.messages || [];
    const group = (groupData?.groups || []).find(item => Number(item.id) === Number(groupId.value));
    isGroupAdmin.value = group?.role === 'admin';
  } catch (error) {
    uni.showToast({ title: error?.error || '无权访问群聊', icon: 'none' });
  }
}

onLoad(options => { groupId.value = options.id; load(); });
onShow(load);

async function send() {
  const content = draft.value.trim();
  if (!content) return;
  try {
    const data = await sendChatMessageApi(groupId.value, content);
    messages.value.push(data.message);
    draft.value = '';
  } catch (error) {
    uni.showToast({ title: error?.error || '发送失败', icon: 'none' });
  }
}

async function addMembers(memberIds) {
  if (!memberIds.length) { pickerVisible.value = false; return; }
  try {
    await Promise.all(memberIds.map(userId => addChatMemberApi(groupId.value, userId)));
    pickerVisible.value = false;
    uni.showToast({ title: '成员已加入', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: error?.error || '添加成员失败', icon: 'none' });
  }
}
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; background: #f6f6f6; }
.group-tools { padding: 18rpx 24rpx; text-align: right; background: #fff; }
.add-member { padding: 10rpx 18rpx; border-radius: 12rpx; color: #333; background: #ffce00; }
.messages { flex: 1; padding: 24rpx; }
.message { max-width: 80%; margin: 14rpx 0; padding: 18rpx; border-radius: 14rpx; background: #fff; }
.mine { margin-left: auto; background: #ffce00; }
.input-bar { display: flex; gap: 18rpx; padding: 20rpx; background: #fff; }
.input-bar input { flex: 1; padding: 14rpx; border-radius: 10rpx; background: #f3f3f3; }
</style>
