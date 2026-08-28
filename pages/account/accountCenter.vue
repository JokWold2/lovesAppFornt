<template>
  <view class="page">
    <view class="profile-card">
      <image v-if="account.avatar" class="avatar" :src="account.avatar" mode="aspectFill" />
      <view v-else class="avatar-placeholder"><uni-icons type="person-filled" size="44" color="#ffffff" /></view>
      <view class="profile-info">
        <text class="name">{{ account.name }}</text>
        <text class="email">{{ account.email || '暂未绑定邮箱' }}</text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-row" @click="openLegalDocument('service')">
        <text>用户服务协议</text><uni-icons type="right" size="18" color="#999" />
      </view>
      <view class="divider" />
      <view class="menu-row" @click="openLegalDocument('privacy')">
        <text>隐私政策</text><uni-icons type="right" size="18" color="#999" />
      </view>
    </view>

    <view class="menu-card danger-card">
      <view class="menu-row danger" @click="confirmCancellation"><text>注销账号</text><uni-icons type="right" size="18" color="#e85d5d" /></view>
    </view>

    <view class="logout-button" @click="logout"><text>退出登录</text></view>
  </view>
</template>

<script setup>
import { reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyProfileApi } from '@/api/index.js'
import { getUserInfo, clearAuth } from '@/utils/auth.js'
import { logoutPresence } from '@/utils/presence.js'
import { unregisterCurrentDevice } from '@/utils/pushNotifications.js'
import { getAccountAvatar, getAccountEmail, getAccountName } from '@/utils/accountCenter.js'

const account = reactive({ name: '用户', email: '', avatar: '' })

function applyAccount(profile = {}, user = {}) {
  account.name = getAccountName(profile, user)
  account.email = getAccountEmail(profile, user)
  account.avatar = getAccountAvatar(profile, user)
}

async function loadAccount() {
  const user = getUserInfo() || {}
  applyAccount({}, user)
  try {
    const data = await getMyProfileApi()
    applyAccount(data?.profile || {}, user)
  } catch (_) {
    // 个人资料请求失败时，继续展示本地登录信息。
  }
}

function openLegalDocument(type) {
  const url = type === 'service' ? '/pages/legal/userAgreement' : '/pages/legal/privacyPolicy'
  uni.navigateTo({ url })
}

async function finishSession(message) {
  await logoutPresence()
  await unregisterCurrentDevice()
  clearAuth()
  uni.showToast({ title: message, icon: 'success' })
  setTimeout(() => uni.reLaunch({ url: '/pages/login/login360' }), 500)
}

function confirmCancellation() {
  uni.showModal({
    title: '注销账号',
    content: '注销后将退出当前登录状态，是否继续？',
    success: (result) => { if (result.confirm) void finishSession('账号已注销') }
  })
}

function logout() { void finishSession('已退出登录') }

onShow(() => { void loadAccount() })
</script>

<style scoped lang="scss">
.page { min-height: 100vh; padding: 32rpx; background: #fff6df; box-sizing: border-box; }
.profile-card, .menu-card { background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, .05); }
.profile-card { display: flex; align-items: center; padding: 36rpx 32rpx; margin-bottom: 28rpx; }
.avatar, .avatar-placeholder { width: 112rpx; height: 112rpx; border-radius: 50%; flex: none; overflow: hidden; }
.avatar-placeholder { display: flex; align-items: center; justify-content: center; background: #ffce00; }
.profile-info { display: flex; flex-direction: column; min-width: 0; margin-left: 26rpx; }
.name { color: #222; font-size: 34rpx; font-weight: 600; }
.email { margin-top: 12rpx; color: #888; font-size: 26rpx; word-break: break-all; }
.menu-card { margin-bottom: 28rpx; padding: 0 28rpx; }
.menu-row { min-height: 108rpx; display: flex; align-items: center; justify-content: space-between; color: #333; font-size: 30rpx; }
.divider { height: 1rpx; background: #f0f0f0; }
.danger-card { margin-top: 44rpx; }.danger { color: #e85d5d; }
.logout-button { display: flex; align-items: center; justify-content: center; height: 96rpx; margin-top: 54rpx; border-radius: 48rpx; color: #fff; background: #ffce00; font-size: 32rpx; font-weight: 600; }
</style>
