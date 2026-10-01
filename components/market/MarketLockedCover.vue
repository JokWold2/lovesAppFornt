<template>
  <view class="market-locked-cover">
    <view class="market-locked-placeholder"><view class="placeholder-shape" /></view>
    <image v-if="previewUrl" class="market-locked-image" :src="previewUrl" mode="aspectFill" />
    <view class="market-locked-shade" />
    <view class="market-locked-badge"><uni-icons type="locked" size="13" color="#775E25" /><text>{{ t('marketAccess.badge') }}</text></view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'
const props = defineProps({ src: { type: String, default: '' } })
const previewUrl = computed(() => props.src.startsWith('/api/market/locked-previews/') ? config.baseURL + props.src : '')
</script>

<style scoped>
.market-locked-cover{position:relative;width:100%;height:100%;overflow:hidden;background:#d9d1c4}
.market-locked-image{position:absolute;z-index:1;inset:0;display:block;width:100%;height:100%;filter:blur(8px) saturate(.75);transform:scale(1.08)}
.market-locked-placeholder{position:absolute;inset:0;background:radial-gradient(circle at 25% 22%,#f5e6c9,transparent 42%),linear-gradient(135deg,#d8c9b4,#a69b8a 55%,#6a6259)}
.placeholder-shape{position:absolute;left:30%;top:20%;width:40%;height:78%;border-radius:40% 40% 25% 25%;background:linear-gradient(110deg,#e8d9bd,#786754);filter:blur(14px)}
.market-locked-shade{position:absolute;z-index:2;inset:0;background:rgba(34,29,25,.13)}
.market-locked-badge{position:absolute;z-index:3;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:5px;max-width:calc(100% - 12px);padding:7px 10px;border-radius:22px;background:rgba(255,253,247,.94);color:#775E25;font-size:11px;font-weight:600;line-height:1.3;text-align:center;white-space:normal}
.market-locked-badge text{overflow-wrap:anywhere}
</style>
