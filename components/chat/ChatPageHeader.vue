<template>
  <view class="chat-page-header" :class="{ 'avatar-header': avatarHeader, 'glass-header': glass }" :style="headerStyle">
    <view v-if="glass" class="header-glass-surface" :style="glassStyle" />
    <view class="header-row" :style="{ minHeight: `${layout.rowHeight}px` }">
      <view class="header-back-slot" :style="backStyle"><GlassCircleButton class="back-button" :label="t('chatDesign.back')" @tap="back"><view class="back-chevron" /></GlassCircleButton></view>
      <view class="header-title" :style="avatarHeader ? {} : { width: `${layout.titleWidth}px` }"><slot><text>{{ title }}</text></slot></view>
      <view class="header-action-slot" :style="actionStyle"><slot name="action" /></view>
    </view>
  </view>
</template>
<script setup>
import { computed, onMounted, ref, useSlots, watch } from 'vue'
import { onReady, onResize, onShow } from '@dcloudio/uni-app'
import { getChatHeaderGlassProgress, readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import GlassCircleButton from './GlassCircleButton.vue'
import { t } from '@/utils/localeRuntime.js'
const props = defineProps({ title: String, avatarHeader: Boolean, glass: Boolean, avatarSize: { type: Number, default: 54 }, scrollTop: { type: Number, default: 0 } })
const slots = useSlots()
let buildPlatformOverride = ''
// #ifdef MP-WEIXIN
buildPlatformOverride = 'mp-weixin'
// #endif
const options = () => ({ avatarHeader: props.avatarHeader, avatarSize: props.avatarSize, hasAction: !!slots.action, clearCapsule: props.glass })
const platformOverride = () => props.glass ? buildPlatformOverride : ''
const layout = ref(readChatHeaderGeometry(uni, options(), platformOverride()))
const headerStyle = computed(() => ({ paddingTop: `${layout.value.contentTop}px`, paddingLeft: `${layout.value.contentLeft}px`, paddingRight: `${layout.value.contentRight}px` }))
const glassStyle = computed(() => ({ opacity: getChatHeaderGlassProgress(props.scrollTop) }))
const backStyle = computed(() => props.avatarHeader ? { top: `${layout.value.controlTop}px`, left: `${layout.value.backLeft}px` } : { width: `${layout.value.backRailWidth}px` })
const actionStyle = computed(() => props.avatarHeader ? { top: `${layout.value.controlTop}px`, right: `${layout.value.actionRight}px` } : { width: `${layout.value.actionRailWidth}px` })
function refreshLayout() { layout.value = readChatHeaderGeometry(uni, options(), platformOverride()) }
onMounted(refreshLayout)
onReady(refreshLayout)
onShow(refreshLayout)
onResize(refreshLayout)
watch(() => [props.avatarHeader, props.avatarSize, props.glass], refreshLayout)
function back() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/notice/notice' }) }) }
</script>
<style scoped>
.chat-page-header{position:relative;z-index:5;padding-bottom:12px;background:transparent;box-sizing:border-box;flex:none;}
.glass-header{position:sticky;top:0;}
.header-glass-surface{position:absolute;inset:0;z-index:0;pointer-events:none;background:rgba(238,237,235,.72);backdrop-filter:blur(20px) saturate(1.12);-webkit-backdrop-filter:blur(20px) saturate(1.12);border-bottom:1px solid rgba(255,255,255,.72);box-shadow:0 5px 18px rgba(62,57,48,.07);opacity:0;transition:opacity 120ms linear;}
.header-row{display:flex;align-items:center;width:100%;}
.glass-header .header-row{position:relative;z-index:1;}
.header-back-slot,.header-action-slot{display:flex;align-items:center;flex:none;min-width:0;}
.header-action-slot{justify-content:flex-end;}.header-action-slot :deep(button){max-width:44px;box-sizing:border-box;white-space:normal;}
.header-title{display:flex;flex:none;min-width:0;align-items:center;justify-content:center;text-align:center;font-size:19px;font-weight:650;line-height:1.4;color:#292825;overflow-wrap:anywhere;}
.back-chevron{width:12px;height:12px;border-left:2px solid #292825;border-bottom:2px solid #292825;transform:translateX(3px) rotate(45deg);}
.avatar-header .header-title{width:100%;align-items:flex-start;}
.avatar-header .header-back-slot,.avatar-header .header-action-slot{position:absolute;width:44px;min-height:44px;}
@media(prefers-reduced-motion:reduce){.header-glass-surface{transition:none}}
</style>
