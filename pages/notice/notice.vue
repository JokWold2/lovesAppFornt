<template>
  <view class="container">
    <view class="notice-header">
      <text class="title">消息中心</text>
      <view style="position: relative;top: 30rpx; margin-left: 40rpx;">
        <loading2 />
      </view>
    </view>
    <view class="notice-list">

      <view class="list-item" v-for="(item, index) in noticeItems" :key="index"
        :class="{ 'no-border': index === noticeItems.length - 1 }">
        <!-- 左侧头像 -->
        <view class="item-avatar" v-if="index === 0" style="display: flex;justify-content: center;align-items: center;">
          <view style=" width: 100rpx;height: 100rpx;transform: scale(0.25);">
            <loading3 :duration="loadingDuration" />
          </view>
        </view>
        <view class="item-avatar" v-else style="display: flex;justify-content: center;align-items: center;">
          <view style=" width: 100rpx;height: 100rpx;transform: scale(0.25);">
            <loading4 :duration="loadingDuration" />
          </view>
        </view>
        <!-- 中间文字区域 -->
        <view class="item-content">
          <text class="item-title">{{ item.title }}</text>
          <text class="item-note">{{ item.time }}</text>
        </view>
        <!-- 右侧箭头 -->
        <view class="item-arrow">
          <text class="arrow-icon"> > </text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-if="noticeItems.length === 0">
      <uni-icons type="chatboxes-filled" size="60" color="#CCCCCC"></uni-icons>
      <text class="empty-text">暂无消息</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import loading2 from '@/static/loading/loading2.vue';
import loading3 from '@/static/loading/loading3.vue';
import loading4 from '@/static/loading/loading4.vue';

const noticeItems = ref([
  { title: '系统通知：欢迎使用幸福人生', time: '2026-07-16 10:00', avatar: '/static/avatar.png' },
  { title: '新功能上线通知', time: '2026-07-15 15:30', avatar: '/static/avatar.png' },
  { title: '活动提醒：精彩内容等你发现', time: '2026-07-14 09:00', avatar: '/static/avatar.png' },
]);

const loadingDuration = ref(18);

onPullDownRefresh(() => {
  console.log('下拉刷新');
  loadingDuration.value = 2
});
</script>

<style scoped lang="scss">
$primary-color: #fff6df;
$background-color: #fff6df;
$text-color-black: #333;

.notice-list {
  background-color: #ffffff;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  box-sizing: border-box;

  &.no-border {
    border-bottom: none;
  }
}

// 左侧大头像 thumb-size="lg"
.item-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 8rpx;
  overflow: hidden;
  margin-right: 24rpx;
  flex-shrink: 0;

  .avatar-img {
    width: 100%;
    height: 100%;
  }
}

// 标题+备注区域
.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;

  .item-title {
    font-size: 32rpx;
    color: #333;
  }

  .item-note {
    font-size: 26rpx;
    color: #999;
  }
}

// 右侧箭头 show-arrow
.item-arrow {
  flex-shrink: 0;

  .arrow-icon {
    font-size: 36rpx;
    color: #c8c9cc;
  }
}

.container {
  min-height: 100vh;
  background-color: $background-color;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.notice-header {
  display: flex;
  background-color: #FFFFFF;
  padding: 20px 15px;
  margin-bottom: 15px;

  .title {
    font-size: 20px;
    font-weight: bold;
    color: #ffce00;
  }
}

.notice-list {
  margin: 0 15px;
  background-color: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100px;

  .empty-text {
    margin-top: 20px;
    font-size: 16px;
    color: #CCCCCC;
  }
}
</style>
