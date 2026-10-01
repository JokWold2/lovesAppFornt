<template>
  <view class="page app-h5-min-screen">
    <ChatPageHeader :title="t('groupExit.reviewTitle')" glass :scroll-top="scrollTop" />
    <view class="page-content">
      <view v-if="loading && !loaded" class="page-state"><view class="state-mark">✦</view><text>{{ t('home.loading') }}</text></view>
      <view v-else-if="loadError" class="page-state" role="alert"><view class="state-mark muted-mark">!</view><text>{{ loadError }}</text><button class="retry-button" @tap="load">{{ t('groupExit.retry') }}</button></view>
      <template v-else>
        <text v-if="groupName" class="group-name">{{ groupName }}</text>
        <view class="heading-row"><text class="section-title">{{ t('groupExit.pendingHeading') }}</text><text class="count-pill">{{ t('groupExit.approvalCount', { count: requests.length }) }}</text></view>
        <view v-if="lastResult" class="result-note" role="status"><view class="result-mark">✓</view><text>{{ lastResult }}</text></view>
        <view v-if="!requests.length" class="empty-card"><view class="empty-mark">✦</view><text class="empty-title">{{ t('groupExit.emptyTitle') }}</text><text class="empty-copy">{{ t('groupExit.emptyContent') }}</text></view>
        <view v-for="request in requests" :key="request.id" class="request-card">
          <view class="person-row">
            <image v-if="request.applicantAvatarUrl" class="avatar" :src="request.applicantAvatarUrl" mode="aspectFill" />
            <view v-else class="avatar fallback">{{ personName(request).slice(0, 1) }}</view>
            <view class="person-copy"><text class="person-name">{{ personName(request) }}</text><text class="request-time">{{ t('groupExit.appliedAt', { time: formatTime(request.createdAt) }) }}</text></view>
          </view>
          <view class="reason-box"><text>{{ request.reason || t('groupExit.noReason') }}</text></view>
          <view class="review-actions">
            <button class="review-button reject" :disabled="processingId !== null" @tap="decide(request, 'reject')">{{ t('groupExit.reject') }}</button>
            <button class="review-button approve" :loading="processingId === request.id" :disabled="processingId !== null" @tap="decide(request, 'approve')">{{ t('groupExit.approve') }}</button>
          </view>
        </view>
        <text class="review-note">{{ t('groupExit.reviewInfo') }}</text>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onPageScroll, onShow } from '@dcloudio/uni-app'
import { approveChatGroupExitRequestApi, getChatGroupDetailApi, getChatGroupExitRequestsApi, rejectChatGroupExitRequestApi } from '@/api/chat.js'
import ChatPageHeader from '@/components/chat/ChatPageHeader.vue'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const groupId = ref(''), groupName = ref(''), requests = ref([])
const loading = ref(false), loaded = ref(false), loadError = ref(''), processingId = ref(null), lastResult = ref(''), scrollTop = ref(0)
const myUserId = () => Number(uni.getStorageSync('USER_INFO')?.id)
const personName = request => String(request?.applicantName || '').trim() || t('groupExit.applicantFallback')

function formatTime(value) {
  const date = new Date(typeof value === 'string' ? value.replace(' ', 'T') : value)
  if (Number.isNaN(date.getTime())) return ''
  const locale = ({ 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en-US', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR' })[currentLocale.value] || 'en-US'
  const pad = number => String(number).padStart(2, '0')
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return `${new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)} ${clock}`
    }
  } catch (_) { /* Older mini-program runtimes use the numeric fallback below. */ }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`
}

async function load() {
  if (loading.value || processingId.value !== null) return
  loading.value = true
  loadError.value = ''
  try {
    if (!groupId.value) throw new Error('missing-group')
    const [detail, data] = await Promise.all([getChatGroupDetailApi(groupId.value, { silent: true }), getChatGroupExitRequestsApi(groupId.value)])
    if (detail?.group?.canManage !== true || detail.group.status !== 'active') {
      requests.value = []
      loadError.value = t('groupExit.noPermission')
      return
    }
    groupName.value = presentGroupName(detail.group.name)
    requests.value = (data?.requests || []).filter(request => request.status === 'pending' && Number(request.applicantUserId) !== myUserId())
    loaded.value = true
  } catch (error) {
    loadError.value = error?.statusCode === 403 ? t('groupExit.noPermission') : t('groupExit.reviewLoadFailed')
  } finally { loading.value = false }
}

async function decide(request, action) {
  if (processingId.value !== null || !request?.id) return
  processingId.value = request.id
  try {
    if (action === 'approve') await approveChatGroupExitRequestApi(groupId.value, request.id)
    else await rejectChatGroupExitRequestApi(groupId.value, request.id)
    requests.value = requests.value.filter(item => item.id !== request.id)
    lastResult.value = t(action === 'approve' ? 'groupExit.approveDone' : 'groupExit.rejectDone')
  } catch (error) {
    const stale = error?.statusCode === 404 || error?.statusCode === 409
    const lostAccess = error?.statusCode === 403
    uni.showToast({ title: t(lostAccess ? 'groupExit.noPermission' : stale ? 'groupExit.requestChanged' : 'groupExit.reviewFailed'), icon: 'none' })
    if (stale || lostAccess) {
      processingId.value = null
      await load()
      return
    }
  } finally { processingId.value = null }
}

onLoad(options => { groupId.value = options.id || '' })
onShow(() => { load() })
onPageScroll(event => { scrollTop.value = event?.scrollTop || 0 })
</script>

<style scoped>
.page{min-height:100vh;box-sizing:border-box;background:#eeedeb;color:#292825}
.page-content{padding:4px 20px calc(32px + env(safe-area-inset-bottom));box-sizing:border-box}
button{margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:14px;line-height:1.4;box-sizing:border-box}button::after{border:0}button:active{opacity:.8}button[disabled]{opacity:.5}
.group-name{display:block;margin:2px 2px 18px;color:#918d85;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
.heading-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 13px}.section-title{min-width:0;font-size:21px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}.count-pill{flex-shrink:0;padding:6px 10px;border-radius:14px;background:#f1e4bd;color:#775e25;font-size:11px;font-weight:700;line-height:1.35}
.request-card{padding:17px;margin-bottom:11px;border-radius:22px;background:#fff;box-sizing:border-box}.person-row{display:flex;align-items:center;gap:11px;min-width:0}.avatar{width:46px;height:46px;border-radius:50%;flex-shrink:0}.fallback{display:flex;align-items:center;justify-content:center;background:#ead9cd;color:#6b4e43;font-size:18px;font-weight:600}.person-copy{display:flex;flex-direction:column;gap:5px;min-width:0}.person-name{font-size:15px;font-weight:650;overflow-wrap:anywhere}.request-time{color:#918d85;font-size:11px;line-height:1.45;overflow-wrap:anywhere}.reason-box{min-height:42px;margin:16px 0 2px;padding:12px 13px;border-radius:14px;background:#f8f6f2;color:#625d55;font-size:13px;line-height:1.55;box-sizing:border-box;overflow-wrap:anywhere}.review-actions{display:flex;gap:9px;margin-top:15px}.review-button{display:flex;align-items:center;justify-content:center;flex:1;min-width:0;min-height:48px;padding:10px 12px;border-radius:16px;text-align:center;font-size:13px;font-weight:650;white-space:normal;overflow-wrap:anywhere;transition-property:transform,background-color;transition-duration:140ms;transition-timing-function:cubic-bezier(.23,1,.32,1)}.review-button:active{transform:scale(.97)}.review-button.reject{background:#f2efe9;color:#645f57}.review-button.approve{background:#c2a052;color:#292825}
.review-note{display:block;margin:16px 3px 0;color:#918d85;font-size:12px;line-height:1.65;overflow-wrap:anywhere}.result-note{display:flex;align-items:center;gap:10px;padding:13px 14px;margin:0 0 13px;border-radius:16px;background:#f6efd9;color:#775e25;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.result-note>text{min-width:0}.result-mark{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:#e8d9ad;font-weight:700;flex-shrink:0}
.page-state{display:flex;flex-direction:column;align-items:center;gap:16px;padding:88px 14px;text-align:center;color:#918d85;font-size:14px;line-height:1.55}.page-state>text{max-width:100%;overflow-wrap:anywhere}.state-mark,.empty-mark{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:18px;background:#f1e4bd;color:#775e25;font-size:27px}.muted-mark{background:#f2f0ec;color:#918d85}.retry-button{min-height:46px;padding:11px 22px;border-radius:16px;background:#fff;color:#292825;font-weight:600;text-align:center}.empty-card{display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 18px;border-radius:23px;background:#fff;text-align:center}.empty-title{font-size:17px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}.empty-copy{font-size:13px;color:#918d85;line-height:1.5;overflow-wrap:anywhere}
/* #ifdef H5 */
@media(prefers-reduced-motion:reduce){.review-button{transition-duration:0ms}}
/* #endif */
</style>
