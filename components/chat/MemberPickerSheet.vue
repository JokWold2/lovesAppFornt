<template>
  <view v-if="visible" class="sheet-mask" @click.self="close">
    <view class="member-sheet">
      <view class="sheet-header">
        <text class="sheet-title">{{ title }}</text>
        <text class="sheet-close" @click="close">×</text>
      </view>
      <view v-if="showReviewFields" class="review-fields">
        <input v-model="groupName" class="search-input" placeholder="群名称" />
        <textarea v-model="reviewMessage" class="review-message" placeholder="给申请人的审核回复（可选）" />
      </view>
      <input v-model="keyword" class="search-input" placeholder="搜索姓名" @input="searchMembers" />
      <scroll-view scroll-y class="member-list">
        <view v-for="member in candidates" :key="member.userId" class="member-row" @click="toggleMember(member.userId)">
          <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="member-avatar member-avatar--fallback">{{ member.displayName.slice(0, 1) }}</view>
          <view class="member-info">
            <text class="member-name">{{ member.displayName }}</text>
            <text v-if="member.country" class="member-meta">{{ member.country }}</text>
          </view>
          <text class="member-check">{{ selectedIds.includes(member.userId) ? '☑' : '□' }}</text>
        </view>
        <view v-if="!loading && !candidates.length" class="empty">没有找到可选成员</view>
      </scroll-view>
      <view class="sheet-actions">
        <text>已选择 {{ selectedIds.length }} 人</text>
        <button class="confirm-button" @click="confirm">确认</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';
import { searchCandidatesApi } from '@/api/index.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '选择群成员' },
  showReviewFields: { type: Boolean, default: false },
  excludedUserIds: { type: Array, default: () => [] }
});
const emit = defineEmits(['close', 'confirm']);
const keyword = ref('');
const candidates = ref([]);
const selectedIds = ref([]);
const loading = ref(false);
const groupName = ref('沟通群聊');
const reviewMessage = ref('');
let requestVersion = 0;

function displayName(item) {
  return item.native_first_name || item.en_first_name || item.native_last_name || item.en_last_name || '用户';
}

async function searchMembers() {
  const version = ++requestVersion;
  loading.value = true;
  try {
    const data = await searchCandidatesApi({ name: keyword.value, page: 1, pageSize: 30 });
    if (version !== requestVersion) return;
    const excluded = new Set(props.excludedUserIds.map(Number));
    candidates.value = (data?.results || [])
      .map(item => ({
        userId: Number(item.user_id),
        displayName: displayName(item),
        avatarUrl: item.avatar_url || '',
        country: item.country || ''
      }))
      .filter(item => item.userId && !excluded.has(item.userId));
  } catch (error) {
    if (version === requestVersion) {
      candidates.value = [];
      uni.showToast({ title: error?.error || '搜索成员失败', icon: 'none' });
    }
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function toggleMember(userId) {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter(id => id !== userId)
    : [...selectedIds.value, userId];
}

function close() { emit('close'); }
function confirm() {
  emit('confirm', props.showReviewFields
    ? { memberIds: selectedIds.value, name: groupName.value.trim() || '沟通群聊', reviewMessage: reviewMessage.value.trim() }
    : selectedIds.value);
}

watch(() => props.visible, visible => {
  if (!visible) return;
  keyword.value = '';
  selectedIds.value = [];
  groupName.value = '沟通群聊';
  reviewMessage.value = '';
  searchMembers();
});
</script>

<style scoped lang="scss">
.sheet-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; background: rgba(0, 0, 0, .45); }
.member-sheet { width: 100%; max-height: 76vh; box-sizing: border-box; padding: 28rpx; border-radius: 28rpx 28rpx 0 0; background: #fff; }
.sheet-header, .sheet-actions, .member-row { display: flex; align-items: center; }
.sheet-header { justify-content: space-between; margin-bottom: 22rpx; }
.sheet-title { font-size: 34rpx; font-weight: 700; }
.sheet-close { padding: 0 12rpx; font-size: 48rpx; color: #999; }
.search-input { padding: 18rpx; border-radius: 12rpx; background: #f4f4f4; }
.review-fields { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 16rpx; }
.review-message { min-height: 96rpx; padding: 18rpx; box-sizing: border-box; border-radius: 12rpx; background: #f4f4f4; }
.member-list { height: 47vh; }
.member-row { gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid #eee; }
.member-avatar { width: 72rpx; height: 72rpx; flex: 0 0 72rpx; border-radius: 50%; overflow: hidden; }
.member-avatar--fallback { display: flex; align-items: center; justify-content: center; color: #775900; background: #fff0b2; }
.member-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.member-name { font-size: 30rpx; color: #333; }
.member-meta, .empty { font-size: 24rpx; color: #999; }
.member-check { color: #ffb900; font-size: 38rpx; }
.empty { padding: 60rpx 0; text-align: center; }
.sheet-actions { justify-content: space-between; padding-top: 20rpx; }
.confirm-button { margin: 0; color: #333; background: #ffce00; }
</style>
