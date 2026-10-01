<template>
  <view class="binding-page">
    <view class="binding-nav" :style="navStyle">
      <button class="back-button" hover-class="pressed" :style="{ top: geometry.contentTop + 'px', left: geometry.backLeft + 'px' }" :aria-label="copy.back" @click="goBack"><uni-icons type="left" size="23" color="#514e49" /></button>
      <text class="nav-title" :style="{ top: geometry.contentTop + 'px', left: geometry.titleLeft + 'px', width: geometry.titleWidth + 'px' }">{{ copy.emailTitle }}</text>
    </view>

    <view class="content" :style="{ paddingTop: navHeight + 'px' }">
      <view class="hero-card">
        <view class="hero-icon"><uni-icons type="email" size="30" color="#b9974a" /></view>
        <view class="hero-copy">
          <text class="hero-title">{{ identity?.emailLoginEnabled ? copy.emailBoundTitle : copy.emailHeroTitle }}</text>
          <text class="hero-body">{{ copy.emailHeroBody }}</text>
        </view>
      </view>

      <view v-if="loadingIdentity" class="state-card"><text>{{ copy.loading }}</text></view>
      <view v-else-if="loadFailed" class="state-card error-state"><text>{{ copy.loadError }}</text><button class="retry-button" @click="loadIdentity">{{ copy.retry }}</button></view>
      <view v-else-if="identity?.emailLoginEnabled" class="state-card bound-card">
        <view class="bound-mark">✓</view>
        <text class="bound-label">{{ copy.bound }}</text>
        <text class="bound-value">{{ maskedEmail }}</text>
      </view>
      <template v-else>
        <view v-if="emailLocked" class="locked-note">{{ copy.emailLocked }}</view>
        <view class="form-card">
          <view class="field-block">
            <text class="field-label">{{ copy.emailAddress }}</text>
            <input v-model="form.email" class="field-input" type="text" :disabled="emailLocked || submitting" :placeholder="copy.emailPlaceholder" placeholder-class="placeholder" :aria-label="copy.emailAddress" :cursor-spacing="24" />
          </view>
          <view class="field-block">
            <text class="field-label">{{ copy.verificationCode }}</text>
            <view class="code-row">
              <input :value="form.code" class="field-input code-input" type="number" maxlength="6" :placeholder="copy.codePlaceholder" placeholder-class="placeholder" :aria-label="copy.verificationCode" :cursor-spacing="24" @input="onCodeInput" />
              <button class="code-button" hover-class="pressed" :disabled="submitting || !identity?.bindingCodeEnabled" @click="showLocalCode">{{ copy.sendCode }}</button>
            </view>
          </view>
          <view class="field-block">
            <text class="field-label">{{ copy.password }}</text>
            <view class="password-row"><input v-model="form.password" class="field-input password-input" type="text" :password="!passwordVisible" :placeholder="copy.passwordPlaceholder" placeholder-class="placeholder" :aria-label="copy.password" :cursor-spacing="24" /><button class="eye-button" :aria-label="passwordVisible ? copy.hidePassword : copy.showPassword" @click="passwordVisible = !passwordVisible"><uni-icons :type="passwordVisible ? 'eye-slash' : 'eye'" size="22" color="#77746e" /></button></view>
          </view>
          <view class="field-block last-block">
            <text class="field-label">{{ copy.passwordConfirm }}</text>
            <view class="password-row"><input v-model="form.confirmPassword" class="field-input password-input" type="text" :password="!confirmVisible" :placeholder="copy.passwordConfirmPlaceholder" placeholder-class="placeholder" :aria-label="copy.passwordConfirm" :cursor-spacing="24" /><button class="eye-button" :aria-label="confirmVisible ? copy.hidePassword : copy.showPassword" @click="confirmVisible = !confirmVisible"><uni-icons :type="confirmVisible ? 'eye-slash' : 'eye'" size="22" color="#77746e" /></button></view>
          </view>
        </view>
        <text class="password-hint">{{ copy.passwordHint }}</text>
        <text v-if="!identity?.bindingCodeEnabled" class="unavailable-note">{{ copy.bindingUnavailable }}</text>
      </template>
    </view>

    <view v-if="!loadingIdentity && !loadFailed && !identity?.emailLoginEnabled" class="bottom-action">
      <button class="confirm-button" hover-class="confirm-pressed" :disabled="submitting || !identity?.bindingCodeEnabled" @click="submitBinding">{{ submitting ? copy.processing : copy.confirmBinding }}</button>
      <text class="bottom-note">{{ copy.bindingNote }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onPageScroll, onResize, onShow } from '@dcloudio/uni-app'
import { bindEmailApi, getAccountIdentitiesApi } from '@/api/index.js'
import { getUserInfo, setUserInfo } from '@/utils/auth.js'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import { getAccountBindingMessages } from '@/utils/accountBindingMessages.js'
import { currentLocale } from '@/utils/localeRuntime.js'

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
const passwordVisible = ref(false)
const confirmVisible = ref(false)
const form = reactive({ email: '', code: '', password: '', confirmPassword: '' })
let loadRevision = 0

const emailLocked = computed(() => !!identity.value?.email && !identity.value?.emailLoginEnabled)
const maskedEmail = computed(() => {
  const email = String(identity.value?.email || '')
  const [name, domain] = email.split('@')
  return name && domain ? `${name[0]}${'*'.repeat(Math.min(4, Math.max(1, name.length - 1)))}@${domain}` : email
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
    if (data?.email && !data.emailLoginEnabled) form.email = data.email
  } catch (_) {
    if (revision !== loadRevision) return
    identity.value = null
    loadFailed.value = true
  } finally {
    if (revision === loadRevision) loadingIdentity.value = false
  }
}

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index360' })
}
function toast(key) { uni.showToast({ title: copy.value[key], icon: 'none', duration: 2600 }) }
function onCodeInput(event) {
  const code = String(event?.detail?.value || '').replace(/\D/g, '').slice(0, 6)
  form.code = code
  return code
}
function validEmail() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) }
function utf8ByteLength(value) {
  let bytes = 0
  for (const character of value) {
    const point = character.codePointAt(0)
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4
  }
  return bytes
}
function showLocalCode() {
  if (!identity.value?.bindingCodeEnabled) return toast('codeUnavailable')
  if (!validEmail()) return toast('invalidEmail')
  toast('codeReady')
}

function saveIdentity(data) {
  const stored = getUserInfo() || {}
  const { password: _password, passwordHash: _passwordHash, ...safeStored } = stored
  const { password: _returnedPassword, passwordHash: _returnedHash, ...safeReturned } = data?.user || {}
  setUserInfo({ ...safeStored, ...safeReturned, email: data?.email || form.email.trim(), emailLoginEnabled: true, phoneE164: data?.phoneE164 ?? safeReturned.phoneE164 ?? safeStored.phoneE164 })
  uni.$emit?.('account-identity-changed')
}

async function submitBinding() {
  if (submitting.value || loadingIdentity.value || loadFailed.value) return
  if (identity.value?.emailLoginEnabled) return toast('alreadyBound')
  if (!identity.value?.bindingCodeEnabled) return toast('bindingUnavailable')
  const email = form.email.trim().toLowerCase()
  if (!validEmail()) return toast('invalidEmail')
  if (emailLocked.value && email !== String(identity.value.email).toLowerCase()) return toast('invalidEmail')
  if (!/^\d{6}$/.test(form.code)) return toast('invalidCode')
  const categories = [/[0-9]/, /[A-Z]/, /[a-z]/, /[^A-Za-z0-9\s]/].filter(pattern => pattern.test(form.password)).length
  if (form.password.length < 8 || form.password.length > 20 || categories < 2) return toast('invalidPassword')
  if (utf8ByteLength(form.password) > 72) return toast('passwordTooLong')
  if (form.password !== form.confirmPassword) return toast('passwordMismatch')
  submitting.value = true
  try {
    const result = await bindEmailApi({ email, password: form.password, code: form.code }, { silent: true })
    let fresh = result
    try { fresh = { ...result, ...await getAccountIdentitiesApi({ silent: true }) } } catch (_) { /* The mutation succeeded; the drawer refreshes on return. */ }
    saveIdentity(fresh)
    form.password = ''
    form.confirmPassword = ''
    uni.showToast({ title: copy.value.bindSuccess, icon: 'success' })
    goBack()
  } catch (error) {
    const detail = String(error?.error || error?.message || error?.code || '')
    const key = error?.statusCode === 409
      ? (/被其他账号使用|已被注册/.test(detail) ? 'identityExists' : 'identityChanged')
      : error?.statusCode === 400
        ? (/验证码/.test(detail) ? 'codeIncorrect' : /密码/.test(detail) ? (utf8ByteLength(form.password) > 72 ? 'passwordTooLong' : 'invalidPassword') : /邮箱/.test(detail) ? 'invalidEmail' : 'bindFailed')
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
.back-button::after, .eye-button::after, .code-button::after, .retry-button::after { border: none; }
.pressed, .back-button:active, .eye-button:active, .code-button:active { transform: scale(.97); }
.nav-title { position: absolute; height: 44px; line-height: 44px; text-align: center; font-size: 19px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content { padding: 0 18px calc(180px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.hero-card, .form-card, .state-card { background: #fff; border-radius: 26px; box-shadow: 0 12px 36px rgba(79,66,43,.035); }
.hero-card { display: flex; align-items: center; gap: 18px; padding: 24px 20px; margin: 18px 0 20px; }
.hero-icon { flex: 0 0 54px; height: 54px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: #f8f5ed; }
.hero-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.hero-title { font-size: 18px; line-height: 1.35; font-weight: 700; }
.hero-body { font-size: 13px; line-height: 1.55; color: #88847e; }
.form-card { padding: 3px 18px; }
.field-block { padding: 18px 0; border-bottom: 1px solid #eceae6; }
.last-block { border-bottom: 0; }
.field-label { display: block; font-size: 14px; font-weight: 650; line-height: 1.4; margin-bottom: 10px; }
.field-input { width: 100%; height: 39px; min-height: 39px; font-size: 16px; color: #252522; background: transparent; }
.placeholder { color: #aaa7a2; }
.code-row, .password-row { display: flex; align-items: center; gap: 10px; }
.code-input, .password-input { flex: 1; min-width: 0; }
.code-button { flex: 0 0 auto; max-width: 46%; min-height: 38px; padding: 7px 11px; margin: 0; border: 1px solid #bea05c; border-radius: 16px; color: #aa8435; background: #fff; font-size: 12px; font-weight: 600; line-height: 1.2; white-space: normal; transition: transform 140ms ease-out; }
.code-button[disabled] { opacity: .45; }
.eye-button { width: 36px; height: 40px; flex: 0 0 36px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: transparent; transition: transform 140ms ease-out; }
.password-hint, .unavailable-note, .locked-note { display: block; color: #8c8882; font-size: 12px; line-height: 1.6; }
.password-hint { margin: 14px 16px 0; }
.unavailable-note { margin: 12px 16px 0; color: #9e7e42; }
.locked-note { background: #f0e9d8; border-radius: 16px; color: #8b703b; padding: 12px 16px; margin: 0 0 14px; }
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
@media (prefers-reduced-motion: reduce) { .back-button, .eye-button, .code-button, .confirm-button, .binding-nav { transition-duration: 0ms; } }
</style>
