<template>
  <view class="account-drawer-host" :style="{ '--account-drawer-width': width + 'px' }">
    <view
      class="account-drawer-panel"
      :class="{ 'is-open': open }"
      role="dialog"
      :aria-label="copy.accountTitle"
      :aria-hidden="!open"
      @touchstart="startSwipe"
      @touchend="endSwipe"
      @touchcancel="cancelSwipe"
    >
      <scroll-view scroll-y class="account-drawer-scroll app-h5-scroll" :show-scrollbar="false">
        <view class="account-drawer-content" :style="{ paddingTop: topInset + 8 + 'px' }">
          <view class="account-drawer-brand" aria-label="BLESS">
            <image src="/static/brand/bless-heart-mark.svg" mode="aspectFit" />
            <text>BLESS</text>
          </view>

          <text class="account-drawer-title">{{ copy.accountTitle }}</text>
          <view class="account-drawer-profile">
            <image v-if="account.avatar" class="account-drawer-avatar" :src="account.avatar" mode="aspectFill" />
            <view v-else class="account-drawer-avatar is-placeholder"><uni-icons type="person-filled" size="26" color="#ffffff" /></view>
            <view class="account-drawer-profile-copy">
              <text class="account-drawer-name">{{ account.name }}</text>
              <text class="account-drawer-caption">{{ copy.myAccount }}</text>
            </view>
          </view>

          <text class="account-drawer-section-title">{{ copy.accountSecurity }}</text>
          <view v-if="identitiesLoading" class="account-drawer-state-card">
            <text>{{ copy.loading }}</text>
          </view>
          <view v-else-if="identitiesError" class="account-drawer-state-card">
            <text>{{ copy.loadError }}</text>
            <button class="account-drawer-retry" @tap="refresh">{{ copy.retry }}</button>
          </view>
          <view v-else class="account-drawer-card account-drawer-identity-card">
            <button class="account-drawer-row identity-row" @tap="openBinding('email')">
              <view class="account-drawer-icon"><uni-icons type="email" size="20" color="#263243" /></view>
              <view class="account-drawer-row-copy">
                <text class="account-drawer-row-title">{{ copy.email }}</text>
                <text class="account-drawer-row-detail">{{ identities.email || copy.unbound }}</text>
                <text v-if="identities.email && !identities.emailLoginEnabled" class="account-drawer-row-note">{{ copy.emailPasswordRequired }}</text>
              </view>
              <view v-if="identities.emailLoginEnabled" class="account-drawer-bound">
                <uni-icons type="checkmarkempty" size="13" color="#ffffff" />
                <text>{{ copy.bound }}</text>
              </view>
              <text v-else class="account-drawer-bind">{{ copy.bind }}</text>
            </button>
            <button class="account-drawer-row identity-row" @tap="openBinding('phone')">
              <view class="account-drawer-icon"><uni-icons type="phone" size="20" color="#263243" /></view>
              <view class="account-drawer-row-copy">
                <text class="account-drawer-row-title">{{ copy.phone }}</text>
                <text class="account-drawer-row-detail">{{ identities.phoneE164 ? maskedPhone : copy.unbound }}</text>
                <text v-if="identities.phoneE164 && !identities.phoneLoginEnabled" class="account-drawer-row-note">{{ copy.phoneLoginUnavailable }}</text>
              </view>
              <view v-if="identities.phoneE164" class="account-drawer-bound">
                <uni-icons type="checkmarkempty" size="13" color="#ffffff" />
                <text>{{ copy.bound }}</text>
              </view>
              <text v-else class="account-drawer-bind">{{ copy.bind }}</text>
            </button>
          </view>
          <text class="account-drawer-help">{{ copy.bindingHint }}</text>

          <view class="account-drawer-card account-drawer-settings-card">
            <button class="account-drawer-row" @tap="showLanguageSheet = true">
              <view class="account-drawer-icon"><image class="account-drawer-globe" src="/static/brand/account-globe.png" mode="aspectFit" /></view>
              <text class="account-drawer-setting-label">{{ copy.language }}</text>
              <text class="account-drawer-setting-value">{{ localeLabel }}</text>
              <uni-icons type="right" size="17" color="#7d8690" />
            </button>
            <button class="account-drawer-row" @tap="openLegalDocument('service')">
              <view class="account-drawer-icon"><uni-icons type="paperplane" size="20" color="#263243" /></view>
              <text class="account-drawer-setting-label">{{ copy.terms }}</text>
              <uni-icons type="right" size="17" color="#7d8690" />
            </button>
            <button class="account-drawer-row" @tap="openLegalDocument('privacy')">
              <view class="account-drawer-icon"><uni-icons type="locked" size="20" color="#263243" /></view>
              <text class="account-drawer-setting-label">{{ copy.privacy }}</text>
              <uni-icons type="right" size="17" color="#7d8690" />
            </button>
          </view>

          <button class="account-drawer-cancel" :disabled="sessionBusy" @tap="confirmCancellation">
            <uni-icons type="trash" size="20" color="#b75b55" />
            <text>{{ copy.cancelAccount }}</text>
            <uni-icons type="right" size="17" color="#b75b55" />
          </button>
          <button class="account-drawer-logout" :disabled="sessionBusy" @tap="logout">{{ copy.logout }}</button>
        </view>
      </scroll-view>
    </view>

    <view class="account-drawer-overlay-access">
      <ChatSheet :open="showLanguageSheet" :label="copy.language" @dismiss="showLanguageSheet = false">
        <view class="account-language-sheet">
          <view class="account-language-head">
            <text>{{ copy.language }}</text>
            <button :aria-label="copy.cancel" @tap="showLanguageSheet = false">×</button>
          </view>
          <scroll-view scroll-y class="account-language-list app-h5-scroll">
            <button v-for="option in localeOptionItems" :key="option.code" class="account-language-option" @tap="selectLanguage(option.code)">
              <text>{{ option.label }}</text>
              <uni-icons v-if="isCurrentLocale(option.code)" type="checkmarkempty" size="20" color="#b48b34" />
            </button>
          </scroll-view>
        </view>
      </ChatSheet>
    </view>
    <AccountCancelSheet ref="cancelSheet" @cancelled="finishCancelledAccount" />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getAccountIdentitiesApi, getMyProfileApi } from '@/api/index.js'
import AccountCancelSheet from '@/components/account/AccountCancelSheet.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
import { clearAuth, getUserInfo } from '@/utils/auth.js'
import { getAccountAvatar, getAccountName } from '@/utils/accountCenter.js'
import { currentLocale, currentLocaleMode, localeRuntime, t } from '@/utils/localeRuntime.js'
import { getAccountBindingMessages } from '@/utils/accountBindingMessages.js'
import { logoutPresence, stopPresence } from '@/utils/presence.js'
import { unregisterCurrentDevice } from '@/utils/pushNotifications.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  width: { type: Number, default: 300 },
  topInset: { type: Number, default: 28 }
})
const emit = defineEmits(['close'])
const copy = computed(() => getAccountBindingMessages(currentLocale.value))
const account = reactive({ name: '', avatar: '' })
const identities = reactive({ email: '', phoneE164: '', emailLoginEnabled: false, phoneLoginEnabled: false })
const identitiesLoading = ref(false)
const identitiesError = ref(false)
const showLanguageSheet = ref(false)
const cancelSheet = ref(null)
const sessionBusy = ref(false)
const localeOptions = ['auto', 'zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']
const localeNames = computed(() => ({
  auto: t('common.followRegion'),
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  en: 'English',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어'
}))
const localeOptionItems = computed(() => localeOptions.map(code => ({ code, label: localeNames.value[code] })))
const localeLabel = computed(() => localeNames.value[currentLocaleMode.value === 'auto' ? 'auto' : currentLocale.value])
const maskedPhone = computed(() => {
  const phone = identities.phoneE164 || ''
  return phone.length > 8 ? phone.slice(0, -8) + '••••' + phone.slice(-4) : phone
})
let requestVersion = 0
let swipeStart = null

function hydrateAccount(profile = {}, user = {}) {
  account.name = getAccountName(profile, user, t('common.user'))
  account.avatar = getAccountAvatar(profile, user)
}

async function refresh() {
  const version = ++requestVersion
  const user = getUserInfo() || {}
  hydrateAccount({}, user)
  identitiesLoading.value = true
  identitiesError.value = false
  const [identityResult, profileResult] = await Promise.allSettled([
    getAccountIdentitiesApi(),
    getMyProfileApi()
  ])
  if (version !== requestVersion) return
  if (profileResult.status === 'fulfilled') hydrateAccount(profileResult.value?.profile || {}, user)
  if (identityResult.status === 'fulfilled') {
    const data = identityResult.value || {}
    identities.email = data.email || ''
    identities.phoneE164 = data.phoneE164 || ''
    identities.emailLoginEnabled = !!data.emailLoginEnabled
    identities.phoneLoginEnabled = !!data.phoneLoginEnabled
  } else {
    identitiesError.value = true
  }
  identitiesLoading.value = false
}

function openBinding(type) {
  if (identitiesLoading.value || identitiesError.value) return
  if (type === 'email' && identities.emailLoginEnabled) return
  if (type === 'phone' && identities.phoneE164) return
  emit('close', { restore: false })
  uni.navigateTo({ url: type === 'email' ? '/pages/account/bindEmail' : '/pages/account/bindPhone' })
}

function openLegalDocument(type) {
  emit('close', { restore: false })
  uni.navigateTo({ url: type === 'service' ? '/pages/legal/userAgreement' : '/pages/legal/privacyPolicy' })
}

async function selectLanguage(selected) {
  showLanguageSheet.value = false
  try {
    if (selected === 'auto') await localeRuntime.setAutoLocale(uni.getSystemInfoSync()?.language)
    else await localeRuntime.setManualLocale(selected)
    uni.showToast({ title: t('common.languageSaved'), icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || error?.error || copy.value.loadError, icon: 'none' })
  }
}

function isCurrentLocale(code) {
  return currentLocaleMode.value === 'auto'
    ? code === 'auto'
    : code === currentLocale.value
}

async function logout() {
  if (sessionBusy.value) return
  sessionBusy.value = true
  await Promise.allSettled([logoutPresence(), unregisterCurrentDevice()])
  clearAuth()
  emit('close', { restore: false })
  uni.reLaunch({ url: '/pages/login/login360' })
}

function confirmCancellation() {
  if (!sessionBusy.value) void cancelSheet.value?.request()
}

function finishCancelledAccount() {
  stopPresence({ clearSession: true })
  clearAuth()
  emit('close', { restore: false })
  uni.reLaunch({ url: '/pages/login/login360' })
}

function dismissOverlay() {
  if (showLanguageSheet.value) {
    showLanguageSheet.value = false
    return true
  }
  return cancelSheet.value?.dismissIfOpen() || false
}

function startSwipe(event) {
  const touch = event.touches?.[0]
  swipeStart = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function cancelSwipe() { swipeStart = null }

function endSwipe(event) {
  const touch = event.changedTouches?.[0]
  if (!swipeStart || !touch) return
  const dx = touch.clientX - swipeStart.x
  const dy = touch.clientY - swipeStart.y
  swipeStart = null
  if (props.open && dx < -70 && -dx > Math.abs(dy) * 1.3) emit('close')
}

watch(() => props.open, value => {
  if (value) void refresh()
  else {
    showLanguageSheet.value = false
    cancelSheet.value?.dismissIfOpen()
  }
})
onBeforeUnmount(() => { requestVersion++ })
defineExpose({ refresh, dismissOverlay })
</script>

<style scoped>
.account-drawer-host{position:fixed;inset:0;z-index:200;pointer-events:none}
.account-drawer-host :deep(.chat-sheet-host),.account-drawer-host :deep(.bless-sheet-host){pointer-events:auto}
.account-drawer-overlay-access{pointer-events:auto}
.account-drawer-panel{position:absolute;top:0;bottom:0;left:0;width:var(--account-drawer-width);max-width:calc(100vw - 72px);background:#faf9f6;box-shadow:10px 0 26px rgba(42,39,34,.07);opacity:0;transform:translate3d(-100%,0,0);transition:transform 250ms cubic-bezier(.32,.72,0,1),opacity 200ms ease-out;overflow:hidden;pointer-events:none;box-sizing:border-box}
.account-drawer-panel.is-open{opacity:1;transform:translate3d(0,0,0);pointer-events:auto}
.account-drawer-scroll{height:100%}
.account-drawer-content{min-height:100%;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box}
.account-drawer-brand{display:flex;align-items:center;gap:7px;height:30px;color:#aa8434;font-family:Georgia,serif;font-size:17px;letter-spacing:3px}
.account-drawer-brand image{width:25px;height:25px;flex:none}
.account-drawer-title{display:block;margin-top:16px;color:#263243;font-size:23px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}
.account-drawer-profile{display:flex;align-items:center;gap:11px;margin:17px 0 20px;min-width:0}
.account-drawer-avatar{width:50px;height:50px;flex:none;border-radius:50%;background:#e4ddcd;object-fit:cover}
.account-drawer-avatar.is-placeholder{display:flex;align-items:center;justify-content:center;background:#c3a052}
.account-drawer-profile-copy{display:flex;flex-direction:column;min-width:0;gap:3px}
.account-drawer-name{color:#263243;font-size:16px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}
.account-drawer-caption{color:#8d929a;font-size:11px;line-height:1.4}
.account-drawer-section-title{display:block;margin:0 1px 7px;color:#8d929a;font-size:11px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.account-drawer-card,.account-drawer-state-card{border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(54,48,39,.05);overflow:hidden}
.account-drawer-row{display:flex;align-items:center;width:100%;min-height:60px;gap:8px;margin:0;padding:10px 11px;border:0;border-radius:0;background:transparent;text-align:left;box-sizing:border-box;color:#263243}
.account-drawer-row::after,.account-drawer-retry::after,.account-drawer-cancel::after,.account-drawer-logout::after,.account-language-sheet button::after{border:0}
.account-drawer-row+.account-drawer-row{border-top:1px solid #eeece8}
.account-drawer-row:active{background:#f9f7f1}
.account-drawer-icon{display:flex;align-items:center;justify-content:center;width:22px;flex:none}
.account-drawer-globe{display:block;width:21px;height:21px}
.account-drawer-row-copy{display:flex;flex:1;flex-direction:column;min-width:0;gap:2px}
.account-drawer-row-title{font-size:13px;font-weight:620;line-height:1.35;overflow-wrap:anywhere}
.account-drawer-row-detail{color:#8a909a;font-size:11px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.account-drawer-row-note{color:#ae8734;font-size:10px;line-height:1.3;overflow-wrap:anywhere}
.account-drawer-bound{display:flex;align-items:center;gap:4px;color:#aa8434;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap;flex:none}
.account-drawer-bound .uni-icons{display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#b89445}
.account-drawer-bind{padding:5px 8px;border:1px solid #b89445;border-radius:99px;color:#a57b27;font-size:11px;font-weight:650;line-height:1.2;white-space:nowrap;flex:none}
.account-drawer-help{display:block;margin:8px 2px 14px;color:#8a909a;font-size:11px;line-height:1.45;overflow-wrap:anywhere}
.account-drawer-settings-card .account-drawer-row{min-height:52px}
.account-drawer-setting-label{flex:1;min-width:0;font-size:13px;line-height:1.35;overflow-wrap:anywhere}
.account-drawer-setting-value{max-width:45%;color:#8d929a;font-size:11px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.account-drawer-cancel{display:flex;align-items:center;gap:8px;width:100%;min-height:50px;margin:16px 0 0;padding:8px 12px;border:0;border-radius:15px;background:#fff;color:#b75b55;text-align:left;box-shadow:0 5px 18px rgba(54,48,39,.05)}
.account-drawer-cancel text{flex:1;font-size:13px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.account-drawer-cancel:active{background:#fff9f7}
.account-drawer-logout{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;margin:16px 0 0;padding:8px;border:1px solid #b89445;border-radius:99px;background:transparent;color:#a57b27;font-size:14px;font-weight:650;line-height:1.3;text-align:center;transition:transform 150ms cubic-bezier(.23,1,.32,1)}
.account-drawer-logout:active{transform:scale(.985)}
.account-drawer-state-card{display:flex;align-items:center;justify-content:space-between;min-height:72px;gap:8px;padding:12px;color:#8a909a;font-size:12px;line-height:1.45}
.account-drawer-state-card text{min-width:0;flex:1;overflow-wrap:anywhere}
.account-drawer-retry{flex:none;margin:0;padding:7px 11px;border:1px solid #b89445;border-radius:99px;background:#fff;color:#a57b27;font-size:12px;line-height:1.2}
.account-language-sheet{padding:19px 20px calc(22px + env(safe-area-inset-bottom));color:#263243}
.account-language-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:5px;font-size:20px;font-weight:650}
.account-language-head button{display:flex;align-items:center;justify-content:center;width:42px;height:42px;margin:0;padding:0;border:0;border-radius:50%;background:#fff;color:#555;font-size:25px}
.account-language-list{max-height:60vh}
.account-language-option{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:54px;margin:0;padding:9px 4px;border:0;border-radius:0;background:transparent;color:#263243;font-size:15px;text-align:left}
.account-language-option+.account-language-option{border-top:1px solid #ebe8e2}
@media(max-height:740px){
  .account-drawer-content{padding-bottom:calc(12px + env(safe-area-inset-bottom))}
  .account-drawer-brand{height:28px}
  .account-drawer-title{margin-top:10px;font-size:21px}
  .account-drawer-profile{margin:12px 0;gap:9px}
  .account-drawer-avatar{width:46px;height:46px}
  .account-drawer-section-title{margin-bottom:6px}
  .account-drawer-identity-card .account-drawer-row{min-height:54px;padding:8px 10px}
  .account-drawer-help{margin:5px 2px 10px}
  .account-drawer-settings-card .account-drawer-row{min-height:48px;padding:8px 10px}
  .account-drawer-cancel{min-height:45px;margin-top:10px}
  .account-drawer-logout{min-height:44px;margin-top:10px}
}
@media(prefers-reduced-motion:reduce){.account-drawer-panel,.account-drawer-logout{transition:none}}
</style>
