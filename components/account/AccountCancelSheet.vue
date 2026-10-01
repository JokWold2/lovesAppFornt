<template>
  <view class="account-cancel-host">
    <BlessDialog ref="confirmDialog" />
    <ChatSheet :open="sheetOpen" :busy="submitting" :label="copy.cancelAuthTitle" @dismiss="dismiss">
      <view class="account-cancel-sheet">
        <view class="account-cancel-head">
          <text class="account-cancel-title">{{ copy.cancelAuthTitle }}</text>
          <button class="account-cancel-close" :disabled="submitting" :aria-label="copy.cancel" @tap="dismiss">×</button>
        </view>
        <text class="account-cancel-hint">{{ copy.cancelAuthHint }}</text>
        <text class="account-cancel-label">{{ mode === 'password' ? copy.cancelPasswordLabel : copy.cancelCodeLabel }}</text>
        <view class="account-cancel-field">
          <input
            v-if="mode === 'password'"
            v-model="password"
            class="account-cancel-input"
            type="text"
            :password="!passwordVisible"
            :placeholder="copy.cancelPasswordPlaceholder"
            :aria-label="copy.cancelPasswordLabel"
            :cursor-spacing="24"
            maxlength="72"
          />
          <input
            v-else
            v-model="code"
            class="account-cancel-input"
            type="number"
            :placeholder="copy.cancelCodePlaceholder"
            :aria-label="copy.cancelCodeLabel"
            :cursor-spacing="24"
            maxlength="6"
          />
          <button
            v-if="mode === 'password'"
            class="account-cancel-visibility"
            :aria-label="passwordVisible ? copy.hidePassword : copy.showPassword"
            @tap="passwordVisible = !passwordVisible"
          ><uni-icons :type="passwordVisible ? 'eye-slash' : 'eye'" size="20" color="#77736d" /></button>
        </view>
        <button v-if="mode === 'code' && bindingCodeEnabled" class="account-cancel-view-code" @tap="showCode">{{ copy.sendCode }}</button>
        <text v-if="errorMessage" class="account-cancel-error">{{ errorMessage }}</text>
        <view class="account-cancel-actions">
          <button class="account-cancel-secondary" :disabled="submitting" @tap="dismiss">{{ copy.cancel }}</button>
          <button class="account-cancel-primary" :disabled="submitting || !canSubmit" @tap="submit">{{ submitting ? copy.processing : copy.cancelSubmit }}</button>
        </view>
      </view>
    </ChatSheet>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BlessDialog from '@/components/common/BlessDialog.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
import { cancelAccountApi, getAccountIdentitiesApi } from '@/api/index.js'
import { currentLocale } from '@/utils/localeRuntime.js'
import { getAccountBindingMessages } from '@/utils/accountBindingMessages.js'

const emit = defineEmits(['cancelled'])
const copy = computed(() => getAccountBindingMessages(currentLocale.value))
const confirmDialog = ref(null)
const sheetOpen = ref(false)
const submitting = ref(false)
const requesting = ref(false)
const mode = ref('password')
const password = ref('')
const code = ref('')
const passwordVisible = ref(false)
const bindingCodeEnabled = ref(false)
const errorMessage = ref('')
const canSubmit = computed(() => mode.value === 'password' ? password.value.length > 0 : /^\d{6}$/.test(code.value))

function errorText(error, socialOnly = false) {
  return error?.statusCode === 401 || (socialOnly && error?.statusCode === 403)
    ? copy.value.cancelReauthRequired
    : copy.value.cancelVerifyFailed
}

function showError(message) {
  uni.showToast({ title: message, icon: 'none' })
}

async function request() {
  if (requesting.value || submitting.value || sheetOpen.value) return
  requesting.value = true
  try {
    const confirmation = await confirmDialog.value?.open({
      title: copy.value.cancelConfirmTitle,
      content: copy.value.cancelConfirmContent,
      cancelText: copy.value.cancel,
      confirmText: copy.value.confirm,
      tone: 'danger'
    })
    if (!confirmation?.confirm) return
    let identities
    try {
      identities = await getAccountIdentitiesApi({ silent: true, skipAuthRedirect: true })
    } catch (error) {
      showError(error?.statusCode === 401 ? copy.value.cancelReauthRequired : copy.value.loadError)
      return
    }
    if (identities?.emailLoginEnabled) {
      mode.value = 'password'
      openSheet()
    } else if (identities?.phoneE164) {
      bindingCodeEnabled.value = !!identities.bindingCodeEnabled
      if (!bindingCodeEnabled.value) {
        showError(copy.value.cancelPhoneUnavailable)
        return
      }
      mode.value = 'code'
      openSheet()
    } else {
      await submitSocial()
    }
  } finally {
    requesting.value = false
  }
}

function openSheet() {
  password.value = ''
  code.value = ''
  passwordVisible.value = false
  errorMessage.value = ''
  sheetOpen.value = true
}

function dismiss() {
  if (submitting.value) return
  sheetOpen.value = false
  password.value = ''
  code.value = ''
  errorMessage.value = ''
}

function showCode() {
  if (!bindingCodeEnabled.value || mode.value !== 'code') return
  uni.showToast({ title: copy.value.codeReady, icon: 'none' })
}

function dismissIfOpen() {
  const dialogState = confirmDialog.value?.isOpen
  if (typeof dialogState === 'object' ? dialogState?.value : dialogState) {
    confirmDialog.value.close()
    return true
  }
  if (sheetOpen.value) {
    dismiss()
    return true
  }
  return requesting.value || submitting.value
}

async function submitSocial() {
  if (submitting.value) return
  submitting.value = true
  try {
    await cancelAccountApi({ confirm: true })
    emit('cancelled')
  } catch (error) {
    showError(errorText(error, true))
  } finally {
    submitting.value = false
  }
}

async function submit() {
  if (submitting.value || !canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await cancelAccountApi({
      confirm: true,
      ...(mode.value === 'password' ? { password: password.value } : { code: code.value })
    })
    sheetOpen.value = false
    password.value = ''
    code.value = ''
    emit('cancelled')
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    submitting.value = false
  }
}

defineExpose({ request, dismissIfOpen })
</script>

<style scoped>
.account-cancel-host{pointer-events:auto}
.account-cancel-sheet{padding:22px 20px calc(25px + env(safe-area-inset-bottom));color:#292825}
.account-cancel-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
.account-cancel-title{min-width:0;color:#292825;font-size:21px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
.account-cancel-close{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;margin:0;padding:0;border:0;border-radius:50%;background:#fff;color:#77736d;font-size:26px;line-height:1}
.account-cancel-hint{display:block;margin:13px 0 23px;color:#8d8880;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
.account-cancel-label{display:block;margin-bottom:9px;color:#3b3833;font-size:14px;font-weight:650;line-height:1.4}
.account-cancel-field{display:flex;align-items:center;min-height:54px;padding:0 15px;border-radius:18px;background:#fff}
.account-cancel-input{flex:1;min-width:0;height:52px;color:#292825;font-size:16px}
.account-cancel-visibility{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;margin:0;padding:0;border:0;background:transparent}
.account-cancel-view-code{display:flex;align-items:center;justify-content:center;min-height:44px;max-width:100%;margin:8px 0 0 auto;padding:7px 13px;border:1px solid #c2a052;border-radius:15px;background:#fffaf0;color:#98762e;font-size:13px;font-weight:600;line-height:1.35;text-align:center;white-space:normal;overflow-wrap:anywhere}
.account-cancel-error{display:block;margin:10px 3px 0;color:#b75b55;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.account-cancel-actions{display:flex;gap:11px;margin-top:24px}
.account-cancel-actions button{display:flex;align-items:center;justify-content:center;flex:1;min-height:52px;margin:0;padding:10px;border:0;border-radius:17px;font-size:15px;font-weight:650;line-height:1.4;text-align:center}
.account-cancel-secondary{background:#fff;color:#6f6960}
.account-cancel-primary{background:var(--bless-primary,#c2a052);color:#302719}
.account-cancel-primary[disabled]{opacity:.5}
.account-cancel-actions button::after,.account-cancel-visibility::after,.account-cancel-close::after,.account-cancel-view-code::after{border:0}
@media(prefers-reduced-motion:reduce){.account-cancel-actions button{transition:none}}
</style>
