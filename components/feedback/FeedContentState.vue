<template>
  <view class="feed-state" :class="'is-' + status" role="status" aria-live="polite" :aria-busy="status === 'loading'">
    <view class="feed-state-art" aria-hidden="true">
      <view class="feed-state-halo"></view>
      <view class="feed-state-sheet-back"></view>
      <view class="feed-state-sheet">
        <uni-icons :type="kind === 'blessing' ? 'heart' : 'star'" size="29" color="var(--bless-primary, #C2A052)" />
        <view class="feed-state-line"></view>
        <view class="feed-state-line is-short"></view>
      </view>
      <view v-if="status === 'loading'" class="feed-state-badge"><view class="feed-state-spinner"></view></view>
      <view v-else-if="status === 'error'" class="feed-state-badge"><text class="feed-state-mark">!</text></view>
    </view>
    <text class="feed-state-title">{{ title }}</text>
    <text class="feed-state-hint">{{ hint }}</text>
    <button
      v-if="status !== 'loading'"
      class="feed-state-action"
      :disabled="disabled"
      hover-class="feed-state-action-pressed"
      :hover-stay-time="80"
      @click="onAction"
    >{{ actionLabel || t(status === 'error' ? 'feedState.retry' : 'feedState.refresh') }}</button>
    <view v-if="$slots.default" class="feed-state-secondary"><slot /></view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({
  status: { type: String, default: 'empty' },
  kind: { type: String, default: 'featured' },
  disabled: Boolean,
  actionLabel: { type: String, default: '' }
})
const emit = defineEmits(['action'])
const title = computed(() => t(props.status === 'empty' ? `feedState.${props.kind}EmptyTitle` : `feedState.${props.status}Title`))
const hint = computed(() => t(props.status === 'empty' ? `feedState.${props.kind}EmptyHint` : `feedState.${props.status}Hint`))
function onAction() {
  if (!props.disabled && props.status !== 'loading') emit('action')
}
</script>

<style scoped>
.feed-state { min-height: 340px; width: 100%; padding: 40px 24px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.feed-state-art { width: 112px; height: 100px; position: relative; margin-bottom: 22px; flex-shrink: 0; }
.feed-state-halo { position: absolute; width: 98px; height: 98px; top: 0; left: 7px; border-radius: 50%; background: #faf6e9; }
.feed-state-sheet-back { position: absolute; width: 57px; height: 70px; top: 11px; left: 21px; border: 1px solid #e6dfce; border-radius: 13px; background: #f4efe2; transform: rotate(-13deg); }
.feed-state-sheet { position: absolute; width: 59px; height: 72px; top: 12px; left: 35px; border: 1px solid #e8e2d5; border-radius: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fffefa; box-shadow: 0 3px 7px rgba(81, 66, 34, .04); transform: rotate(8deg); }
.feed-state-line { width: 26px; height: 3px; margin-top: 7px; border-radius: 2px; background: #e9e1ce; }
.feed-state-line.is-short { width: 17px; margin-top: 5px; }
.feed-state-badge { position: absolute; right: 7px; bottom: 9px; width: 27px; height: 27px; display: flex; align-items: center; justify-content: center; border: 3px solid #fff; border-radius: 50%; background: var(--bless-soft, #F1E4BD); }
.feed-state-mark { color: var(--bless-text, #775E25); font-size: 19px; line-height: 1; font-weight: 600; }
.feed-state-title { display: block; max-width: 310px; color: #292a2d; font-size: 18px; font-weight: 600; line-height: 1.45; overflow-wrap: break-word; }
.feed-state-hint { display: block; max-width: 290px; margin-top: 9px; color: #7a7975; font-size: 13px; line-height: 1.7; overflow-wrap: break-word; }
.feed-state-action { min-width: 136px; max-width: 100%; min-height: 44px; margin: 23px 0 0; padding: 12px 25px; border: 0; border-radius: 24px; display: flex; align-items: center; justify-content: center; background: var(--bless-primary, #C2A052); color: #2a2517; font-size: 14px; font-weight: 600; line-height: 1.5; transition: transform 140ms cubic-bezier(.23, 1, .32, 1); }
.feed-state-action::after { border: 0; }
.feed-state-action:active, .feed-state-action-pressed { transform: scale(.97); }
.feed-state-action[disabled] { opacity: .5; }
.feed-state-secondary { margin-top: 8px; max-width: 100%; }
.feed-state-spinner { width: 13px; height: 13px; border: 2px solid rgba(115, 95, 50, .2); border-top-color: var(--bless-text, #775E25); border-radius: 50%; animation: feed-state-spin .7s linear infinite; }
@keyframes feed-state-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .feed-state-action { transition: none; } .feed-state-action:active, .feed-state-action-pressed { transform: none; } .feed-state-spinner { animation: none; } }
</style>
