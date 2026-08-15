<template>
    <view class="auction-page">
      <!-- 精选轮播 -->
      <swiper class="banner-swiper" v-if="featuredAuctions.length" autoplay circular interval="4000" :duration="400">
        <swiper-item v-for="item in featuredAuctions" :key="item.id" @click="openDetail(item)">
          <view class="banner-item">
            <image class="banner-img" :src="item.cover" mode="aspectFill"></image>
            <view class="banner-mask">
              <text class="banner-title">{{ item.title }}</text>
              <text class="banner-price">当前价 ¥{{ formatPrice(item.currentPrice) }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
  
      <!-- 状态筛选 -->
      <view class="status-wrapper">
        <scroll-view class="status-scroll" scroll-x="true" show-scrollbar="false">
          <view class="status-content">
            <view
              class="status-pill"
              v-for="s in statusFilters"
              :key="s.key"
              :class="{ active: currentStatus === s.key }"
              @click="currentStatus = s.key"
            >
              <text>{{ s.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
  
      <!-- 空状态 -->
      <view v-if="filteredAuctions.length === 0" class="state-box">
        <text class="state-icon">🔨</text>
        <text class="state-text">暂无相关拍卖活动</text>
      </view>
  
      <!-- 拍品列表 -->
      <view v-else class="auction-list">
        <view class="auction-card" v-for="item in filteredAuctions" :key="item.id" @click="openDetail(item)">
          <image class="thumb" :src="item.cover" mode="aspectFill"></image>
  
          <view class="info">
            <view class="info-top">
              <text class="title">{{ item.title }}</text>
              <view class="status-badge" :class="statusClass(item.status)">
                <text>{{ statusLabel(item.status) }}</text>
              </view>
            </view>
  
            <text class="lot-no">拍品编号 No.{{ item.lotNo }} · {{ item.category }}</text>
  
            <view class="price-row">
              <view class="price-block">
                <text class="price-label">{{ item.status === 'ended' ? '成交价' : '当前价' }}</text>
                <text class="price-value">¥{{ formatPrice(item.currentPrice) }}</text>
              </view>
              <view class="bid-block">
                <text class="bid-count">{{ item.bidCount }}次出价</text>
              </view>
            </view>
  
            <view class="countdown-row" v-if="item.status !== 'ended'">
              <uni-icons type="clock" size="14" color="#999"></uni-icons>
              <text class="countdown-text">{{ item.status === 'upcoming' ? '距开始 ' : '距结束 ' }}{{ item.countdownText }}</text>
            </view>
            <view class="countdown-row" v-else>
              <text class="ended-text">已于 {{ item.endTimeText }} 结束</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { getAuctionList } from '@/utils/auctionStore.js';
  
  // ------- 状态筛选 -------
  const statusFilters = ref([
    { key: 'all', label: '全部' },
    { key: 'upcoming', label: '即将开始' },
    { key: 'ongoing', label: '竞拍中' },
    { key: 'preview', label: '预展中' },
    { key: 'ended', label: '已结束' }
  ]);
  const currentStatus = ref('all');
  
  // ------- 数据 -------
  const auctions = ref([]);
  let timer = null;

  async function loadAuctions() {
    const data = await getAuctionList();
    auctions.value = data.map((item) => ({ ...item, countdownText: '', endTimeText: formatDate(item.endAt) }));
  }
  
  // ------- 倒计时 -------
  function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
  }
  
  function formatCountdown(diffMs) {
    if (diffMs <= 0) return '00:00:00';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${d}天${pad(h % 24)}时`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  
  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  
  function formatPrice(v) {
    return v.toLocaleString('zh-CN');
  }
  
  function tickCountdown() {
    const now = Date.now();
    auctions.value.forEach((item) => {
      if (item.status === 'ended') return;
      item.countdownText = formatCountdown(item.endAt - now);
    });
  }
  
  onMounted(async () => {
    await loadAuctions();
    tickCountdown();
    timer = setInterval(tickCountdown, 1000);
  });
  
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
  
  // ------- 筛选与精选 -------
  const featuredAuctions = computed(() =>
    auctions.value.filter((a) => a.status === 'ongoing' || a.status === 'preview').slice(0, 3)
  );
  
  const filteredAuctions = computed(() => {
    if (currentStatus.value === 'all') return auctions.value;
    return auctions.value.filter((a) => a.status === currentStatus.value);
  });
  
  function statusLabel(status) {
    return { upcoming: '即将开始', ongoing: '竞拍中', preview: '预展中', ended: '已结束' }[status] || '';
  }
  
  function statusClass(status) {
    return `badge-${status}`;
  }
  
  function openDetail(item) {
    uni.navigateTo({ url: `/pages/index/auctionDetail?id=${item.id}` });
  }
  </script>
  
  <style scoped lang="scss">
  $brand-yellow: #FFCE00;
  $text-main: #1A1A1A;
  $text-sub: #999999;
  $gray-bg: #F5F6F8;
  
  .auction-page {
    padding: 0 30rpx 20rpx;
    min-height: 60vh;
  }
  
  /* 精选轮播 */
  .banner-swiper {
    width: 100%;
    height: 320rpx;
    border-radius: 20rpx;
    overflow: hidden;
    margin-top: 16rpx;
  
    .banner-item {
      position: relative;
      width: 100%;
      height: 100%;
  
      .banner-img {
        width: 100%;
        height: 100%;
        background-color: #f0f0f0;
      }
  
      .banner-mask {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 60rpx 24rpx 20rpx;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0));
        display: flex;
        flex-direction: column;
  
        .banner-title {
          color: #ffffff;
          font-size: 30rpx;
          font-weight: bold;
        }
  
        .banner-price {
          color: $brand-yellow;
          font-size: 26rpx;
          margin-top: 8rpx;
        }
      }
    }
  }
  
  /* 状态筛选 */
  .status-wrapper {
    padding: 24rpx 0 4rpx;
  
    .status-scroll {
      white-space: nowrap;
  
      ::-webkit-scrollbar {
        display: none;
      }
  
      .status-content {
        display: inline-flex;
      }
  
      .status-pill {
        height: 60rpx;
        padding: 0 28rpx;
        background-color: $gray-bg;
        border-radius: 30rpx;
        display: flex;
        align-items: center;
        margin-right: 16rpx;
  
        text {
          font-size: 26rpx;
          color: $text-main;
        }
  
        &.active {
          background-color: $brand-yellow;
  
          text {
            font-weight: bold;
          }
        }
      }
    }
  }
  
  /* 空状态 */
  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120rpx 0;
  
    .state-icon {
      font-size: 60rpx;
      margin-bottom: 20rpx;
    }
  
    .state-text {
      font-size: 28rpx;
      color: $text-sub;
    }
  }
  
  /* 拍品列表 */
  .auction-list {
    padding-top: 10rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }
  
  .auction-card {
    display: flex;
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 18rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  
    .thumb {
      width: 180rpx;
      height: 180rpx;
      border-radius: 12rpx;
      background-color: #f0f0f0;
      flex-shrink: 0;
      margin-right: 20rpx;
    }
  
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
  
      .info-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12rpx;
  
        .title {
          flex: 1;
          font-size: 28rpx;
          font-weight: bold;
          color: $text-main;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
        }
  
        .status-badge {
          flex-shrink: 0;
          padding: 4rpx 14rpx;
          border-radius: 8rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          text {
            font-size: 20rpx;
            color: #ffffff;
          }
  
          &.badge-ongoing {
            background-color: #FF5B30;
          }
  
          &.badge-upcoming {
            background-color: #4A90D9;
          }
  
          &.badge-preview {
            background-color: #8E7CF2;
          }
  
          &.badge-ended {
            background-color: #BBBBBB;
          }
        }
      }
  
      .lot-no {
        font-size: 22rpx;
        color: $text-sub;
        margin-top: 8rpx;
      }
  
      .price-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-top: 16rpx;
  
        .price-block {
          display: flex;
          flex-direction: column;
  
          .price-label {
            font-size: 20rpx;
            color: $text-sub;
          }
  
          .price-value {
            font-size: 32rpx;
            font-weight: bold;
            color: #D64545;
            margin-top: 2rpx;
          }
        }
  
        .bid-block {
          .bid-count {
            font-size: 22rpx;
            color: $text-sub;
          }
        }
      }
  
      .countdown-row {
        display: flex;
        align-items: center;
        margin-top: 14rpx;
        gap: 6rpx;
  
        .countdown-text {
          font-size: 22rpx;
          color: #E08A00;
        }
  
        .ended-text {
          font-size: 22rpx;
          color: #BBBBBB;
        }
      }
    }
  }
  </style>
