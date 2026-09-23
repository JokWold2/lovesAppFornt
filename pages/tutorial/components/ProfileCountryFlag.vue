<template><view v-if="index >= 0" class="profile-country-flag" aria-hidden="true"><image :src="flagSprite" class="profile-country-atlas" :style="flagStyle" mode="scaleToFill" /></view></template>
<script setup>
import { computed } from 'vue'
import flagSprite from '@/static/profile-flags.png'
import { profileFlagStyle } from '../utils/profileCatalog.js'
const props = defineProps({ index: { type: Number, default: -1 } })
const flagStyle = computed(() => {
  const style = profileFlagStyle(props.index)
  const [left, top] = style.backgroundPosition.split(' ')
  const [width, height] = style.backgroundSize.split(' ')
  return { left, top, width, height }
})
</script>
<style scoped>
.profile-country-flag{position:relative;display:inline-block;flex-shrink:0;width:32px;height:24px;overflow:hidden;pointer-events:none;}.profile-country-atlas{position:absolute;max-width:none;pointer-events:none;}
</style>
