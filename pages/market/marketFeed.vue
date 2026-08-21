<template>
	<swiper
		class="feed"
		vertical
		:current="current"
		@change="current = $event.detail.current"
		><swiper-item v-for="post in posts" :key="post.id"
			><view class="item"
				><swiper class="photos" circular
					><swiper-item v-for="src in post.images" :key="src"
						><image
							class="photo"
							:src="src"
							mode="aspectFit"
							@click="onPhotoTap(post)" /></swiper-item
					><swiper-item v-if="!post.images?.length"
						><view class="empty-photo">暂无图片</view></swiper-item
					></swiper
				><view class="meta"
					><text class="name">{{ post.title }}</text
					><text>¥ {{ post.price }}</text
					><view
						><text @click="like(post)"
							>{{ post.isLiked ? "♥" : "♡" }}
							{{ post.likeCount }}</text
						><text class="comment" @click="openComments(post)"
							>评论 {{ post.commentCount }}</text
					></view
					></view
				><view class="actions"
					><view class="action" @click="like(post)"><text class="action-icon">{{ post.isLiked ? '♥' : '♡' }}</text><text>{{ post.likeCount }}</text></view
					><view class="action" @click="openComments(post)"><text class="action-icon">◯</text><text>{{ post.commentCount }}</text></view
				></view
				></view
			></swiper-item
		></swiper
	>
	<view v-if="commentPost" class="mask" @tap="closeComments"
		><view class="panel" @tap.stop
			><view class="panel-head"
				><text>评论 {{ commentPost.commentCount }}</text
				><text @tap="closeComments">×</text></view
			><scroll-view @tap.stop
				scroll-y
				class="comment-list"
				:scroll-into-view="commentAnchor"
				><view
					v-for="comment in comments"
					:id="`comment-${comment.id}`"
					:key="comment.id"
					class="comment-row"
					><view
						><text class="author">{{
							comment.author_name || "用户"
						}}</text
						><text>{{ comment.content }}</text></view
					><text class="reply-link" @click="replyTo(comment)"
						>回复</text
					></view
				><view v-if="!comments.length" class="empty"
					>还没有评论，来说第一句吧</view
				></scroll-view
			><view v-if="replyTarget" class="replying" @tap.stop
				>回复 @{{ replyTarget.authorName }}
				<text @click="replyTarget = null">取消</text></view
			><view class="input" @tap.stop
				><input
					v-model="commentText"
					:placeholder="
						replyTarget
							? `回复 ${replyTarget.authorName}`
							: '说点什么…'
					"
					confirm-type="send"
					@confirm="sendComment"
				/><text @click="sendComment">发送</text></view
			></view
		></view
	>
</template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import {
	addMarketCommentApi,
	getMarketCommentsApi,
	getMarketPostsApi,
	toggleMarketLikeApi,
} from "@/api/market.js";
const posts = ref([]),
	current = ref(0),
	commentPost = ref(null),
	commentText = ref(""),
	comments = ref([]),
	commentAnchor = ref(""),
	replyTarget = ref(null);
let lastTap = 0,
	requestedCommentId = "";
onLoad(async (options) => {
	const data = await getMarketPostsApi({ category: options.category });
	posts.value = data?.posts || [];
	current.value = Math.max(
		0,
		posts.value.findIndex(
			(post) => String(post.id) === String(options.postId),
		),
	);
	requestedCommentId = options.commentId || "";
	if (options.openComments === "1" && posts.value[current.value])
		openComments(posts.value[current.value]);
});
async function like(post) {
	const previous = { isLiked: post.isLiked, likeCount: post.likeCount };
	post.isLiked = !previous.isLiked;
	post.likeCount += post.isLiked ? 1 : -1;
	try {
		Object.assign(post, await toggleMarketLikeApi(post.id));
	} catch (_) {
		Object.assign(post, previous);
	}
}
function onPhotoTap(post) {
	const now = Date.now();
	if (now - lastTap < 280) like(post);
	lastTap = now;
}
async function openComments(post) {
	commentPost.value = post;
	replyTarget.value = null;
	commentText.value = "";
	try {
		const data = await getMarketCommentsApi(post.id);
		comments.value = data?.comments || [];
		if (requestedCommentId) {
			commentAnchor.value = "";
			setTimeout(() => {
				commentAnchor.value = `comment-${requestedCommentId}`;
			}, 80);
		}
	} catch (error) {
		uni.showToast({ title: error?.error || "评论加载失败", icon: "none" });
	}
}
function closeComments() {
	commentPost.value = null;
	commentAnchor.value = "";
	replyTarget.value = null;
}
function replyTo(comment) {
	replyTarget.value = {
		id: comment.id,
		authorName: comment.author_name || "用户",
	};
}
async function sendComment() {
	const content = commentText.value.trim();
	if (!content) return;
	try {
		await addMarketCommentApi(commentPost.value.id, {
			content,
			replyToCommentId: replyTarget.value?.id || null,
		});
		commentPost.value.commentCount++;
		commentText.value = "";
		replyTarget.value = null;
		await openComments(commentPost.value);
	} catch (error) {
		uni.showToast({ title: error?.error || "评论发送失败", icon: "none" });
	}
}
</script>
<style scoped>
.feed {
	height: 100vh;
	background: #111;
}
.item {
	height: 100vh;
	display: flex;
	flex-direction: column;
	position: relative;
}
.photos {
	height: 76vh;
}
.photo,
.empty-photo {
	width: 100%;
	height: 100%;
}
.empty-photo {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
}
.meta {
	color: #fff;
	padding: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}
.name {
	font-size: 38rpx;
	font-weight: 700;
}
.comment {
	margin-left: 36rpx;
}
.actions { position: absolute; right: 24rpx; bottom: 210rpx; display: flex; flex-direction: column; gap: 32rpx; color: #fff; text-align: center; }
.action { display: flex; flex-direction: column; align-items: center; font-size: 22rpx; text-shadow: 0 1rpx 4rpx #000; }
.action-icon { margin-bottom: 6rpx; font-size: 62rpx; line-height: 1; }
.mask {
	position: fixed;
	inset: 0;
	z-index: 10;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.35);
}
.panel {
	width: 100%;
	min-height: 60vh;
	height: 60vh;
	display: flex;
	flex-direction: column;
	padding: 24rpx;
	box-sizing: border-box;
	border-radius: 28rpx 28rpx 0 0;
	background: #fff;
}
.panel-head,
.input {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.comment-list {
	flex: 1;
	min-height: 0;
	margin: 22rpx 0;
}
.comment-row {
	display: flex;
	justify-content: space-between;
	gap: 12rpx;
	padding: 16rpx 0;
}
.author {
	margin-right: 12rpx;
	font-weight: 700;
	color: #6d5300;
}
.reply-link {
	color: #8d6e24;
}
.replying {
	padding: 10rpx;
	color: #8d6e24;
	font-size: 24rpx;
}
.replying text {
	margin-left: 18rpx;
	color: #999;
}
.empty {
	padding: 46rpx 0;
	text-align: center;
	color: #999;
}
.input {
	gap: 20rpx;
	margin-top: auto;
	padding-top: 16rpx;
	padding-bottom: env(safe-area-inset-bottom);
}
.input input {
	background: #f4f4f4;
	flex: 1;
	padding: 18rpx;
	border-radius: 12rpx;
}
</style>
