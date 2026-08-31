<template>
  <view v-if="visible" class="sheet-mask" @tap="close">
    <view class="member-sheet" @tap.stop>
      <view class="sheet-header">
        <text class="sheet-title">{{ title || t('group.selectMembers') }}</text>
        <text class="sheet-close" @click="close">×</text>
      </view>
      <view v-if="showReviewFields" class="review-fields">
        <input v-model="groupName" class="search-input" :placeholder="t('profile.groupName')" />
        <textarea v-model="reviewMessage" class="review-message" :placeholder="t('profile.reviewReply')" @tap.stop />
      </view>
      <input v-model="keyword" class="search-input" :placeholder="t('profile.searchName')" @tap.stop @input="searchMembers" />
      <scroll-view scroll-y class="member-list" @tap.stop @scrolltolower="loadNextPage">
        <view v-for="member in candidates" :key="member.userId" class="member-row" @click="toggleMember(member.userId)">
          <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="member-avatar member-avatar--fallback">{{ member.displayName.slice(0, 1) }}</view>
          <view class="member-info">
            <text class="member-name">{{ member.displayName }}</text>
            <text v-if="member.country" class="member-meta">{{ member.country }}</text>
          </view>
          <text class="member-check">{{ selectedIds.includes(member.userId) ? '☑' : '□' }}</text>
        </view>
        <view v-if="!loading && !candidates.length" class="empty">{{ t('profile.noMembers') }}</view>
      </scroll-view>
      <view class="sheet-actions">
        <text>{{ t('profile.selected', { count: selectedIds.length }) }}</text>
        <button class="confirm-button" @click="confirm">{{ t('profile.confirm') }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';
import { getChatRequestCandidatesApi } from '@/api/chat.js';
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
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
const page = ref(1);
const hasMore = ref(false);

function displayName(item) {
  return item.native_first_name || item.en_first_name || item.native_last_name || item.en_last_name || item.display_name || t('profile.user');
}

async function searchMembers() {
  page.value = 1;
  candidates.value = [];
  await loadCandidates(false);
}

async function loadCandidates(append) {
  if (loading.value || (append && !hasMore.value)) return;
  const version = ++requestVersion;
  loading.value = true;
  try {
    const data = await getChatRequestCandidatesApi({ keyword: keyword.value, page: page.value, pageSize: 20 });
    if (version !== requestVersion) return;
    const excluded = new Set(props.excludedUserIds.map(Number));
    const incoming = (data?.candidates || [])
      .map(item => ({
        userId: Number(item.user_id),
        displayName: displayName(item),
        avatarUrl: item.avatar_url || '',
        country: item.country || ''
      }))
      .filter(item => item.userId && !excluded.has(item.userId));
    const merged = append ? [...candidates.value, ...incoming] : incoming;
    candidates.value = Array.from(new Map(merged.map(item => [item.userId, item])).values());
    hasMore.value = !!data?.hasMore;
  } catch (error) {
    if (version === requestVersion) {
      candidates.value = [];
      uni.showToast({ title: error?.error || t('profile.searchFailed'), icon: 'none' });
    }
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

async function loadNextPage() { if (!hasMore.value || loading.value) return; page.value += 1; await loadCandidates(true); }

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
  page.value = 1;
  hasMore.value = false;
  searchMembers();
}, { immediate: true });
</script>

<style scoped lang="scss">
.sheet-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; background: rgba(0, 0, 0, .45); }
.member-sheet { display: flex; width: 100%; height: 76vh; box-sizing: border-box; flex-direction: column; padding: 28rpx; border-radius: 28rpx 28rpx 0 0; background: #fff; }
.sheet-header, .sheet-actions, .member-row { display: flex; align-items: center; }
.sheet-header { justify-content: space-between; margin-bottom: 22rpx; }
.sheet-title { font-size: 34rpx; font-weight: 700; }
.sheet-close { padding: 0 12rpx; font-size: 48rpx; color: #999; }
.search-input { padding: 18rpx; border-radius: 12rpx; background: #f4f4f4; }
.review-fields { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 16rpx; }
.review-message { display: block; width: 100%; min-height: 96rpx; padding: 18rpx; box-sizing: border-box; border-radius: 12rpx; background: #f4f4f4; }
.member-list { min-height: 0; flex: 1; }
.member-row { gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid #eee; }
.member-avatar { width: 72rpx; height: 72rpx; flex: 0 0 72rpx; border-radius: 50%; overflow: hidden; }
.member-avatar--fallback { display: flex; align-items: center; justify-content: center; color: #775900; background: #fff0b2; }
.member-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.member-name { font-size: 30rpx; color: #333; }
.member-meta, .empty { font-size: 24rpx; color: #999; }
.member-check { color: #ffb900; font-size: 38rpx; }
.empty { padding: 60rpx 0; text-align: center; }
.sheet-actions { flex: 0 0 auto; justify-content: space-between; padding-top: 20rpx; }
.confirm-button { margin: 0; color: #333; background: #ffce00; }
</style>
