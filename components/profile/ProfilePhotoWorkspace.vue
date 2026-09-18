<template>
  <view class="photo-workspace" :class="{ 'photo-editor': editing, 'photo-manager': !editing }">
    <view class="photo-workspace-header">
      <button v-if="editing" class="photo-editor-close round-button light-button" :disabled="busy" :aria-label="t('photoManager.close')" @click="editing = false"><uni-icons type="closeempty" size="27" color="#292824" /></button>
      <view v-else class="header-balance" />
      <text class="photo-workspace-title">{{ t(editing ? 'photoManager.editTitle' : 'photoManager.title') }}</text>
      <button class="photo-manager-done round-button dark-button" :disabled="busy" :aria-label="t('photoManager.done')" @click="done"><uni-icons type="checkmarkempty" size="28" color="#fff" /></button>
    </view>

    <scroll-view v-if="!editing" class="photo-grid-scroll" scroll-y>
      <view class="photo-manager-grid">
        <view v-for="(photo, index) in slots" :key="index" class="photo-grid-tile">
          <button v-if="photo" class="photo-grid-image-button" :disabled="busy" :aria-label="t('photoManager.photoLabel', { index: index + 1 })" @click="edit(index)"><image :src="imageUrl(photo)" mode="aspectFill" /></button>
          <button v-else class="photo-grid-add" :disabled="busy" :aria-label="t('photoManager.emptySlot', { index: index + 1 })" @click="openSource(false)"><view class="slot-plus"><uni-icons type="plusempty" size="27" color="#fff" /></view></button>
          <button v-if="photo" class="photo-remove-button round-button light-button grid-remove" :disabled="busy" :aria-label="t('photoManager.remove')" @click="remove(index)"><uni-icons type="closeempty" size="24" color="#292824" /></button>
        </view>
      </view>
      <view class="photo-manager-caption"><text>{{ t('photoManager.hint') }}</text><text class="photo-manager-count">{{ t('photoManager.count', { count: photos.length, max: maxPhotos }) }}</text></view>
    </scroll-view>

    <view v-else class="photo-editor-body">
      <view class="photo-editor-preview"><image v-if="photos[selectedIndex]" :src="imageUrl(photos[selectedIndex])" mode="aspectFit" /></view>
      <scroll-view class="photo-editor-rail" scroll-x :scroll-into-view="`photo-thumb-${selectedIndex}`">
        <view v-for="(photo, index) in photos" :id="`photo-thumb-${index}`" :key="index" class="photo-editor-thumb" :class="{ selected: index === selectedIndex }">
          <button class="photo-thumb-select" :disabled="busy" :aria-label="t('photoManager.photoLabel', { index: index + 1 })" :aria-pressed="index === selectedIndex" @click="selectedIndex = index"><image :src="imageUrl(photo)" mode="aspectFill" /></button>
          <button class="photo-remove-button round-button light-button thumb-remove" :disabled="busy" :aria-label="t('photoManager.remove')" @click="remove(index)"><uni-icons type="closeempty" size="22" color="#292824" /></button>
        </view>
        <button v-if="photos.length < maxPhotos" class="photo-thumb-add" :disabled="busy" :aria-label="t('photoManager.add')" @click="openSource(false)"><uni-icons type="plusempty" size="28" color="#292824" /></button>
      </scroll-view>
      <view class="photo-editor-footer"><button class="photo-replace-button dark-button" :disabled="busy" @click="openSource(true)">{{ t(busy ? 'photoManager.saving' : 'photoManager.replace') }}</button></view>
    </view>

    <view v-if="sourceOpen" class="photo-source-mask" @click="closeSource" @touchmove.stop.prevent>
      <view class="photo-source-sheet" role="dialog" :aria-label="t('photoManager.addMedia')" @click.stop @touchmove.stop>
        <view class="photo-source-header"><button class="photo-source-close round-button light-button" :aria-label="t('photoManager.close')" @click="closeSource"><uni-icons type="closeempty" size="26" color="#292824" /></button><text class="photo-source-title">{{ t('photoManager.addMedia') }}</text><view class="header-balance" /></view>
        <button class="photo-source-option photo-source-album" @click="choose('album')"><view class="source-icon"><uni-icons type="image" size="30" color="#fff" /></view><view class="source-copy"><text class="source-label">{{ t('photoManager.album') }}</text><text class="source-hint">{{ t('photoManager.albumHint') }}</text></view><uni-icons type="right" size="20" color="#292824" /></button>
        <button class="photo-source-option photo-source-camera" @click="choose('camera')"><view class="source-icon camera-icon"><uni-icons type="camera" size="30" color="#fff" /></view><view class="source-copy"><text class="source-label">{{ t('photoManager.camera') }}</text><text class="source-hint">{{ t('photoManager.cameraHint') }}</text></view><uni-icons type="right" size="20" color="#292824" /></button>
        <!-- #ifdef H5 -->
        <button v-if="!replacing" class="photo-source-facebook" @click="importFacebook">{{ t('photoManager.facebook') }}<uni-icons type="right" size="14" color="#73726c" /></button>
        <!-- #endif -->
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({ photos: { type: Array, default: () => [] }, busy: Boolean, initialIndex: { type: Number, default: -1 }, maxPhotos: { type: Number, default: 9 } })
const emit = defineEmits(['close', 'upload', 'remove', 'facebook'])
const selectedIndex = ref(Math.max(0, props.initialIndex))
const editing = ref(props.initialIndex >= 0 && !!props.photos[props.initialIndex])
const sourceOpen = ref(false), replacing = ref(false)
const slots = computed(() => Array.from({ length: props.maxPhotos }, (_, index) => props.photos[index] || ''))
const imageUrl = value => /^(https?:|blob:|data:)/.test(value) ? value : config.baseURL + value
function edit(index) { if (!props.busy) { selectedIndex.value = index; editing.value = true } }
function done() { if (!props.busy) { if (editing.value) editing.value = false; else emit('close') } }
function openSource(replace) {
  if (props.busy || (!replace && props.photos.length >= props.maxPhotos)) return
  replacing.value = replace
  sourceOpen.value = true
}
function closeSource() { sourceOpen.value = false }
function choose(source) {
  if (props.busy) return
  sourceOpen.value = false
  emit('upload', { source, replaceIndex: replacing.value ? selectedIndex.value : -1 })
}
function importFacebook() { sourceOpen.value = false; emit('facebook') }
function remove(index) { if (!props.busy) emit('remove', index) }
function back() { if (props.busy) return; if (sourceOpen.value) closeSource(); else if (editing.value) editing.value = false; else emit('close') }
watch(() => props.photos, (photos, previous) => {
  const selectedPhoto = previous?.[selectedIndex.value]
  const retainedIndex = selectedPhoto ? photos.indexOf(selectedPhoto) : -1
  // Removing an earlier thumbnail should not change the photo being edited.
  selectedIndex.value = retainedIndex >= 0 ? retainedIndex : Math.min(selectedIndex.value, Math.max(0, photos.length - 1))
  if (!photos.length) editing.value = false
})
defineExpose({ back })
</script>

<style scoped>
.photo-workspace{position:relative;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;border-radius:28px 28px 0 0;background:#f3f1f0;color:#242321;box-sizing:border-box;}
button{margin:0;padding:0;border:0;box-sizing:border-box;line-height:1.4;background:transparent;color:inherit;white-space:normal;overflow-wrap:anywhere;transition:transform 140ms cubic-bezier(.23,1,.32,1);}button::after{border:0;}button:active{transform:scale(.97);}button[disabled]{opacity:.55;}button :deep(.uni-icons),button image{pointer-events:none;}
.photo-workspace-header,.photo-source-header{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 18px 20px;}.photo-workspace-title{min-width:0;flex:1;text-align:center;font-size:22px;font-weight:550;line-height:1.3;overflow-wrap:anywhere;}.round-button,.header-balance{width:46px;height:46px;flex:0 0 46px;}.round-button{border-radius:50%;display:flex;align-items:center;justify-content:center;}.dark-button{background:#22211f;color:#fff;}.light-button{background:#fff;color:#292824;}
.photo-grid-scroll{flex:1;min-height:0;height:0;}.photo-manager-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 14px;padding:14px 20px 0;}.photo-grid-tile{position:relative;min-width:0;height:calc((100vw - 68px)/3 * 1.48);max-height:240px;}.photo-grid-image-button,.photo-grid-add{display:block;width:100%;height:100%;border-radius:20px;overflow:hidden;background:#e5e2e0;}.photo-grid-image-button image{display:block;width:100%;height:100%;}.photo-grid-add{overflow:visible;}.grid-remove,.slot-plus{position:absolute;right:-7px;top:-12px;}.slot-plus{display:flex;align-items:center;justify-content:center;width:44px;height:44px;background:#22211f;border-radius:50%;}.grid-remove{width:44px;height:44px;z-index:2;}.photo-manager-caption{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;padding:26px 23px calc(32px + env(safe-area-inset-bottom));color:#828079;font-size:12px;line-height:1.6;}.photo-manager-caption>text:first-child{min-width:0;flex:1;}.photo-manager-count{white-space:nowrap;font-variant-numeric:tabular-nums;}
.photo-editor-body{display:flex;flex:1;min-height:0;flex-direction:column;}.photo-editor-preview{flex:1;min-height:100px;margin:6px 20px 0;overflow:hidden;border-radius:26px;background:#e5e2e0;}.photo-editor-preview image{display:block;width:100%;height:100%;}.photo-editor-rail{flex-shrink:0;height:119px;white-space:nowrap;margin-top:17px;width:100%;}.photo-editor-thumb{position:relative;display:inline-block;vertical-align:top;width:77px;height:98px;margin:10px 14px 0 0;box-sizing:border-box;border:2px solid transparent;border-radius:18px;padding:3px;}.photo-editor-thumb:first-child{margin-left:20px;}.photo-editor-thumb.selected{border-color:#282725;}.photo-thumb-select{height:100%;width:100%;border-radius:13px;overflow:hidden;}.photo-thumb-select image{height:100%;width:100%;display:block;}.thumb-remove{position:absolute;right:-14px;top:-13px;width:44px;height:44px;z-index:2;background:rgba(255,255,255,.95);}.photo-thumb-add{display:inline-flex;vertical-align:top;align-items:center;justify-content:center;width:77px;height:98px;background:#e5e2e0;border-radius:17px;margin:10px 20px 0 0;}.photo-editor-footer{padding:14px 20px calc(18px + env(safe-area-inset-bottom));}.photo-replace-button{display:block;width:100%;min-height:52px;padding:13px 20px;border-radius:30px;font-size:17px;}
.photo-source-mask{position:absolute;inset:0;z-index:5;display:flex;align-items:flex-end;background:rgba(29,27,25,.25);}.photo-source-sheet{width:100%;padding:0 20px calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;border-radius:29px 29px 0 0;background:#f3f1f0;}.photo-source-header{padding:18px 0 21px;}.photo-source-title{min-width:0;flex:1;font-size:21px;text-align:center;line-height:1.35;overflow-wrap:anywhere;}.photo-source-option{display:flex;align-items:center;gap:14px;width:100%;min-height:90px;padding:17px 16px;border-radius:20px;background:#e7e4e2;text-align:left;margin-bottom:12px;}.source-icon{display:flex;align-items:center;justify-content:center;background:#5a6573;width:49px;height:49px;flex:0 0 49px;border-radius:50%;}.camera-icon{background:#7c826f;}.source-copy{min-width:0;flex:1;}.source-label{display:block;font-size:17px;line-height:1.4;}.source-hint{display:block;font-size:12px;color:#76736e;line-height:1.5;margin-top:4px;}.photo-source-facebook{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;width:100%;padding:7px 14px;color:#73726c;font-size:12px;}
@media(min-width:600px){.photo-grid-tile{height:240px;}}
@media(max-width:350px){.photo-workspace-header{padding:14px 14px 16px;gap:8px;}.photo-workspace-title{font-size:19px;}.photo-manager-grid{padding:14px 16px 0;gap:20px 13px;}.photo-grid-tile{height:calc((100vw - 58px)/3 * 1.45);}.photo-editor-preview{margin:0 16px;}.photo-source-sheet{padding-left:14px;padding-right:14px;}.photo-source-option{padding:14px 12px;gap:10px;}.source-label{font-size:15px;}.source-icon{width:44px;height:44px;flex-basis:44px;}.photo-source-title{font-size:19px;}}
@media(max-height:650px){.photo-editor-rail{height:95px;margin-top:10px;}.photo-editor-thumb,.photo-thumb-add{height:76px;width:62px;}.photo-editor-footer{padding-top:8px;padding-bottom:calc(10px + env(safe-area-inset-bottom));}}
@media(prefers-reduced-motion:reduce){button{transition:none;}button:active{transform:none;}}
</style>
