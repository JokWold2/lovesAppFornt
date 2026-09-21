<template>
  <view class="page app-h5-min-screen">
    <ChatPageHeader :title="t('navigation.account')" />
    <view class="page-content">
      <view class="account-hero">
        <image v-if="account.avatar" class="account-avatar" :src="account.avatar" mode="aspectFill" />
        <view v-else class="account-avatar account-avatar--placeholder"><uni-icons type="person-filled" size="38" color="#ffffff" /></view>
        <text class="account-name">{{ account.name }}</text>
        <text class="account-email">{{ account.email || t('common.notBoundEmail') }}</text>
      </view>

      <view class="settings-card">
        <button class="setting-row language-row" @tap="openLanguageSheet">
          <text class="setting-label">{{ t('common.language') }}</text><view class="setting-tail"><text class="row-value">{{ localeLabel }}</text><view class="chevron" /></view>
        </button>
        <button class="setting-row" @tap="openLegalDocument('service')">
          <text class="setting-label">{{ t('common.serviceAgreement') }}</text><view class="chevron" />
        </button>
        <button class="setting-row" @tap="openLegalDocument('privacy')">
          <text class="setting-label">{{ t('common.privacyPolicy') }}</text><view class="chevron" />
        </button>
        <button class="setting-row danger" @tap="confirmCancellation"><text class="setting-label">{{ t('common.cancelAccount') }}</text><view class="chevron" /></button>
      </view>

      <button class="logout-button" hover-class="logout-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="logout"><text>{{ t('common.logout') }}</text></button>
    </view>

    <ChatSheet :open="showLanguageSheet" :label="t('common.language')" @dismiss="closeLanguageSheet">
      <view class="language-sheet">
        <view class="language-sheet-head"><text class="language-sheet-title">{{ t('common.language') }}</text><button class="language-sheet-close" :aria-label="t('common.cancel')" @tap="closeLanguageSheet">×</button></view>
        <scroll-view scroll-y class="language-sheet-list app-h5-scroll">
          <button
            v-for="option in localeOptionItems"
            :key="option.code"
            class="language-option"
            @tap="selectLanguage(option.code)"
          >
            <text>{{ option.label }}</text>
            <view v-if="isCurrentLocale(option.code)" class="language-check"><view /></view>
          </button>
        </scroll-view>
      </view>
    </ChatSheet>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyProfileApi } from '@/api/index.js'
import ChatPageHeader from '@/components/chat/ChatPageHeader.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
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

function updatePageTitle() { uni.setNavigationBarTitle({ title: t('navigation.account') }) }
onShow(updatePageTitle)
watch(currentLocale, updatePageTitle)
</script>

<style scoped lang="scss">
.page{min-height:100vh;background:#eeedeb;color:#292825;box-sizing:border-box}.page-content{padding:2px 20px calc(32px + env(safe-area-inset-bottom));box-sizing:border-box}
button{margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:14px;line-height:1.45;text-align:left;box-sizing:border-box}button::after{border:0}
.account-hero{display:flex;align-items:center;flex-direction:column;padding:12px 0 32px;min-width:0}.account-avatar{width:76px;height:76px;border:2px solid rgba(255,255,255,.9);border-radius:50%;box-sizing:border-box;box-shadow:0 5px 18px rgba(65,59,48,.08);overflow:hidden;flex:none}.account-avatar--placeholder{display:flex;align-items:center;justify-content:center;background:#c9b46d}.account-name{max-width:100%;margin-top:15px;color:#292825;font-size:22px;font-weight:650;line-height:1.35;overflow-wrap:anywhere;text-align:center}.account-email{max-width:100%;margin-top:5px;color:#918d85;font-size:14px;line-height:1.45;overflow-wrap:anywhere;text-align:center}
.settings-card{overflow:hidden;background:#fff;border-radius:23px}.setting-row{display:flex;width:100%;min-height:64px;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px}.setting-row+.setting-row{border-top:1px solid #f2f0ec}.setting-label{min-width:0;flex:1;font-size:15px;line-height:1.6;overflow-wrap:anywhere}.setting-tail{display:flex;min-width:0;max-width:55%;align-items:center;justify-content:flex-end;gap:10px}.row-value{min-width:0;color:#918d85;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chevron{width:7px;height:7px;margin-right:3px;border-top:1.5px solid #aaa69f;border-right:1.5px solid #aaa69f;transform:rotate(45deg);flex:none}.setting-row:active{background:#faf9f6}.danger{color:#d9615f}.danger .chevron{border-color:#d9615f}
.logout-button{display:flex;width:100%;min-height:52px;align-items:center;justify-content:center;margin-top:22px;border-radius:20px;color:#fff;background:#efc635;font-size:16px;font-weight:650;text-align:center;box-shadow:0 6px 18px rgba(195,157,48,.12);transform:scale(1);transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease,box-shadow 140ms ease}.logout-button--pressed,.logout-button:active{background:#e6bb2d;box-shadow:0 3px 10px rgba(195,157,48,.1);transform:scale(.985)}
.language-sheet{padding:20px 20px calc(20px + env(safe-area-inset-bottom));color:#292825}.language-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}.language-sheet-title{min-width:0;font-size:20px;font-weight:650;line-height:1.4;overflow-wrap:anywhere}.language-sheet-close{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:50%;background:#fff;color:#55514b;font-size:27px;line-height:1;flex:none}.language-sheet-list{max-height:min(62vh,470px)}.language-option{display:flex;width:100%;min-height:56px;align-items:center;justify-content:space-between;gap:16px;padding:10px 4px;font-size:15px}.language-option+.language-option{border-top:1px solid #ebe8e2}.language-option:active{opacity:.68}.language-check{display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;background:#efc635;flex:none}.language-check>view{width:9px;height:5px;margin-top:-2px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg)}
@media(prefers-reduced-motion:reduce){.logout-button{transition:none}.logout-button--pressed,.logout-button:active{transform:none}}
</style>
