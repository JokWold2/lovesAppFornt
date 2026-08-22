<template>
	<view class="market-feed-page">
		<swiper class="feed" vertical :current="current" @change="current = $event.detail.current">
			<swiper-item v-for="post in posts" :key="post.id">
				<view class="item">
					<swiper class="photos" circular>
						<swiper-item v-for="src in post.images" :key="src">
							<image class="photo" :src="src" mode="aspectFit" @click="onPhotoTap(post)" />
						</swiper-item>
						<swiper-item v-if="!post.images?.length"><view class="empty-photo">暂无图片</view></swiper-item>
					</swiper>
					<view class="meta">
						<text class="name">{{ post.title }}</text><text>¥ {{ post.price }}</text>
						<view><text @click="like(post)">{{ post.isLiked ? '♥' : '♡' }} {{ post.likeCount }}</text><text class="comment" @click="openComments(post)">评论 {{ post.commentCount }}</text></view>
					</view>
					<view class="actions">
						<view class="action" @click="like(post)"><text class="action-icon">{{ post.isLiked ? '♥' : '♡' }}</text><text>{{ post.likeCount }}</text></view>
						<view class="action" @click="openComments(post)"><image class="action-icon comment-icon" src="/static/img/icon-comment.png" mode="aspectFit" /><text>{{ post.commentCount }}</text></view>
					</view>
				</view>
			</swiper-item>
		</swiper>

		<view v-if="commentPost" class="mask" @tap="closeComments">
			<view class="panel" @tap.stop>
				<view class="panel-head"><text>评论 {{ commentPost.commentCount }}</text><text class="close-button" @tap.stop="closeComments">×</text></view>
				<scroll-view scroll-y class="comment-list" :scroll-into-view="commentAnchor" @tap.stop>
					<view v-for="floor in comments" :id="`comment-${floor.id}`" :key="floor.id" class="comment-floor">
						<view class="comment-row">
							<image class="comment-avatar" :src="floor.author_avatar_url || defaultAvatar" mode="aspectFill" />
							<view class="comment-content">
								<text class="author">{{ floor.author_name || '用户' }}</text><text class="comment-text">{{ floor.content }}</text>
								<view class="comment-meta"><text>{{ formatCommentTime(floor.created_at) }}</text><text class="reply-link" @tap.stop="replyTo(floor)">回复</text></view>
							</view>
						</view>
						<view v-if="floor.replies?.length" class="reply-list">
							<view v-for="reply in floor.replies" :id="`comment-${reply.id}`" :key="reply.id" class="comment-row reply-row">
								<image class="comment-avatar reply-avatar" :src="reply.author_avatar_url || defaultAvatar" mode="aspectFill" />
								<view class="comment-content">
									<text class="author">{{ reply.author_name || '用户' }}</text>
									<view class="comment-text"><text v-if="reply.reply_to_name" class="reply-prefix">回复 @{{ reply.reply_to_name }}：</text><text>{{ reply.content }}</text></view>
									<view class="comment-meta"><text>{{ formatCommentTime(reply.created_at) }}</text><text class="reply-link" @tap.stop="replyTo(reply)">回复</text></view>
								</view>
							</view>
						</view>
						<text v-if="floor.reply_count > floor.replies.length" class="expand-replies" @tap.stop="expandReplies(floor)">—— 展开 {{ floor.reply_count - floor.replies.length }} 条回复 ˅</text>
						<text v-else-if="floor.repliesExpanded && floor.reply_count" class="expanded-replies">—— 已展开全部 {{ floor.reply_count }} 条回复</text>
					</view>
					<view v-if="!comments.length" class="empty">还没有评论，来说第一句吧</view>
				</scroll-view>
				<view v-if="replyTarget" class="replying" @tap.stop>回复 @{{ replyTarget.authorName }} <text @click="replyTarget = null">取消</text></view>
				<view class="input" @tap.stop><input v-model="commentText" :placeholder="replyTarget ? `回复 ${replyTarget.authorName}` : '说点什么…'" confirm-type="send" @confirm="sendComment" /><text @click="sendComment">发送</text></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addMarketCommentApi, getMarketCommentRepliesApi, getMarketCommentsApi, getMarketPostsApi, toggleMarketLikeApi } from '@/api/market.js'
import { appendReplies, formatCommentTime } from '@/utils/marketComments.js'

const posts = ref([])
const current = ref(0)
const commentPost = ref(null)
const commentText = ref('')
const comments = ref([])
const commentAnchor = ref('')
const replyTarget = ref(null)
const defaultAvatar = '/static/logo.png'
let lastTap = 0
let requestedCommentId = ''

onLoad(async (options) => {
	const data = await getMarketPostsApi({ category: options.category })
	posts.value = data?.posts || []
	current.value = Math.max(0, posts.value.findIndex((post) => String(post.id) === String(options.postId)))
	requestedCommentId = options.commentId || ''
	if (options.openComments === '1' && posts.value[current.value]) openComments(posts.value[current.value])
})

async function like(post) {
	const previous = { isLiked: post.isLiked, likeCount: post.likeCount }
	post.isLiked = !previous.isLiked
	post.likeCount += post.isLiked ? 1 : -1
	try { Object.assign(post, await toggleMarketLikeApi(post.id)) } catch (_) { Object.assign(post, previous) }
}

function onPhotoTap(post) {
	const now = Date.now()
	if (now - lastTap < 280) like(post)
	lastTap = now
}

async function openComments(post) {
	commentPost.value = post
	replyTarget.value = null
	commentText.value = ''
	try {
		const data = await getMarketCommentsApi(post.id, requestedCommentId ? { targetCommentId: requestedCommentId } : undefined)
		comments.value = data?.comments || []
		if (requestedCommentId) await locateRequestedComment(data?.targetRootCommentId)
	} catch (error) { uni.showToast({ title: error?.error || '评论加载失败', icon: 'none' }) }
}

async function locateRequestedComment(rootCommentId) {
	const floor = comments.value.find((item) => String(item.id) === String(rootCommentId))
	if (floor && String(floor.id) !== String(requestedCommentId)) await expandReplies(floor)
	commentAnchor.value = ''
	setTimeout(() => { commentAnchor.value = `comment-${requestedCommentId}` }, 80)
}

function closeComments() {
	commentPost.value = null
	commentAnchor.value = ''
	replyTarget.value = null
}

function replyTo(comment) { replyTarget.value = { id: comment.id, authorName: comment.author_name || '用户' } }

async function expandReplies(floor) {
	try {
		const data = await getMarketCommentRepliesApi(commentPost.value.id, floor.id, { page: 1, pageSize: 50 })
		const index = comments.value.findIndex((item) => String(item.id) === String(floor.id))
		if (index >= 0) comments.value.splice(index, 1, appendReplies(comments.value[index], data?.replies || []))
	} catch (error) { uni.showToast({ title: error?.error || '回复加载失败', icon: 'none' }) }
}

async function sendComment() {
	const content = commentText.value.trim()
	if (!content) return
	try {
		const data = await addMarketCommentApi(commentPost.value.id, { content, replyToCommentId: replyTarget.value?.id || null })
		commentPost.value.commentCount++
		commentText.value = ''
		replyTarget.value = null
		const rootCommentId = data?.comment?.rootCommentId
		await openComments(commentPost.value)
		if (rootCommentId && String(rootCommentId) !== String(data?.comment?.id)) {
			const floor = comments.value.find((item) => String(item.id) === String(rootCommentId))
			if (floor) await expandReplies(floor)
		}
	} catch (error) { uni.showToast({ title: error?.error || '评论发送失败', icon: 'none' }) }
}
</script>

<style scoped>
.market-feed-page, .feed { height: 100vh; background: #111; }
.item { position: relative; display: flex; height: 100vh; flex-direction: column; }
.photos { height: 76vh; }
.photo, .empty-photo { width: 100%; height: 100%; }
.empty-photo { display: flex; align-items: center; justify-content: center; color: #999; }
.meta { display: flex; flex-direction: column; gap: 18rpx; padding: 28rpx; color: #fff; }
.name { font-size: 38rpx; font-weight: 700; }
.comment { margin-left: 36rpx; }
.actions { position: absolute; right: 24rpx; bottom: 210rpx; display: flex; flex-direction: column; gap: 32rpx; color: #fff; text-align: center; }
.action { display: flex; flex-direction: column; align-items: center; font-size: 22rpx; text-shadow: 0 1rpx 4rpx #000; }
.action-icon { margin-bottom: 6rpx; font-size: 62rpx; line-height: 1; }.comment-icon { width: 62rpx; height: 62rpx; }
.mask { position: fixed; z-index: 10; inset: 0; display: flex; align-items: flex-end; background: rgba(0, 0, 0, .35); }
.panel { display: flex; width: 100%; height: 60vh; min-height: 60vh; box-sizing: border-box; flex-direction: column; padding: 24rpx; border-radius: 28rpx 28rpx 0 0; background: #fff; }
.panel-head, .input { display: flex; align-items: center; justify-content: space-between; }
.close-button { padding: 0 12rpx; font-size: 38rpx; color: #555; }
.comment-list { min-height: 0; flex: 1; margin: 22rpx 0 10rpx; }
.comment-floor { padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.comment-row { display: flex; gap: 18rpx; padding: 12rpx 0; }
.comment-avatar { width: 70rpx; height: 70rpx; flex: 0 0 70rpx; border-radius: 50%; background: #eee; }
.comment-content { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8rpx; }
.author { font-size: 25rpx; color: #8e8e93; }
.comment-text { font-size: 29rpx; line-height: 1.5; color: #202124; word-break: break-all; }
.comment-meta { display: flex; align-items: center; gap: 34rpx; font-size: 23rpx; color: #9a9a9f; }
.reply-link { color: #73737a; }
.reply-list { margin: 12rpx 0 0 88rpx; }
.reply-row { padding: 14rpx 0; }
.reply-avatar { width: 54rpx; height: 54rpx; flex-basis: 54rpx; }
.reply-prefix { color: #6f6f76; }
.expand-replies, .expanded-replies { display: block; margin: 18rpx 0 0 88rpx; font-size: 24rpx; color: #777780; }
.replying { padding: 12rpx 0; font-size: 24rpx; color: #63636b; }
.replying text { margin-left: 18rpx; color: #999; }
.empty { padding: 46rpx 0; text-align: center; color: #999; }
.input { gap: 20rpx; margin-top: auto; padding: 18rpx 0 16rpx; padding-bottom: env(safe-area-inset-bottom); border-top: 1rpx solid #ededed; }
.input input { min-height: 48rpx; flex: 1; padding: 16rpx 20rpx; border-radius: 28rpx; background: #f5f5f6; }
</style>
