<template>
	<view class="auction-detail">
		<view v-if="loading" class="state-box"><text>{{ t('auctionDetail.loading') }}</text></view>
		<view v-else-if="!auction" class="state-box"
			><text>{{ errorMessage }}</text></view
		>
		<template v-else>
			<swiper
				class="photo-swiper"
				circular
				indicator-dots
				indicator-active-color="#FFCE00"
			>
				<swiper-item v-for="photo in auction.photos" :key="photo"
					><image :src="photo" class="photo" mode="aspectFit"
				/></swiper-item>
			</swiper>

			<view class="content-card">
				<text class="lot-no">lot{{ auction.lotNo }}</text>
				<text class="title">{{ auction.title }}</text>
				<view class="price-row">
					<view
						><text class="price-label">{{ t('auctionDetail.currentPrice') }}</text
						><text class="price"
							>¥ {{ formatPrice(auction.currentPrice) }}</text
						></view
					>
					<text class="countdown">{{
						auction.status === "ongoing"
							? t('auctionDetail.ending', { time: countdownText })
							: statusText
					}}</text>
				</view>
				<view class="service-row"
					><text>{{ t('auctionDetail.service') }}</text><text>{{ t('auctionDetail.shipping') }}</text
					><text>{{ t('auctionDetail.reserve') }}</text></view
				>
				<view class="rule-row"
					><text
						>{{ t('auctionDetail.starting') }} ¥{{ formatPrice(auction.startingPrice) }}</text
					><text>{{ t('auctionDetail.commission', { rate: auction.depositRate * 100 }) }}</text></view
				>
				<text class="rule-row"
					>{{ t('auctionDetail.step') }} ¥{{ formatPrice(auction.priceStep) }}</text
				>
			</view>

			<view class="content-card">
				<text class="section-title">{{ t('auctionDetail.info') }}</text>
				<view class="info-row"
					><text>{{ t('auctionDetail.era') }}</text><text>{{ auction.era }}</text></view
				>
				<view class="info-row"
					><text>{{ t('auctionDetail.size') }}</text><text>{{ auction.size }}</text></view
				>
				<view class="info-row"
					><text>{{ t('auctionDetail.material') }}</text><text>{{ auction.material }}</text></view
				>
				<view class="info-row"
					><text>{{ t('auctionDetail.condition') }}</text><text>{{ auction.condition }}</text></view
				>
				<view class="description"
					><text>{{ auction.description }}</text></view
				>
			</view>

			<view class="content-card bid-card">
				<view class="bid-header"
					><text class="section-title">{{ t('auctionDetail.records') }}</text
					><text>{{ t('auction.bids', { count: auction.bidCount }) }}</text></view
				>
				<scroll-view class="bid-list" scroll-y>
					<view v-if="!auction.bidRecords.length" class="empty-bids"
						><text>{{ t('auctionDetail.noBids') }}</text></view
					>
					<view
						v-for="record in sortedBidRecords"
						:key="record.id"
						class="bid-item"
					>
						<image
							class="bid-avatar"
							:src="record.avatar"
							mode="aspectFill"
						/>
						<view class="bid-user"
							><text>{{ record.name }}</text
							><text class="bid-time"
								>{{ relativeTime(record.createdAt) }}出价</text
							></view
						>
						<text class="bid-amount"
							>¥{{ formatPrice(record.amount) }}</text
						>
					</view>
				</scroll-view>
			</view>
		</template>

		<view v-if="auction" class="bottom-bar">
			<view
				class="bottom-action"
				@click="showFeatureTip(t('auctionDetail.customerService'))"
			>
				<uni-icons type="headphones" size="25" color="#333" />
				<text>{{ t('auctionDetail.customerService') }}</text>
			</view>
			<view
				class="bottom-action"
				@click="showFeatureTip(t('auctionDetail.reminder'))"
			>
				<uni-icons type="notification" size="25" color="#333" />
				<text>{{ t('auctionDetail.reminder') }}</text>
			</view>
			<view
				class="bottom-action"
				@click="showFeatureTip(t('auctionDetail.proxy'))"
			>
				<uni-icons type="paperplane" size="25" color="#333" />
				<text>{{ t('auctionDetail.proxy') }}</text>
			</view>
			<button
				class="bid-button"
				:disabled="!canBid || bidding"
				@click="handleBid"
			>
				{{
					bidding
						? t('auctionDetail.bidding')
						: canBid
							? t('auctionDetail.bidNow', { amount: formatPrice(nextBidAmount) })
							: t('auctionDetail.cannotBid')
				}}
			</button>
		</view>
	</view>
</template>

<script setup>
import { computed, ref, onUnmounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getAuctionDetail, placeAuctionBid } from "@/utils/auctionStore.js";
import { t } from '@/utils/localeRuntime.js'

const auction = ref(null);
const loading = ref(true);
const bidding = ref(false);
const errorMessage = ref(t('auctionDetail.missing'));
const now = ref(Date.now());
let timer = null;

const canBid = computed(
	() =>
		auction.value?.status === "ongoing" && auction.value.endAt > now.value,
);
const nextBidAmount = computed(() =>
	auction.value ? auction.value.currentPrice + auction.value.priceStep : 0,
);
const statusText = computed(
	() =>
		({ upcoming: "即将开始", preview: "预展中", ended: "已结束" })[
			auction.value?.status
		] || "",
);
const countdownText = computed(() =>
	formatCountdown(auction.value?.endAt - now.value),
);
const sortedBidRecords = computed(() =>
	[...(auction.value?.bidRecords || [])].sort(
		(a, b) => b.createdAt - a.createdAt,
	),
);

onLoad(async (options) => {
	try {
		auction.value = await getAuctionDetail(options.id);
		timer = setInterval(() => {
			now.value = Date.now();
		}, 1000);
	} catch (error) {
		errorMessage.value = error.message || errorMessage.value;
	} finally {
		loading.value = false;
	}
});

onUnmounted(() => {
	if (timer) clearInterval(timer);
});

async function handleBid() {
	if (!canBid.value || bidding.value) return;
	bidding.value = true;
	try {
		const userInfo = uni.getStorageSync("USER_INFO") || {};
		const result = await placeAuctionBid(auction.value.id, {
			name: userInfo.nickname || userInfo.name || t('auctionDetail.mine'),
			avatar:
				userInfo.avatar_url ||
				userInfo.avatarUrl ||
				"/static/avatar.png",
		});
		auction.value = result.auction;
		uni.showToast({ title: t('auctionDetail.bidSuccess'), icon: "success" });
	} catch (error) {
		uni.showToast({
			title: error.message || t('auctionDetail.bidFailed'),
			icon: "none",
		});
	} finally {
		bidding.value = false;
	}
}

// 三个扩展能力暂未接入；保留独立入口，后续接接口时不影响竞价流程。
function showFeatureTip(title) {
	uni.showToast({ title, icon: "none" });
}

function formatPrice(value) {
	return Number(value || 0).toLocaleString();
}
function formatCountdown(diff) {
	if (diff <= 0) return "00:00:00";
	const seconds = Math.floor(diff / 1000);
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	return days
		? `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(secs)}`
		: `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}
function relativeTime(timestamp) {
	const diff = Math.max(0, Date.now() - timestamp);
	if (diff < 60000) return t('auctionDetail.justNow');
	if (diff < 3600000) return t('auctionDetail.minutesAgo', { count: Math.floor(diff / 60000) });
	if (diff < 86400000) return t('auctionDetail.hoursAgo', { count: Math.floor(diff / 3600000) });
	return t('auctionDetail.daysAgo', { count: Math.floor(diff / 86400000) });
}
function pad(value) {
	return String(value).padStart(2, "0");
}
</script>

<style scoped lang="scss">
$brand-yellow: #ffce00;
$page-bg: #f7f7f7;
.auction-detail {
	min-height: 100vh;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
	background: $page-bg;
}
.state-box {
	display: flex;
	justify-content: center;
	padding: 180rpx 0;
	color: #999;
}
.photo-swiper {
	height: 620rpx;
	background: #fff;
}
.photo {
	width: 100%;
	height: 100%;
}
.content-card {
	margin: 20rpx 24rpx 0;
	padding: 30rpx;
	background: #fff;
	border-radius: 20rpx;
}
.lot-no {
	display: block;
	color: #999;
	font-size: 24rpx;
	font-style: italic;
}
.title {
	display: block;
	margin-top: 12rpx;
	color: #1a1a1a;
	font-size: 38rpx;
	font-weight: 600;
}
.price-row,
.rule-row,
.bid-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.price-row {
	margin-top: 28rpx;
}
.price-label,
.service-row,
.bid-header {
	color: #8d8d8d;
	font-size: 24rpx;
}
.price {
	margin-left: 16rpx;
	color: #d89000;
	font-size: 36rpx;
	font-weight: bold;
}
.countdown {
	padding: 10rpx 16rpx;
	background: rgba(255, 206, 0, 0.2);
	border-radius: 8rpx;
	color: #765b00;
	font-size: 24rpx;
}
.service-row {
	display: flex;
	justify-content: space-between;
	margin: 30rpx 0 22rpx;
	padding-top: 22rpx;
	border-top: 1rpx solid #eee;
}
.rule-row {
	margin-top: 16rpx;
	color: #333;
	font-size: 27rpx;
}
.section-title {
	color: #222;
	font-size: 32rpx;
	font-weight: 600;
}
.info-row {
	display: flex;
	margin-top: 26rpx;
	color: #333;
	font-size: 28rpx;
	line-height: 1.5;
}
.info-row text:first-child {
	width: 130rpx;
	flex-shrink: 0;
	margin-right: 18rpx;
	color: #888;
}
.description {
	margin-top: 26rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid #eee;
	color: #555;
	font-size: 27rpx;
	line-height: 1.7;
}
.bid-card {
	padding-bottom: 12rpx;
}
.bid-list {
	max-height: 520rpx;
	margin-top: 18rpx;
}
.bid-item {
	display: flex;
	align-items: center;
	padding: 18rpx 0;
	border-bottom: 1rpx solid #f1f1f1;
}
.bid-avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #eee;
}
.bid-user {
	display: flex;
	flex: 1;
	flex-direction: column;
	margin-left: 18rpx;
	color: #333;
	font-size: 27rpx;
}
.bid-time {
	margin-top: 6rpx;
	color: #999;
	font-size: 22rpx;
}
.bid-amount {
	color: #c67f00;
	font-size: 28rpx;
	font-weight: 600;
}
.empty-bids {
	padding: 48rpx 0;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}
.bottom-bar {
	position: fixed;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	align-items: center;
	padding: 12rpx 20rpx calc(12rpx + env(safe-area-inset-bottom));
	background: #fff;
	box-shadow: 0 -4rpx 18rpx rgba(0, 0, 0, 0.08);
}
.bottom-action {
	display: flex;
	width: 112rpx;
	flex-shrink: 0;
	flex-direction: column;
	align-items: center;
	color: #333;
	font-size: 21rpx;
	line-height: 1.5;
}
.bottom-action text {
	margin-top: 4rpx;
}
.bid-button {
	flex: 1;
	margin: 0 0 0 14rpx;
	padding: 0 12rpx;
	border-radius: 8rpx;
	background: $brand-yellow;
	color: #1a1a1a;
	font-size: 27rpx;
	font-weight: 600;
	line-height: 82rpx;
}
.bid-button[disabled] {
	background: #e3e3e3;
	color: #999;
}
</style>
