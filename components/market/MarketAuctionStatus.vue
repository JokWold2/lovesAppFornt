<template>
  <view v-if="auction" class="auction-status">
    <text class="auction-badge" :class="{ ended: state === 'ended' }">{{ t('marketDetail.' + state) }}</text>
    <text v-if="state !== 'ended'" class="auction-time">{{ t(state === 'scheduled' ? 'marketDetail.starts' : 'marketDetail.ends') }} {{ countdown }}</text>
  </view>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import { auctionStateAt, auctionCountdown } from '@/utils/marketAuctionTime.js'
const props = defineProps({ auction: Object })
const now = ref(Date.now())
let offset = 0, timer
watch(() => props.auction, value => { offset = Number.isFinite(Number(value?.serverTime)) ? Number(value.serverTime) - Date.now() : 0; now.value = Date.now() + offset }, { immediate: true })
const state = computed(() => auctionStateAt(props.auction, now.value))
const countdown = computed(() => auctionCountdown(props.auction, now.value, t))
onMounted(() => { timer = setInterval(() => { now.value = Date.now() + offset }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
<style scoped>
.auction-status{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 7px}.auction-badge{display:inline-block;padding:3px 7px;border-radius:12px;background:#fff3d4;color:#a5811d;font-size:11px;line-height:1.5}.auction-badge.ended{background:#f1f1f3;color:#999}.auction-time{font-size:11px;line-height:1.6;color:#a5811d;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
</style>
