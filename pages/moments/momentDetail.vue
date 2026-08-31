<template>
  <view class="page app-h5-screen">
    <scroll-view class="content app-h5-scroll" scroll-y @scrolltolower="loadMoreComments">
      <view v-if="loading" class="loading">{{ t('moment.loading') }}</view>
      <template v-else-if="moment">
        <view class="author"><image v-if="author.avatarUrl" class="avatar" :src="author.avatarUrl" mode="aspectFill" /><view v-else class="avatar fallback">{{ author.name.slice(0, 1) }}</view><view class="author-copy"><text class="name">{{ author.name }}</text><text class="time">{{ formatTime(moment.created_at) }}</text></view></view>
        <swiper v-if="images.length" class="image-swiper" :current="currentImageIndex" @change="currentImageIndex = $event.detail.current" indicator-dots><swiper-item v-for="image in images" :key="image"><image class="detail-image" :src="image" mode="aspectFit" @tap="previewImage(image)" /></swiper-item></swiper>
        <view v-if="images.length > 1" class="image-count">{{ currentImageIndex + 1 }}/{{ images.length }}</view>
        <view class="body"><text class="text">{{ moment.content }}</text><text v-if="moment.location_name" class="location">📍 {{ moment.location_name }}</text></view>
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
      </template>
    </scroll-view>
    <view v-if="replyTarget" class="replying">{{ t('moment.replyTo', { name: replyTarget.authorName }) }}<text @tap="replyTarget = null">{{ t('moment.cancel') }}</text></view>
    <view class="bottom-bar"><input v-model="commentDraft" class="comment-input" :placeholder="replyTarget ? t('moment.replyTo', { name: replyTarget.authorName }) : t('moment.saySomething')" confirm-type="send" @confirm="submitComment" /><view class="send" @tap="submitComment">{{ t('moment.send') }}</view><view class="like" @tap="toggleLike"><text class="heart">{{ moment?.is_liked ? '❤️' : '🤍' }}</text><text>{{ moment?.like_count || 0 }}</text></view></view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addCommentApi, getCommentsApi, getMomentCommentRepliesApi, getMomentDetailApi, toggleLikeMomentApi } from '@/api/index.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const moment = ref(null); const comments = ref([]); const loading = ref(true); const commentDraft = ref(''); const currentImageIndex = ref(0); const replyTarget = ref(null); const commentsPage = ref(1); const hasMoreComments = ref(false); const loadingMoreComments = ref(false)
const author = computed(() => moment.value?.author || { name: t('moment.user'), avatarUrl: '' })
const images = computed(() => moment.value?.images || [])
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
async function toggleLike() { if (!moment.value) return; const result = await toggleLikeMomentApi(moment.value.id); moment.value.is_liked = result.isLiked; moment.value.like_count = result.likeCount }
async function submitComment() { const content = commentDraft.value.trim(); if (!content || !moment.value) return; const replyToCommentId = replyTarget.value?.id; try { await addCommentApi(moment.value.id, content, undefined, replyToCommentId); moment.value.comment_count = Number(moment.value.comment_count || 0) + 1; commentDraft.value = ''; replyTarget.value = null; await loadComments(true) } catch (error) { uni.showToast({ title: error?.error || t('moment.commentFailed'), icon: 'none' }) } }
onLoad(options => { uni.setNavigationBarTitle({ title: t('moment.detailTitle') }); load(options.id) })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('moment.detailTitle') }))
</script>

<style scoped>
.page{display:flex;flex-direction:column;background:#fff}.content{flex:1;min-height:0}.loading,.empty,.more-status{padding:80rpx 30rpx;color:#999;text-align:center}.more-status{padding:20rpx 30rpx;font-size:23rpx}.author{display:flex;align-items:center;padding:28rpx 30rpx}.avatar{width:76rpx;height:76rpx;border-radius:50%;background:#eee}.fallback{display:flex;align-items:center;justify-content:center;color:#fff;background:#bbb}.author-copy{display:flex;flex-direction:column;margin-left:18rpx}.name{font-size:32rpx;font-weight:600}.time,.comment-time{margin-top:6rpx;color:#999;font-size:22rpx}.image-swiper{width:100%;height:760rpx;background:#111}.detail-image{width:100%;height:100%}.image-count{margin:-54rpx 28rpx 20rpx auto;padding:6rpx 16rpx;width:max-content;border-radius:22rpx;color:#fff;background:rgba(0,0,0,.5);font-size:22rpx;position:relative}.body{padding:28rpx 32rpx}.text{display:block;color:#222;font-size:32rpx;line-height:1.55;white-space:pre-wrap}.location{display:block;margin-top:18rpx;color:#777;font-size:25rpx}.section-title{padding:26rpx 32rpx;border-top:14rpx solid #f6f6f6;color:#222;font-size:30rpx;font-weight:600}.comment{display:flex;gap:18rpx;padding:0 32rpx 28rpx}.comment-avatar{width:64rpx;height:64rpx;flex:0 0 64rpx;border-radius:50%;background:#eee}.comment-avatar-fallback{display:flex;align-items:center;justify-content:center;color:#fff;background:#b7b7b7;font-size:25rpx}.comment-copy{display:flex;min-width:0;flex:1;flex-direction:column}.comment-meta{display:flex;align-items:center;min-width:0}.comment-name{overflow:hidden;color:#555;font-size:25rpx;max-width:280rpx;text-overflow:ellipsis;white-space:nowrap}.author-tag{margin-left:10rpx;padding:2rpx 10rpx;border-radius:14rpx;color:#ff536d;background:#fff0f2;font-size:20rpx}.comment-text{margin-top:9rpx;color:#222;font-size:29rpx;line-height:1.45;word-break:break-all}.comment-actions{display:flex;align-items:center;gap:24rpx}.reply-link,.expand-replies{margin-top:6rpx;color:#777;font-size:22rpx}.expand-replies{display:block;margin-top:20rpx;color:#777}.reply-row{display:flex;gap:14rpx;margin-top:24rpx;padding-top:22rpx;border-top:1rpx solid #f2f2f2}.reply-avatar{width:54rpx;height:54rpx;flex-basis:54rpx}.bottom-bar{display:flex;align-items:center;gap:16rpx;padding:18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));border-top:1rpx solid #eee;background:#fff}.replying{display:flex;justify-content:space-between;padding:16rpx 28rpx;color:#666;background:#fafafa;font-size:24rpx}.replying text{color:#999}.comment-input{height:70rpx;min-width:0;flex:1;padding:0 24rpx;border-radius:36rpx;background:#f5f5f5;font-size:27rpx}.send{padding:14rpx 8rpx;color:#4a4a4a;font-size:27rpx;font-weight:600}.like{display:flex;align-items:center;gap:5rpx;color:#333;font-size:25rpx}.heart{font-size:36rpx}
/* #ifndef H5 */
.page{height:100vh}
/* #endif */
</style>
