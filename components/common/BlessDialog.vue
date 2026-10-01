<template>
  <BlessSheet
    :open="opened"
    :busy="closing"
    :label="dialog.title || 'BLESS'"
    :z-index="1400"
    @dismiss="cancel"
    @after-close="afterClose"
  >
    <view class="bless-dialog" :class="`tone-${dialog.tone}`" role="dialog" aria-modal="true" :aria-label="dialog.title || 'BLESS'">
      <view class="bless-dialog-handle" aria-hidden="true" />
      <view class="bless-dialog-heading">
        <view class="bless-dialog-mark" aria-hidden="true"><text>{{ mark }}</text></view>
        <view class="bless-dialog-heading-copy">
          <text class="bless-dialog-brand">BLESS</text>
          <text class="bless-dialog-title">{{ dialog.title }}</text>
        </view>
      </view>
      <scroll-view v-if="dialog.content" class="bless-dialog-copy-scroll" :style="{ height: copyHeight + 'px' }" scroll-y :show-scrollbar="false">
        <text class="bless-dialog-copy">{{ dialog.content }}</text>
      </scroll-view>
      <view v-if="dialog.amount" class="bless-dialog-amount">
        <text>{{ dialog.amount }}</text>
      </view>
      <textarea
        v-if="dialog.editable"
        v-model="draft"
        class="bless-dialog-input"
        :placeholder="dialog.placeholderText"
        :maxlength="500"
        :auto-height="false"
        :adjust-position="true"
        :cursor-spacing="24"
      />
      <view class="bless-dialog-actions" :class="{ 'one-action': !dialog.showCancel }">
        <button v-if="dialog.showCancel" class="bless-dialog-button secondary" @click="cancel">{{ dialog.cancelText }}</button>
        <button class="bless-dialog-button primary" @click="confirm">{{ dialog.confirmText }}</button>
      </view>
    </view>
  </BlessSheet>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import BlessSheet from '@/components/common/BlessSheet.vue'
import { t } from '@/utils/localeRuntime.js'

const opened = ref(false)
const closing = ref(false)
const draft = ref('')
const copyHeight = ref(24)
const dialog = ref({
  title: '', content: '', confirmText: '', cancelText: '', showCancel: true,
  editable: false, placeholderText: '', tone: 'info', amount: ''
})
const mark = computed(() => ({
  heart: '♡', info: '✦', danger: '!', payment: '¥', error: '!', success: '✓'
})[dialog.value.tone] || '✦')
let resolveDialog = null
let chosenResult = null

function estimateCopyHeight(content) {
  let width = 375, height = 700
  try {
    const info = uni.getSystemInfoSync()
    width = info.windowWidth || width
    height = info.windowHeight || height
  } catch (_) { /* Use phone sized defaults until system metrics are available. */ }
  const unitsPerLine = Math.max(16, (width - 40) / 14)
  const lines = String(content).split('\n').reduce((total, line) => {
    const units = Array.from(line).reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? 1 : .58), 0)
    return total + Math.max(1, Math.ceil(units * 1.12 / unitsPerLine))
  }, 0)
  return Math.round(Math.min(height * .32, Math.max(24, lines * 23 + 3)))
}

function open(options = {}) {
  if (resolveDialog) return Promise.resolve({ confirm: false, content: '' })
  dialog.value = {
    title: options.title || '',
    content: options.content || '',
    confirmText: options.confirmText || t('common.confirm'),
    cancelText: options.cancelText || t('common.cancel'),
    showCancel: options.showCancel !== false,
    editable: !!options.editable,
    placeholderText: options.placeholderText || '',
    tone: options.tone || 'info',
    amount: options.amount == null ? '' : String(options.amount)
  }
  draft.value = ''
  copyHeight.value = estimateCopyHeight(dialog.value.content)
  chosenResult = null
  closing.value = false
  return new Promise(resolve => {
    resolveDialog = resolve
    opened.value = true
  })
}

function close(confirmValue) {
  if (!resolveDialog || closing.value) return
  chosenResult = { confirm: !!confirmValue, content: draft.value }
  closing.value = true
  if (dialog.value.editable) {
    try { uni.hideKeyboard() } catch (_) { /* Keyboard may already be closed. */ }
  }
  opened.value = false
}

function confirm() { close(true) }
function cancel() { close(false) }
function afterClose() {
  if (!resolveDialog) return
  const resolve = resolveDialog
  resolveDialog = null
  resolve(chosenResult || { confirm: false, content: '' })
  chosenResult = null
  closing.value = false
}

onBeforeUnmount(() => {
  if (!resolveDialog) return
  const resolve = resolveDialog
  resolveDialog = null
  resolve({ confirm: false, content: '' })
})

defineExpose({ open, close: cancel, isOpen: opened })
</script>

<style scoped>
.bless-dialog {
  width: 100%;
  max-height: 80vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0;
  background: #fffdf9;
  color: #292825;
}
.bless-dialog-handle {
  align-self: center;
  flex: none;
  width: 34px;
  height: 4px;
  margin: 10px 0 18px;
  border-radius: 4px;
  background: #d6d2ca;
}
.bless-dialog-heading { display: flex; align-items: center; gap: 12px; min-width: 0; margin-bottom: 14px; }
.bless-dialog-mark {
  display: flex; align-items: center; justify-content: center;
  flex: none; width: 42px; height: 42px; border-radius: 14px;
  background: #f8efd8; color: #775e25; font-size: 25px; font-weight: 600;
}
.bless-dialog-heading-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bless-dialog-brand { color: #775e25; font-size: 10px; font-weight: 700; letter-spacing: 1.3px; }
.bless-dialog-title { color: #292825; font-size: 20px; font-weight: 700; line-height: 1.35; word-break: break-word; }
.bless-dialog-copy-scroll { flex: 0 1 auto; max-height: 32vh; margin-bottom: 18px; }
.bless-dialog-copy { display: block; color: #6c6860; font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.bless-dialog-amount {
  flex: none; display: flex; align-items: center; justify-content: center;
  min-height: 58px; margin: 0 0 18px; padding: 8px 14px; box-sizing: border-box;
  border: 1px solid #ead8ab; border-radius: 16px; background: #fbf4e2;
  color: #775e25; font-size: 21px; font-weight: 700; text-align: center; word-break: break-word;
}
.bless-dialog-input {
  flex: none; width: 100%; height: 78px; box-sizing: border-box;
  padding: 13px 15px; margin: 0 0 18px;
  border: 1px solid #e7e0d3; border-radius: 16px; background: #faf8f4;
  color: #292825; font-size: 14px; line-height: 1.5;
}
.bless-dialog-actions { flex: none; display: flex; gap: 10px; width: 100%; }
.bless-dialog-button {
  flex: 1; min-width: 0; min-height: 48px; margin: 0; padding: 9px 11px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
  border-radius: 15px; font-size: 14px; font-weight: 600; line-height: 1.35;
  white-space: normal; word-break: break-word; text-align: center;
  transition-property: transform, background-color; transition-duration: 140ms;
  transition-timing-function: cubic-bezier(.23,1,.32,1);
}
.bless-dialog-button::after { border: none; }
.bless-dialog-button:active { transform: scale(.97); }
.bless-dialog-button.secondary { border: 1px solid #e7e0d3; background: #faf8f4; color: #666055; }
.bless-dialog-button.primary { background: #c2a052; color: #292825; }
.tone-danger .bless-dialog-mark, .tone-error .bless-dialog-mark { background: #fbefed; color: #b84f48; }
.tone-danger .bless-dialog-button.primary { background: #b84f48; color: #fff; }
.tone-error .bless-dialog-button.primary { background: #c2a052; color: #292825; }
/* #ifdef H5 */
@media (prefers-reduced-motion: reduce) { .bless-dialog-button { transition-duration: 0ms; } }
/* #endif */
</style>
