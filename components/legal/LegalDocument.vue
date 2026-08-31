<template>
  <scroll-view class="document app-h5-screen app-h5-scroll" scroll-y>
    <text class="title">{{ document.title }}</text>
    <text v-if="document.meta" class="meta">{{ document.meta }}</text>
    <view v-for="section in document.sections" :key="section.title" class="section">
      <text v-if="section.title" class="section-title">{{ section.title }}</text>
      <text v-for="paragraph in section.paragraphs" :key="paragraph" class="paragraph">{{ paragraph }}</text>
      <view v-for="item in section.items" :key="item" class="item"><text>• {{ item }}</text></view>
    </view>
  </scroll-view>
</template>

<script setup>
defineProps({ document: { type: Object, required: true } })
</script>

<style scoped lang="scss">
.document { box-sizing: border-box; padding: 42rpx 34rpx 72rpx; background: #fff; }
/* #ifndef H5 */
.document { height: 100vh; }
/* #endif */
.title { display: block; color: #1f1f1f; font-size: 40rpx; font-weight: 700; text-align: center; }.meta { display: block; margin-top: 20rpx; color: #888; font-size: 24rpx; text-align: center; }
.section { margin-top: 38rpx; }.section-title { display: block; margin-bottom: 16rpx; color: #222; font-size: 30rpx; font-weight: 600; }.paragraph, .item { display: block; color: #4a4a4a; font-size: 27rpx; line-height: 1.8; white-space: pre-wrap; }.item { margin-top: 10rpx; }
</style>
