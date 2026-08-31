<template>
  <view class="container">
    <view class="profile-header">
      <view class="avatar-wrapper">
        <image class="avatar" src="/static/avatar.png" mode="aspectFill" />
      </view>
      <view class="user-info">
        <text class="username">{{ t('life.guest') }}</text>
        <text class="user-id">ID: -----</text>
      </view>
    </view>
    <view class="menu-section">
      <uni-list>
        <uni-list-item
          v-for="(item, index) in menuItems"
          :key="index"
          :title="item.name"
          :thumb="item.icon"
          thumb-size="lg"
          show-arrow="true"
          :border="index !== menuItems.length - 1"
          @click="goPage(item.page)"
        />
      </uni-list>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { t } from '@/utils/localeRuntime.js'

const menuItems = computed(() => [
  { name: t('life.profile'), icon: '/static/icons/profile.png', page: '/pages/profile/index' },
  { name: t('life.settings'), icon: '/static/icons/settings.png', page: '/pages/settings/index' },
  { name: t('life.help'), icon: '/static/icons/help.png', page: '/pages/help/index' },
  { name: t('life.about'), icon: '/static/icons/about.png', page: '/pages/about/index' },
]);

const goPage = (url) => {
  uni.navigateTo({ url });
};
</script>

<style scoped lang="scss">
$primary-color: #fff6df;
$background-color: #fff6df;
$text-color-black: #333;

.container {
  min-height: 100vh;
  background-color: $background-color;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, $primary-color 0%, #e6dcc4 100%);
  margin-bottom: 15px;

  .avatar-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: #FFFFFF;
    padding: 3px;
    margin-right: 20px;

    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .user-info {
    display: flex;
    flex-direction: column;

    .username {
      font-size: 20px;
      font-weight: bold;
      color: #FFFFFF;
      margin-bottom: 8px;
    }

    .user-id {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.menu-section {
  margin: 0 15px;
  background-color: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
</style>
