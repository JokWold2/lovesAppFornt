<template>
  <view class="binding-page">
    <view class="binding-nav" :style="navStyle">
      <button class="back-button" hover-class="pressed" :style="{ top: geometry.contentTop + 'px', left: geometry.backLeft + 'px' }" :aria-label="copy.back" @click="goBack"><uni-icons type="left" size="23" color="#514e49" /></button>
      <text class="nav-title" :style="{ top: geometry.contentTop + 'px', left: geometry.titleLeft + 'px', width: geometry.titleWidth + 'px' }">{{ copy.phoneTitle }}</text>
    </view>

    <view class="content" :style="{ paddingTop: navHeight + 'px' }">
      <view class="hero-card">
        <view class="hero-icon"><uni-icons type="phone" size="30" color="#b9974a" /></view>
        <view class="hero-copy">
          <text class="hero-title">{{ identity?.phoneE164 ? copy.phoneBoundTitle : copy.phoneHeroTitle }}</text>
          <text class="hero-body">{{ copy.phoneHeroBody }}</text>
        </view>
      </view>

      <view v-if="loadingIdentity" class="state-card"><text>{{ copy.loading }}</text></view>
      <view v-else-if="loadFailed" class="state-card error-state"><text>{{ copy.loadError }}</text><button class="retry-button" @click="loadIdentity">{{ copy.retry }}</button></view>
      <view v-else-if="identity?.phoneE164" class="state-card bound-card">
        <view class="bound-mark">✓</view>
        <text class="bound-label">{{ identity.phoneLoginEnabled ? copy.bound : copy.phoneLoginUnavailable }}</text>
        <text class="bound-value">{{ maskedPhone }}</text>
      </view>
      <template v-else>
        <view class="form-card">
          <view class="field-block">
            <text class="field-label">{{ copy.countryRegion }}</text>
            <button class="country-button" hover-class="pressed" :aria-label="copy.countryRegion" @click="openPicker"><text class="country-name">{{ countryName }} <text class="dial-code">{{ selectedCountry?.dialCode || '+86' }}</text></text><uni-icons type="right" size="19" color="#64615d" /></button>
          </view>
          <view class="field-block">
            <text class="field-label">{{ copy.phoneNumber }}</text>
            <view class="outlined-field"><input :value="form.phoneNumber" class="field-input" type="number" maxlength="15" :placeholder="copy.phonePlaceholder" placeholder-class="placeholder" :aria-label="copy.phoneNumber" :cursor-spacing="24" @input="onPhoneInput" /></view>
          </view>
          <view class="field-block last-block">
            <text class="field-label">{{ copy.verificationCode }}</text>
            <view class="outlined-field code-row"><input :value="form.code" class="field-input code-input" type="number" maxlength="6" :placeholder="copy.codePlaceholder" placeholder-class="placeholder" :aria-label="copy.verificationCode" :cursor-spacing="24" @input="onCodeInput" /><button class="code-button" hover-class="pressed" :disabled="submitting || !identity?.bindingCodeEnabled" @click="showLocalCode">{{ copy.sendCode }}</button></view>
          </view>
        </view>
        <text v-if="!identity?.bindingCodeEnabled" class="unavailable-note">{{ copy.bindingUnavailable }}</text>
      </template>
    </view>

    <view v-if="!loadingIdentity && !loadFailed && !identity?.phoneE164" class="bottom-action">
      <button class="confirm-button" hover-class="confirm-pressed" :disabled="submitting || !identity?.bindingCodeEnabled" @click="submitBinding">{{ submitting ? copy.processing : copy.confirmBinding }}</button>
      <text class="bottom-note">{{ copy.bindingNote }}</text>
    </view>

    <PhoneCountryPicker :open="countryPickerOpen" :selected-iso2="form.countryIso2" :locale="currentLocale" @close="dismissPicker" @select="selectCountry" @after-close="countryPickerClosing = false" />
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onBackPress, onPageScroll, onResize, onShow } from '@dcloudio/uni-app'
import { bindPhoneApi, getAccountIdentitiesApi } from '@/api/index.js'
import { getUserInfo, setUserInfo } from '@/utils/auth.js'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import { getAccountBindingMessages } from '@/utils/accountBindingMessages.js'
import { currentLocale } from '@/utils/localeRuntime.js'
import { PHONE_COUNTRIES, getPhoneCountryName } from '@/utils/phoneCountries.js'
import PhoneCountryPicker from '@/components/login/PhoneCountryPicker.vue'

let platform = ''
// #ifdef MP-WEIXIN
platform = 'mp-weixin'
// #endif
const geometry = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, platform))
const navHeight = computed(() => geometry.value.contentTop + 54)
const scrollTop = ref(0)
const navStyle = computed(() => {
  const opacity = Math.min(.96, Math.max(0, scrollTop.value / 46) * .96)
  return { backgroundColor: `rgba(247,245,241,${opacity})`, backdropFilter: `blur(${opacity * 12}px)`, WebkitBackdropFilter: `blur(${opacity * 12}px)` }
})
const copy = computed(() => getAccountBindingMessages(currentLocale.value))
const identity = ref(null)
const loadingIdentity = ref(true)
const loadFailed = ref(false)
const submitting = ref(false)
const countryPickerOpen = ref(false)
const countryPickerClosing = ref(false)
let loadRevision = 0

function readCountryIso2() {
  try {
    const iso2 = uni.getStorageSync('PHONE_LOGIN_COUNTRY_ISO2')
    return PHONE_COUNTRIES.some(country => country.iso2 === iso2) ? iso2 : 'CN'
  } catch (_) { return 'CN' }
}
const form = reactive({ countryIso2: readCountryIso2(), phoneNumber: '', code: '' })
const selectedCountry = computed(() => PHONE_COUNTRIES.find(country => country.iso2 === form.countryIso2))
const countryName = computed(() => selectedCountry.value ? getPhoneCountryName(selectedCountry.value, currentLocale.value) : '')
const maskedPhone = computed(() => {
  const raw = String(identity.value?.phoneE164 || '')
  return raw.length > 7 ? `${raw.slice(0, 4)}••••${raw.slice(-4)}` : raw
})

function updateGeometry() { geometry.value = readChatHeaderGeometry(uni, { clearCapsule: false }, platform) }
onResize(updateGeometry)
onPageScroll(event => { scrollTop.value = Math.max(0, Number(event?.scrollTop) || 0) })
onShow(() => { updateGeometry(); void loadIdentity() })

async function loadIdentity() {
  const revision = ++loadRevision
  loadingIdentity.value = true
  loadFailed.value = false
  try {
    const data = await getAccountIdentitiesApi({ silent: true })
    if (revision !== loadRevision) return
    if (!data || typeof data !== 'object') throw new Error('invalid identities response')
    identity.value = data
  } catch (_) {
    if (revision !== loadRevision) return
    identity.value = null
    loadFailed.value = true
  } finally {
    if (revision === loadRevision) loadingIdentity.value = false
  }
}

function goBack() {
  if (countryPickerOpen.value) { dismissPicker(); return }
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index360' })
}
onBackPress(() => {
  if (countryPickerClosing.value) return true
  if (countryPickerOpen.value) { dismissPicker(); return true }
  return false
})
function openPicker() { if (!submitting.value) { countryPickerClosing.value = false; countryPickerOpen.value = true } }
function dismissPicker() { if (countryPickerOpen.value) countryPickerClosing.value = true; countryPickerOpen.value = false }
function selectCountry(country) {
  form.countryIso2 = country.iso2
  form.phoneNumber = ''
  dismissPicker()
  try { uni.setStorageSync('PHONE_LOGIN_COUNTRY_ISO2', country.iso2) } catch (_) { /* Current selection remains usable. */ }
}
function toast(key) { uni.showToast({ title: copy.value[key], icon: 'none', duration: 2600 }) }
function onPhoneInput(event) {
  const phone = String(event?.detail?.value || '').replace(/\D/g, '').slice(0, 15)
  form.phoneNumber = phone
  return phone
}
function onCodeInput(event) {
  const code = String(event?.detail?.value || '').replace(/\D/g, '').slice(0, 6)
  form.code = code
  return code
}
function validPhone() { return !!selectedCountry.value && /^\d{4,15}$/.test(form.phoneNumber) }
function showLocalCode() {
  if (!identity.value?.bindingCodeEnabled) return toast('codeUnavailable')
  if (!validPhone()) return toast('invalidPhone')
  toast('codeReady')
}

function saveIdentity(data) {
  const stored = getUserInfo() || {}
  const { password: _password, passwordHash: _passwordHash, ...safeStored } = stored
  const { password: _returnedPassword, passwordHash: _returnedHash, ...safeReturned } = data?.user || {}
  const phoneE164 = data?.phoneE164 || `${selectedCountry.value.dialCode}${form.phoneNumber}`
  setUserInfo({ ...safeStored, ...safeReturned, phoneE164, phoneLoginEnabled: true, email: data?.email ?? safeReturned.email ?? safeStored.email })
  uni.$emit?.('account-identity-changed')
}

async function submitBinding() {
  if (submitting.value || loadingIdentity.value || loadFailed.value) return
  if (identity.value?.phoneE164) return toast('alreadyBound')
  if (!identity.value?.bindingCodeEnabled) return toast('bindingUnavailable')
  if (!validPhone()) return toast('invalidPhone')
  if (!/^\d{6}$/.test(form.code)) return toast('invalidCode')
  submitting.value = true
  try {
    const result = await bindPhoneApi({ countryIso2: form.countryIso2, dialCode: selectedCountry.value.dialCode, phoneNumber: form.phoneNumber, code: form.code }, { silent: true })
    let fresh = result
    try { fresh = { ...result, ...await getAccountIdentitiesApi({ silent: true }) } } catch (_) { /* The mutation succeeded; the drawer refreshes on return. */ }
    saveIdentity(fresh)
    uni.showToast({ title: copy.value.bindSuccess, icon: 'success' })
    goBack()
  } catch (error) {
    const detail = String(error?.error || error?.message || error?.code || '')
    const key = error?.statusCode === 409
      ? (/被其他账号使用|已被注册/.test(detail) ? 'identityExists' : 'identityChanged')
      : error?.statusCode === 400
        ? (/验证码/.test(detail) ? 'codeIncorrect' : 'invalidPhone')
        : error?.statusCode === 403 ? 'bindingUnavailable' : 'bindFailed'
    toast(key)
    if (error?.statusCode === 409) await loadIdentity()
  } finally { submitting.value = false }
}
</script>

<style scoped>
.binding-page { min-height: 100vh; background: #f7f5f1; color: #252522; box-sizing: border-box; }
.binding-nav { position: fixed; z-index: 10; top: 0; left: 0; right: 0; transition: background-color 180ms ease-out; }
.back-button { position: absolute; width: 44px; height: 44px; padding: 0; border-radius: 50%; background: rgba(255,255,255,.95); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(53,44,20,.07); transition: transform 140ms ease-out; }
.back-button::after, .country-button::after, .code-button::after, .retry-button::after { border: none; }
.pressed, .back-button:active, .country-button:active, .code-button:active { transform: scale(.97); }
.nav-title { position: absolute; height: 44px; line-height: 44px; text-align: center; font-size: 19px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content { padding: 0 18px calc(180px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.hero-card, .form-card, .state-card { background: #fff; border-radius: 26px; box-shadow: 0 12px 36px rgba(79,66,43,.035); }
.hero-card { display: flex; align-items: center; gap: 18px; padding: 24px 20px; margin: 18px 0 20px; }
.hero-icon { flex: 0 0 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f8f5ed; }
.hero-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.hero-title { font-size: 18px; line-height: 1.35; font-weight: 700; }
.hero-body { font-size: 13px; line-height: 1.55; color: #88847e; }
.form-card { padding: 2px 18px; }
.field-block { padding: 18px 0; border-bottom: 1px solid #eceae6; }
.last-block { border-bottom: 0; }
.field-label { display: block; font-size: 14px; font-weight: 650; line-height: 1.4; margin-bottom: 11px; }
.country-button, .outlined-field { width: 100%; box-sizing: border-box; min-height: 54px; border: 1px solid #e5e2dc; border-radius: 12px; background: #fff; }
.country-button { margin: 0; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; text-align: left; font-size: 16px; line-height: 1.4; transition: transform 140ms ease-out; }
.country-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dial-code { margin-left: 8px; }
.outlined-field { display: flex; align-items: center; padding: 0 15px; }
.field-input { width: 100%; min-width: 0; height: 50px; font-size: 16px; color: #252522; background: transparent; }
.placeholder { color: #aaa7a2; }
.code-row { gap: 8px; padding-right: 5px; }
.code-input { flex: 1; }
.code-button { flex: 0 0 auto; max-width: 46%; min-height: 38px; margin: 0; padding: 7px 11px; border: 1px solid #bea05c; border-radius: 16px; color: #aa8435; background: #fff; font-size: 12px; font-weight: 600; line-height: 1.2; white-space: normal; transition: transform 140ms ease-out; }
.code-button[disabled] { opacity: .45; }
.unavailable-note { display: block; margin: 12px 16px 0; color: #9e7e42; font-size: 12px; line-height: 1.6; }
.state-card { padding: 27px 20px; text-align: center; color: #77736d; font-size: 14px; }
.error-state { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.retry-button { margin: 0; padding: 0 20px; color: #ae8c42; border: 1px solid #c4a45d; border-radius: 18px; line-height: 36px; font-size: 14px; background: white; }
.bound-card { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.bound-mark { width: 42px; height: 42px; border-radius: 50%; line-height: 42px; background: #d3ba7d; color: white; font-size: 24px; }
.bound-label { color: #a7863e; font-weight: 700; }
.bound-value { color: #36332e; word-break: break-all; }
.bottom-action { position: fixed; z-index: 9; bottom: 0; left: 0; right: 0; padding: 18px 18px calc(24px + env(safe-area-inset-bottom)); background: linear-gradient(to bottom, rgba(247,245,241,0), #f7f5f1 20%); }
.confirm-button { width: 100%; height: 52px; margin: 0; border: none; border-radius: 24px; color: #fff; background: #bea05e; font-weight: 700; font-size: 17px; line-height: 52px; transition: transform 140ms ease-out, opacity 140ms ease-out; }
.confirm-button::after { border: 0; }
.confirm-button:active, .confirm-pressed { transform: scale(.98); }
.confirm-button[disabled] { opacity: .45; }
.bottom-note { display: block; text-align: center; margin-top: 11px; color: #99958f; font-size: 12px; line-height: 1.5; }
@media (prefers-reduced-motion: reduce) { .back-button, .country-button, .code-button, .confirm-button, .binding-nav { transition-duration: 0ms; } }
</style>
