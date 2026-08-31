<template>
  <view class="page app-h5-min-screen">
    <view class="profile-card">
      <image v-if="account.avatar" class="avatar" :src="account.avatar" mode="aspectFill" />
      <view v-else class="avatar-placeholder"><uni-icons type="person-filled" size="44" color="#ffffff" /></view>
      <view class="profile-info">
        <text class="name">{{ account.name }}</text>
        <text class="email">{{ account.email || t('common.notBoundEmail') }}</text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-row language-row" @tap="openLanguageSheet">
        <text>{{ t('common.language') }}</text><text class="row-value">{{ localeLabel }}</text><uni-icons type="right" size="18" color="#999" />
      </view>
      <view class="divider" />
      <view class="menu-row" @tap="openLegalDocument('service')">
        <text>{{ t('common.serviceAgreement') }}</text><uni-icons type="right" size="18" color="#999" />
      </view>
      <view class="divider" />
      <view class="menu-row" @tap="openLegalDocument('privacy')">
        <text>{{ t('common.privacyPolicy') }}</text><uni-icons type="right" size="18" color="#999" />
      </view>
    </view>

    <view class="menu-card danger-card">
      <view class="menu-row danger" @tap="confirmCancellation"><text>{{ t('common.cancelAccount') }}</text><uni-icons type="right" size="18" color="#e85d5d" /></view>
    </view>

    <view class="logout-button" @tap="logout"><text>{{ t('common.logout') }}</text></view>

    <view v-if="showLanguageSheet" class="language-sheet-mask app-h5-sheet-mask" @tap="closeLanguageSheet">
      <view class="language-sheet app-h5-sheet" @tap.stop>
        <view class="language-sheet-title">{{ t('common.language') }}</view>
        <scroll-view scroll-y class="language-sheet-list app-h5-scroll">
          <view
            v-for="option in localeOptionItems"
            :key="option.code"
            class="language-sheet-item"
            @tap="selectLanguage(option.code)"
          >
            <text>{{ option.label }}</text>
            <uni-icons v-if="isCurrentLocale(option.code)" type="checkmarkempty" size="20" color="#ffce00" />
          </view>
        </scroll-view>
        <view class="language-sheet-item cancel" @tap="closeLanguageSheet">
          <text>{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyProfileApi } from '@/api/index.js'
import { getUserInfo, clearAuth } from '@/utils/auth.js'
import { logoutPresence } from '@/utils/presence.js'
import { unregisterCurrentDevice } from '@/utils/pushNotifications.js'
import { getAccountAvatar, getAccountEmail, getAccountName } from '@/utils/accountCenter.js'
import { currentLocale, currentLocaleMode, localeRuntime, t } from '@/utils/localeRuntime.js'

const account = reactive({ name: t('common.user'), email: '', avatar: '' })
const localeOptions = ['auto', 'zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']
const localeNames = computed(() => ({ auto: t('common.followRegion'), 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', en: 'English', ru: 'Русский', ja: '日本語', ko: '한국어' }))
const localeOptionItems = computed(() => localeOptions.map((code) => ({ code, label: localeNames.value[code] })))
const localeLabel = computed(() => localeNames.value[currentLocaleMode.value === 'auto' ? 'auto' : currentLocale.value])
const showLanguageSheet = ref(false)

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

function openLanguageSheet() { showLanguageSheet.value = true }
function closeLanguageSheet() { showLanguageSheet.value = false }
function isCurrentLocale(code) {
  return currentLocaleMode.value === 'auto'
    ? code === 'auto'
    : code === currentLocale.value
}

async function selectLanguage(selected) {
  if (showLanguageSheet.value) showLanguageSheet.value = false
  try {
    if (selected === 'auto') await localeRuntime.setAutoLocale(uni.getSystemInfoSync()?.language)
    else await localeRuntime.setManualLocale(selected)
    uni.showToast({ title: t('common.languageSaved'), icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.error || t('common.languageSaveFailed'), icon: 'none' })
  }
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
	 title: t('common.cancelAccountTitle'),
	 content: t('common.cancelAccountContent'),
	 cancelText: t('common.cancel'),
	 confirmText: t('common.confirm'),
	 success: (result) => { if (result.confirm) void finishSession(t('common.accountCancelled')) }
  })
}

function logout() { void finishSession(t('common.loggedOut')) }

onShow(() => { void loadAccount() })

function updatePageTitle() { uni.setNavigationBarTitle({ title: t('account') }) }
onShow(updatePageTitle)
watch(currentLocale, updatePageTitle)
</script>

<style scoped lang="scss">
.page { padding: 32rpx; background: #fff6df; box-sizing: border-box; }
/* #ifndef H5 */
.page { min-height: 100vh; }
/* #endif */
/* #ifdef H5 */
.page { padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
/* #endif */
.profile-card, .menu-card { background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, .05); }
.profile-card { display: flex; align-items: center; padding: 36rpx 32rpx; margin-bottom: 28rpx; }
.avatar, .avatar-placeholder { width: 112rpx; height: 112rpx; border-radius: 50%; flex: none; overflow: hidden; }
.avatar-placeholder { display: flex; align-items: center; justify-content: center; background: #ffce00; }
.profile-info { display: flex; flex-direction: column; min-width: 0; margin-left: 26rpx; }
.name { color: #222; font-size: 34rpx; font-weight: 600; }
.email { margin-top: 12rpx; color: #888; font-size: 26rpx; word-break: break-all; }
.menu-card { margin-bottom: 28rpx; padding: 0 28rpx; }
.menu-row { min-height: 108rpx; display: flex; align-items: center; justify-content: space-between; color: #333; font-size: 30rpx; }
.row-value { margin-left: auto; margin-right: 14rpx; color: #999; font-size: 26rpx; }
.divider { height: 1rpx; background: #f0f0f0; }
.language-row { position: relative; }
.language-sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; z-index: 999; }
.language-sheet { display: flex; width: 100%; min-height: 0; flex-direction: column; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 24rpx 16rpx 32rpx; box-sizing: border-box; }
.language-sheet-title { flex: 0 0 auto; text-align: center; font-size: 30rpx; color: #222; margin-bottom: 20rpx; }
.language-sheet-item { min-height: 94rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; font-size: 30rpx; color: #333; border-top: 1rpx solid #f2f2f2; }
.language-sheet-item:first-of-type { border-top: none; }
.language-sheet-item.cancel { flex: 0 0 auto; justify-content: center; color: #888; margin-top: 18rpx; font-weight: 500; }
.danger-card { margin-top: 44rpx; }.danger { color: #e85d5d; }
.logout-button { display: flex; align-items: center; justify-content: center; height: 96rpx; margin-top: 54rpx; border-radius: 48rpx; color: #fff; background: #ffce00; font-size: 32rpx; font-weight: 600; }
/* #ifdef H5 */
.language-sheet-mask { bottom: var(--app-viewport-bottom-offset, 0px); }
.language-sheet { padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
/* #endif */
</style>
