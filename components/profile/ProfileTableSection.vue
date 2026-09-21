<template>
  <view class="section" :class="{ 'section--cards': presentation === 'cards' }">
    <view v-if="presentation === 'cards'" class="card-section-heading">
      <uni-icons v-if="icon" class="card-section-icon" :type="icon" :size="19" color="#79756f" />
      <text class="card-section-title">{{ title }}</text>
      <button v-if="editable" class="section-edit" :aria-label="`${t('profileEditor.common.edit')} ${title}`" hover-class="section-edit--pressed" @tap.stop="emit('edit')">{{ t('profileEditor.common.edit') }}</button>
    </view>
    <view v-else class="section-title"><text>{{ title }}</text><button v-if="editable" class="section-edit" :aria-label="`${t('profileEditor.common.edit')} ${title}`" hover-class="section-edit--pressed" @tap.stop="emit('edit')">{{ t('profileEditor.common.edit') }}</button></view>
    <view class="table">
      <view v-for="row in rows" :key="row.label" class="tr">
        <view class="th">{{ row.label }}</view>
        <view class="td">{{ row.value || '—' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { t } from '@/utils/localeRuntime.js'

defineProps({
  title: { type: String, required: true },
  presentation: { type: String, default: 'classic' },
  icon: { type: String, default: '' },
  editable: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] }
})
const emit = defineEmits(['edit'])
</script>

<style scoped lang="scss">
$primary-color: var(--bless-soft, #F1E4BD);
$border-color: #e0e0e0;
.section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, .05); }
.section-title { display: flex; align-items: center; justify-content: space-between; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 16rpx; border-left: 8rpx solid $primary-color; }
.table { width: 100%; border-top: 1px solid $border-color; border-left: 1px solid $border-color; border-radius: 4rpx; overflow: hidden; }
.tr { display: flex; width: 100%; }
.th, .td { padding: 16rpx 20rpx; font-size: 28rpx; border-right: 1px solid $border-color; border-bottom: 1px solid $border-color; word-break: break-all; }
.th { background: rgba(255, 246, 223, .1); color: #333; font-weight: bold; width: 35%; flex-shrink: 0; }
.td { color: #333; width: 65%; background: #fff; }

.section.section--cards { min-width: 0; padding: 22px 20px; margin-bottom: 16px; border-radius: 24px; background: #fff; box-shadow: none; box-sizing: border-box; }
.card-section-heading { display: flex; align-items: flex-start; min-width: 0; margin-bottom: 4px; }
.card-section-icon { flex: 0 0 20px; margin-top: 3px; margin-right: 10px; }
.card-section-title { flex: 1; min-width: 0; color: #25231f; font-size: 18px; font-weight: 600; line-height: 1.45; word-break: break-word; overflow-wrap: anywhere; }
.section--cards .table { border: 0; border-radius: 0; overflow: visible; }
.section--cards .tr { flex-direction: column; min-width: 0; padding: 16px 0; border-bottom: 1px solid #eeece7; box-sizing: border-box; }
.section--cards .tr:last-child { padding-bottom: 0; border-bottom: 0; }
.section--cards .th, .section--cards .td { width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.section--cards .th { color: #777269; font-size: 12px; font-weight: 400; line-height: 1.5; }
.section--cards .td { margin-top: 6px; color: #292621; font-size: 15px; font-weight: 400; line-height: 1.6; white-space: pre-wrap; }
.section-edit { flex: 0 0 auto; min-width: 44px; min-height: 44px; max-width: 50%; margin: -8px -8px -8px 8px; padding: 10px 8px; border: 0; border-radius: 16px; background: transparent; color: #777269; font-size: 13px; font-weight: 500; line-height: 24px; white-space: normal; word-break: break-word; overflow-wrap: anywhere; transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease; }
.section-edit::after { border: 0; }
.section-edit--pressed, .section-edit:active { transform: scale(.97); background: #f5f4f1; }
.section-edit:focus-visible { outline: 2px solid var(--bless-primary, #C2A052); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .section-edit { transition: none; }.section-edit--pressed, .section-edit:active { transform: none; } }
</style>
