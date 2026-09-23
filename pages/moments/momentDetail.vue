<template>
  <view class="page app-h5-screen">
    <view class="detail-nav" :style="navStyle">
      <view class="nav-frost" />
      <view class="nav-fade" :style="{ opacity: fadeProgress }" />
      <view class="nav-row" :style="{ minHeight: `${layout.rowHeight}px` }">
        <view :style="{ width: `${layout.backRailWidth}px`, flexShrink: 0 }"><GlassCircleButton :label="t('profile.back')" @tap="goBack"><view class="back-chevron" /></GlassCircleButton></view>
        <text class="nav-title" :style="{ width: `${layout.titleWidth}px` }">{{ t('moment.detailTitle') }}</text><view :style="{ width: `${layout.actionRailWidth}px`, flexShrink: 0 }" />
      </view>
    </view>
    <scroll-view class="content app-h5-scroll" scroll-y :scroll-into-view="commentAnchor" @scroll="onScroll" @scrolltolower="loadMoreComments">
      <view :style="{ height: `${navHeight}px` }" />
      <view v-if="loading" class="loading">{{ t('moment.loading') }}</view>
      <template v-else-if="moment">
        <view class="author"><image v-if="author.avatarUrl" class="avatar" :src="author.avatarUrl" mode="aspectFill" /><view v-else class="avatar fallback">{{ author.name.slice(0, 1) }}</view><view class="author-copy"><text class="name">{{ author.name }}</text><text class="time">{{ formatTime(moment.created_at) }}</text></view></view>
        <view class="moment-card">
        <swiper v-if="images.length" class="image-swiper" :style="{ height: `${imageHeight}px` }" :current="currentImageIndex" @change="currentImageIndex = $event.detail.current" :indicator-dots="images.length > 1"><swiper-item v-for="image in images" :key="image" class="image-slide"><image class="detail-image" :src="image" mode="widthFix" @load="onImageLoad(image, $event)" @tap="previewImage(image)" /></swiper-item></swiper>
        <view v-if="images.length > 1" class="image-count">{{ currentImageIndex + 1 }}/{{ images.length }}</view>
        <view class="body"><text v-if="moment.activity" class="activity-topic" @tap="openActivity">{{ moment.activity.topic }}</text><text class="text">{{ momentBody }}</text><text v-if="moment.location_name" class="location">📍 {{ moment.location_name }}</text></view>
        </view>
        <view id="moment-comments" class="comments-card">
        <view class="section-title">{{ t('moment.comments', { count: moment.comment_count || 0 }) }}</view>
        <view v-for="comment in comments" :key="comment.id" class="comment">
          <image v-if="comment.author_avatar_url" class="comment-avatar" :src="comment.author_avatar_url" mode="aspectFill" />
          <view v-else class="comment-avatar comment-avatar-fallback">{{ commentInitial(comment) }}</view>
          <view class="comment-copy">
            <view class="comment-meta"><text class="comment-name">{{ comment.author_name || t('moment.user') }}</text><text v-if="Number(comment.user_id) === Number(moment.user_id)" class="author-tag">{{ t('moment.author') }}</text></view>
            <text class="comment-text">{{ comment.reply_to_name ? t('moment.replyTo', { name: comment.reply_to_name }) : '' }}{{ comment.content }}</text>
            <view class="comment-actions"><text class="comment-time">{{ formatMinuteTime(comment.created_at) }}</text><text class="reply-link" @tap.stop="replyTo(comment)">{{ t('moment.reply') }}</text></view>
            <view v-for="reply in comment.replies" :key="reply.id" class="reply-row">
              <image v-if="reply.author_avatar_url" class="comment-avatar reply-avatar" :src="reply.author_avatar_url" mode="aspectFill" />
              <view v-else class="comment-avatar reply-avatar comment-avatar-fallback">{{ commentInitial(reply) }}</view>
              <view class="comment-copy"><view class="comment-meta"><text class="comment-name">{{ reply.author_name || t('moment.user') }}</text><text v-if="Number(reply.user_id) === Number(moment.user_id)" class="author-tag">{{ t('moment.author') }}</text></view><text class="comment-text"><text v-if="reply.reply_to_name">{{ t('moment.replyTo', { name: reply.reply_to_name }) }}</text>{{ reply.content }}</text><view class="comment-actions"><text class="comment-time">{{ formatMinuteTime(reply.created_at) }}</text><text class="reply-link" @tap.stop="replyTo(reply)">{{ t('moment.reply') }}</text></view></view>
            </view>
            <text v-if="comment.reply_count > comment.replies.length" class="expand-replies" @tap.stop="expandReplies(comment)">{{ t('moment.expandReplies', { count: comment.reply_count - comment.replies.length }) }}</text>
            <text v-else-if="comment.repliesExpanded && comment.reply_count" class="expand-replies" @tap.stop="collapseReplies(comment)">{{ t('moment.collapseReplies') }}</text>
          </view>
        </view>
        <view v-if="!comments.length" class="empty">{{ t('moment.noComments') }}</view>
        <view v-else-if="loadingMoreComments" class="more-status">{{ t('moment.loading') }}</view><view v-else-if="!hasMoreComments" class="more-status">{{ t('moment.noMoreComments') }}</view>
        </view>
      </template>
      <view class="comments-bottom-space" aria-hidden="true" />
    </scroll-view>
    <view v-if="replyTarget" class="replying">{{ t('moment.replyTo', { name: replyTarget.authorName }) }}<text @tap="replyTarget = null">{{ t('moment.cancel') }}</text></view>
    <view class="bottom-bar"><view class="composer-field"><input v-model="commentDraft" class="comment-input" :placeholder="replyTarget ? t('moment.replyTo', { name: replyTarget.authorName }) : t('moment.saySomething')" confirm-type="send" @confirm="submitComment" /><button class="send" :disabled="sending || !commentDraft.trim() || !moment" :aria-label="t('moment.send')" @tap="submitComment"><view class="send-arrow" /></button></view><button class="like" :disabled="liking || !moment" :aria-label="t('momentsHub.likeAction')" :aria-pressed="!!moment?.is_liked" @tap="toggleLike"><uni-icons :type="moment?.is_liked ? 'heart-filled' : 'heart'" size="25" :color="moment?.is_liked ? 'var(--bless-primary, #C2A052)' : '#7e8677'" /><text>{{ moment?.like_count || 0 }}</text></button></view>
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onLoad, onResize, onShow } from '@dcloudio/uni-app'
import GlassCircleButton from '@/components/chat/GlassCircleButton.vue'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import { addCommentApi, getCommentsApi, getMomentCommentRepliesApi, getMomentDetailApi, toggleLikeMomentApi } from '@/api/index.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const moment = ref(null); const comments = ref([]); const loading = ref(true); const commentDraft = ref(''); const currentImageIndex = ref(0); const replyTarget = ref(null); const commentsPage = ref(1); const hasMoreComments = ref(false); const loadingMoreComments = ref(false)
const momentBody = computed(() => {
 const text = String(moment.value?.content || ''), topic = moment.value?.activity?.topic
 return topic && text.startsWith(topic + '\n') ? text.slice(topic.length + 1) : text
})
function openActivity() { const slug = moment.value?.activity?.slug; if (slug) uni.navigateTo({url:'/pages/activity/detail?id='+encodeURIComponent(slug)}) }
const sending = ref(false), liking = ref(false), scrollTop = ref(0)
const commentAnchor = ref('')
let platformOverride = ''
// #ifdef MP-WEIXIN
platformOverride = 'mp-weixin'
// #endif
const layout = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, platformOverride))
function refreshLayout() { layout.value = readChatHeaderGeometry(uni, { clearCapsule: false }, platformOverride) }
onMounted(refreshLayout); onResize(refreshLayout); onShow(refreshLayout)
const navHeight = computed(() => layout.value.contentTop + layout.value.rowHeight + 12)
const navStyle = computed(() => ({ paddingTop: `${layout.value.contentTop}px`, paddingLeft: `${layout.value.contentLeft}px`, paddingRight: `${layout.value.contentRight}px` }))
const fadeProgress = computed(() => Math.min(1, scrollTop.value / 40))
function onScroll(event) { scrollTop.value = Math.max(0, Number(event.detail.scrollTop) || 0) }
function goBack() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/notice/notice' }) }) }
const author = computed(() => moment.value?.author || { name: t('moment.user'), avatarUrl: '' })
const images = computed(() => moment.value?.images || [])
const imageRatios = ref({})
const imageHeight = computed(() => Math.round((layout.value.width - 32) * (imageRatios.value[images.value[currentImageIndex.value]] || 0.75)))
function onImageLoad(src, event) { const { width, height } = event.detail || {}; if (width > 0 && height > 0) imageRatios.value = { ...imageRatios.value, [src]: height / width } }
function formatMinuteTime(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = number => String(number).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` }
function formatTime(value) { return formatMinuteTime(value) }
function commentInitial(comment) { return String(comment.author_name || t('moment.user')).slice(0, 1).toUpperCase() }
function previewImage(current) { uni.previewImage({ urls: images.value, current }) }
function replyTo(comment) { replyTarget.value = { id: comment.id, authorName: comment.author_name || t('moment.user') } }
async function loadComments(reset = true) { if (!moment.value || loadingMoreComments.value) return; if (reset) { commentsPage.value = 1; hasMoreComments.value = true; comments.value = [] } if (!hasMoreComments.value) return; loadingMoreComments.value = true; try { const commentData = await getCommentsApi(moment.value.id, { page: commentsPage.value, pageSize: 20 }); const nextComments = commentData?.comments || []; comments.value = reset ? nextComments : [...comments.value, ...nextComments]; hasMoreComments.value = !!commentData?.hasMore; commentsPage.value += 1 } finally { loadingMoreComments.value = false } }
async function loadMoreComments() { await loadComments(false) }
async function expandReplies(comment) { const data = await getMomentCommentRepliesApi(moment.value.id, comment.id, { page: 1, pageSize: 50 }); const index = comments.value.findIndex(item => String(item.id) === String(comment.id)); if (index >= 0) comments.value.splice(index, 1, { ...comment, replies: data?.replies || [], repliesExpanded: true }) }
function collapseReplies(comment) { const index = comments.value.findIndex(item => String(item.id) === String(comment.id)); if (index >= 0) comments.value.splice(index, 1, { ...comment, replies: (comment.replies || []).slice(0, 3), repliesExpanded: false }) }
async function load(id) { try { const detail = await getMomentDetailApi(id); moment.value = detail?.moment || null; await loadComments() } catch (error) { uni.showToast({ title: error?.error || t('moment.loadFailed'), icon: 'none' }) } finally { loading.value = false } }
async function toggleLike() { if (!moment.value || liking.value) return; liking.value = true; try { const result = await toggleLikeMomentApi(moment.value.id); moment.value.is_liked = result.isLiked; moment.value.like_count = result.likeCount } catch { uni.showToast({ title: t('life.actionFailed'), icon: 'none' }) } finally { liking.value = false } }
async function submitComment() { const content = commentDraft.value.trim(); if (!content || !moment.value || sending.value) return; sending.value = true; const replyToCommentId = replyTarget.value?.id; try { await addCommentApi(moment.value.id, content, undefined, replyToCommentId); moment.value.comment_count = Number(moment.value.comment_count || 0) + 1; commentDraft.value = ''; replyTarget.value = null; await loadComments(true) } catch (error) { uni.showToast({ title: error?.error || t('moment.commentFailed'), icon: 'none' }) } finally { sending.value = false } }
onLoad(async options => { uni.setNavigationBarTitle({ title: t('moment.detailTitle') }); await load(options.id); if (options.openComments === '1') { await nextTick(); commentAnchor.value = 'moment-comments' } })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('moment.detailTitle') }))
</script>

<style scoped>
.page{display:flex;flex-direction:column;background:#fff}.content{flex:1;min-height:0}.loading,.empty,.more-status{padding:80rpx 30rpx;color:#999;text-align:center}.more-status{padding:20rpx 30rpx;font-size:23rpx}.author{display:flex;align-items:center;padding:28rpx 30rpx}.avatar{width:76rpx;height:76rpx;border-radius:50%;background:#eee}.fallback{display:flex;align-items:center;justify-content:center;color:#fff;background:#bbb}.author-copy{display:flex;flex-direction:column;margin-left:18rpx}.name{font-size:32rpx;font-weight:600}.time,.comment-time{margin-top:6rpx;color:#999;font-size:22rpx}.image-swiper{width:100%;height:760rpx;background:#111}.detail-image{width:100%;height:100%}.image-count{margin:-54rpx 28rpx 20rpx auto;padding:6rpx 16rpx;width:max-content;border-radius:22rpx;color:#fff;background:rgba(0,0,0,.5);font-size:22rpx;position:relative}.body{padding:28rpx 32rpx}.text{display:block;color:#222;font-size:32rpx;line-height:1.55;white-space:pre-wrap}.location{display:block;margin-top:18rpx;color:#777;font-size:25rpx}.section-title{padding:26rpx 32rpx;border-top:14rpx solid #f6f6f6;color:#222;font-size:30rpx;font-weight:600}.comment{display:flex;gap:18rpx;padding:0 32rpx 28rpx}.comment-avatar{width:64rpx;height:64rpx;flex:0 0 64rpx;border-radius:50%;background:#eee}.comment-avatar-fallback{display:flex;align-items:center;justify-content:center;color:#fff;background:#b7b7b7;font-size:25rpx}.comment-copy{display:flex;min-width:0;flex:1;flex-direction:column}.comment-meta{display:flex;align-items:center;min-width:0}.comment-name{overflow:hidden;color:#555;font-size:25rpx;max-width:280rpx;text-overflow:ellipsis;white-space:nowrap}.author-tag{margin-left:10rpx;padding:2rpx 10rpx;border-radius:14rpx;color:#ff536d;background:#fff0f2;font-size:20rpx}.comment-text{margin-top:9rpx;color:#222;font-size:29rpx;line-height:1.45;word-break:break-all}.comment-actions{display:flex;align-items:center;gap:24rpx}.reply-link,.expand-replies{margin-top:6rpx;color:#777;font-size:22rpx}.expand-replies{display:block;margin-top:20rpx;color:#777}.reply-row{display:flex;gap:14rpx;margin-top:24rpx;padding-top:22rpx;border-top:1rpx solid #f2f2f2}.reply-avatar{width:54rpx;height:54rpx;flex-basis:54rpx}.bottom-bar{display:flex;align-items:center;gap:16rpx;padding:18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));border-top:1rpx solid #eee;background:#fff}.replying{display:flex;justify-content:space-between;padding:16rpx 28rpx;color:#666;background:#fafafa;font-size:24rpx}.replying text{color:#999}.comment-input{height:70rpx;min-width:0;flex:1;padding:0 24rpx;border-radius:36rpx;background:#f5f5f5;font-size:27rpx}.send{padding:14rpx 8rpx;color:#4a4a4a;font-size:27rpx;font-weight:600}.like{display:flex;align-items:center;gap:5rpx;color:#333;font-size:25rpx}.heart{font-size:36rpx}
.page{position:relative;background:#f2f1ef;color:#373630;overflow:hidden;}
.content{height:0;flex:1;min-height:0;}
.detail-nav{position:absolute;top:0;left:0;right:0;z-index:20;padding-bottom:12px;box-sizing:border-box;}
.nav-row{position:relative;z-index:2;display:flex;align-items:center;}
.nav-title{flex:none;min-width:0;text-align:center;font-size:19px;font-weight:650;line-height:1.4;overflow-wrap:anywhere;}
.nav-balance{width:44px;flex:none;}
.back-chevron{width:12px;height:12px;border-left:2px solid #292825;border-bottom:2px solid #292825;transform:translateX(3px) rotate(45deg);}
.nav-frost{position:absolute;inset:0;background:rgba(242,241,239,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);pointer-events:none;}
.nav-fade{position:absolute;top:100%;left:0;right:0;height:38px;pointer-events:none;background:linear-gradient(to bottom,rgba(242,241,239,.94),rgba(242,241,239,0));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);mask-image:linear-gradient(to bottom,#000,transparent);-webkit-mask-image:linear-gradient(to bottom,#000,transparent);transition:opacity 120ms linear;}
.author{padding:20px 20px 16px;}.author-copy{min-width:0;}.name{color:#373630;overflow-wrap:anywhere;}.time,.comment-time{color:#a5a49f;}
.moment-card{margin:0 16px 12px;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 3px 14px rgba(55,50,40,.035);}
.comments-card{margin:0 16px 20px;padding-bottom:8px;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 3px 14px rgba(55,50,40,.035);}
.image-swiper{width:100%;margin:0;border-radius:20px;overflow:hidden;background:#fff;}.image-slide{border-radius:20px;overflow:hidden;}.detail-image{display:block;width:100%;height:auto;border-radius:20px;}
.body{padding:18px 20px 26px;}.text{color:#373630;}.section-title{border:0;padding:22px 20px;font-size:18px;}
.comment{padding:0 20px 26px;gap:12px;}.comment-name{color:#696963;}.comment-text{color:#373630;line-height:1.65;word-break:normal;overflow-wrap:anywhere;}.comment-actions{flex-wrap:wrap;column-gap:14px;row-gap:0;}.reply-link{display:inline-flex;align-items:center;min-height:32px;margin-top:0;color:#96968f;}.reply-row{border:0;margin-top:18px;padding-top:0;gap:10px;}.expand-replies{align-self:flex-start;display:flex;align-items:center;min-height:40px;margin-top:10px;color:var(--bless-text, #775E25);}.comment-avatar-fallback{background:#e3e1dc;color:#96968e;}
.bottom-bar{position:relative;z-index:21;flex:none;border:0;gap:12px;padding:10px 16px calc(12px + env(safe-area-inset-bottom));background:#f2f1ef;}
.comments-bottom-space{height:12px;flex:none;}
.composer-field{display:flex;align-items:center;gap:6px;flex:1;min-width:0;padding:5px 6px 5px 16px;background:rgba(255,255,255,.85);border-radius:28px;}
.comment-input{height:38px;min-width:0;padding:0;background:transparent;font-size:14px;}
.send{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;padding:0;margin:0;border-radius:50%;background:var(--bless-primary, #C2A052);}.send[disabled]{background:var(--bless-soft, #F1E4BD);opacity:.75;}.send::after,.like::after{border:0;}
.send-arrow{position:relative;width:2px;height:17px;background:#fff;border-radius:2px;}.send-arrow::before{content:'';position:absolute;top:0;left:-4px;width:8px;height:8px;border-top:2px solid #fff;border-left:2px solid #fff;transform:rotate(45deg);border-radius:1px;}
.like{display:flex;align-items:center;justify-content:center;gap:5px;min-width:44px;min-height:44px;padding:0;margin:0;background:transparent;color:#55554f;font-size:13px;}.like[disabled]{background:transparent;}
.replying{position:relative;z-index:21;flex:none;gap:12px;background:#f2f1ef;color:#8e8e87;}.replying text{flex:none;padding:0 4px;}
@media(prefers-reduced-motion:reduce){.nav-fade{transition:none;}}
/* #ifndef H5 */
.page{position:fixed;top:0;right:0;bottom:0;left:0;height:100%;min-height:0;}
/* #endif */
.activity-topic{display:block;color:#a58544;font-weight:600;font-size:16px;line-height:1.7;margin-bottom:10px;overflow-wrap:anywhere}
</style>
