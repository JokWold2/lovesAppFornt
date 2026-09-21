<template>
  <ChatSheet :open="visible" :label="title || t('group.selectMembers')" :busy="busy" @dismiss="close" @after-close="emit('after-close')">
    <view class="member-sheet">
      <view class="handle" />
      <view class="sheet-header"><text class="sheet-title">{{ title || t('group.selectMembers') }}</text><button class="sheet-close" :disabled="busy" :aria-label="t('chatDesign.close')" @tap="close">×</button></view>
      <text v-if="!showReviewFields" class="sheet-subtitle">{{ t('chatDesign.inviteTo') }}</text>
      <view v-if="showReviewFields" class="review-fields">
        <input v-model="groupName" class="search-input" maxlength="60" :placeholder="t('profile.groupName')" />
        <textarea v-model="reviewMessage" class="review-message" :placeholder="t('profile.reviewReply')" />
      </view>
      <input v-model="keyword" class="search-input" :placeholder="t('profile.searchName')" @input="searchMembers" />
      <scroll-view scroll-y class="member-list" @scrolltolower="loadNextPage">
        <view v-for="member in candidates" :key="member.userId" class="member-row" role="checkbox" :aria-label="member.displayName" :aria-checked="selectedIds.includes(member.userId)" @tap="toggleMember(member.userId)">
          <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="member-avatar member-avatar--fallback">{{ member.displayName.slice(0, 1) }}</view>
          <view class="member-info"><text class="member-name">{{ member.displayName }}</text><text v-if="member.country" class="member-meta">{{ member.country }}</text></view>
          <view class="member-check" :class="{ selected: selectedIds.includes(member.userId) }"><view v-if="selectedIds.includes(member.userId)" class="check-tick" /></view>
        </view>
        <view v-if="loading" class="empty">{{ t('inbox.loading') }}</view>
        <view v-else-if="failed" class="empty"><text>{{ t('profile.searchFailed') }}</text><button class="retry-button" @tap="loadCandidates(failedAppend)">{{ t('chatDesign.retry') }}</button></view>
        <view v-else-if="!candidates.length" class="empty">{{ t('profile.noMembers') }}</view>
        <button v-else-if="hasMore" class="retry-button" @tap="loadNextPage">{{ t('search.loadMore') }}</button>
      </scroll-view>
      <view class="sheet-actions"><text>{{ t('profile.selected', { count: selectedIds.length }) }}</text><button class="confirm-button" :loading="busy" :disabled="busy || (!showReviewFields && !selectedIds.length)" @tap="confirm">{{ showReviewFields ? t('profile.confirm') : t('chatDesign.confirmInvite', { count: selectedIds.length }) }}</button></view>
    </view>
  </ChatSheet>
</template>
<script setup>
import { ref, watch } from 'vue'
import { getChatRequestCandidatesApi } from '@/api/chat.js'
import ChatSheet from './ChatSheet.vue'
import { t } from '@/utils/localeRuntime.js'
const props = defineProps({ visible: Boolean, title: { type: String, default: '' }, showReviewFields: Boolean, excludedUserIds: { type: Array, default: () => [] }, busy: Boolean })
const emit = defineEmits(['close', 'confirm', 'after-close'])
const keyword = ref(''), candidates = ref([]), selectedIds = ref([]), loading = ref(false), failed = ref(false), failedAppend = ref(false)
const groupName = ref('沟通群聊'), reviewMessage = ref(''), page = ref(0), hasMore = ref(false)
let requestVersion = 0
function displayName(item) { return [item.native_first_name, item.en_first_name, item.native_last_name, item.en_last_name, item.display_name].find(name => typeof name === 'string' && name.trim())?.trim() || t('profile.user') }
function searchMembers() { page.value = 0; candidates.value = []; hasMore.value = false; void loadCandidates(false) }
async function loadCandidates(append) {
  if (!props.visible || (append && (loading.value || !hasMore.value))) return
  const version = ++requestVersion, nextPage = append ? page.value + 1 : 1
  loading.value = true; failed.value = false; failedAppend.value = append
  try {
    const data = await getChatRequestCandidatesApi({ keyword: keyword.value, page: nextPage, pageSize: 20 })
    if (version !== requestVersion || !props.visible) return
    const excluded = new Set(props.excludedUserIds.map(Number))
    const incoming = (data?.candidates || []).map(item => ({ userId: Number(item.user_id), displayName: displayName(item), avatarUrl: item.avatar_url || '', country: item.country || '' })).filter(item => item.userId && !excluded.has(item.userId))
    candidates.value = Array.from(new Map((append ? [...candidates.value, ...incoming] : incoming).map(item => [item.userId, item])).values())
    page.value = nextPage; hasMore.value = !!data?.hasMore
  } catch (_) { if (version === requestVersion) failed.value = true }
  finally { if (version === requestVersion) loading.value = false }
}
function loadNextPage() { return loadCandidates(true) }
function toggleMember(id) { if (!props.busy) selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter(value => value !== id) : [...selectedIds.value, id] }
function close() { if (!props.busy) emit('close') }
function confirm() {
  if (props.busy || (!props.showReviewFields && !selectedIds.value.length)) return
  emit('confirm', props.showReviewFields ? { memberIds: [...selectedIds.value], name: groupName.value.trim() || '沟通群聊', reviewMessage: reviewMessage.value.trim() } : [...selectedIds.value])
}
watch(() => props.excludedUserIds, ids => {
  const excluded = new Set(ids.map(Number))
  candidates.value = candidates.value.filter(item => !excluded.has(item.userId)); selectedIds.value = selectedIds.value.filter(id => !excluded.has(id))
})
watch(() => props.visible, visible => {
  if (!visible) { requestVersion++; loading.value = false; return }
  keyword.value = ''; selectedIds.value = []; groupName.value = '沟通群聊'; reviewMessage.value = ''; searchMembers()
}, { immediate: true })
</script>
<style scoped>
.member-sheet{display:flex;height:78vh;max-height:calc(100vh - 80px);flex-direction:column;min-height:0;padding:10px 20px calc(16px + env(safe-area-inset-bottom));background:#f5f4f1;box-sizing:border-box;color:#292825;}
.handle{flex:none;width:34px;height:4px;border-radius:4px;margin:0 auto 16px;background:#d3d0c9;}.sheet-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;}.sheet-title{font-size:21px;font-weight:650;line-height:1.4;}.sheet-close{margin:0;flex:0 0 44px;width:44px;height:44px;padding:0;border-radius:50%;font-size:28px;line-height:44px;color:#807b73;background:#ebe9e4;}.sheet-close::after,.confirm-button::after,.retry-button::after{border:0;}.sheet-subtitle{display:block;margin:6px 0 18px;color:#918d85;font-size:13px;line-height:1.5;}
.search-input{flex:none;height:44px;min-height:44px;padding:0 16px;border-radius:16px;background:#eae8e3;font-size:14px;box-sizing:border-box;}.review-fields{display:flex;flex-direction:column;gap:10px;margin:12px 0;}.review-message{width:100%;height:76px;box-sizing:border-box;padding:12px;background:#eae8e3;border-radius:16px;font-size:14px;}
.member-list{flex:1;height:0;min-height:0;margin:12px 0;background:#fff;border-radius:22px;}.member-row{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #f1f0ed;box-sizing:border-box;}.member-row:last-child{border-bottom:0;}.member-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:50%;}.member-avatar--fallback{display:flex;align-items:center;justify-content:center;color:var(--bless-text, #775E25);background:var(--bless-soft, #F1E4BD);}.member-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;}.member-name{color:#292825;font-size:15px;overflow-wrap:anywhere;}.member-meta{color:#918d85;font-size:12px;}.member-check{display:flex;align-items:center;justify-content:center;flex:0 0 23px;width:23px;height:23px;border:1.5px solid #d8d5ce;border-radius:8px;box-sizing:border-box;}.member-check.selected{background:var(--bless-primary, #C2A052);border-color:var(--bless-primary, #C2A052);}.check-tick{width:10px;height:6px;border-bottom:2.5px solid #fff;border-left:2.5px solid #fff;transform:translateY(-1px) rotate(-45deg);}
.empty{padding:35px 16px;text-align:center;color:#918d85;font-size:13px;line-height:1.6;}.retry-button{margin:10px auto;background:#f3f1ec;border-radius:20px;font-size:13px;width:fit-content;}.sheet-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;flex:none;font-size:13px;color:#918d85;}.confirm-button{margin:0;padding:0 20px;min-height:46px;line-height:46px;border-radius:24px;background:var(--bless-primary, #C2A052);color:#292825;font-size:15px;font-weight:600;}.confirm-button[disabled]{background:var(--bless-soft, #F1E4BD);color:#a39a7e;}
/* #ifdef H5 */
.member-sheet{max-height:calc(var(--app-viewport-height,100dvh) - 60px);}
/* #endif */
</style>
