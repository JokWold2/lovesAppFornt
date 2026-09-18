<template>
  <view class="photo-gallery-wrap" :class="{ 'photo-gallery-wrap--portrait': presentation === 'cards' }">
    <template v-if="presentation === 'cards'">
      <swiper v-if="photos.length" class="portrait-gallery" :current="activePhoto" :duration="220" @change="changePhoto">
        <swiper-item v-for="(src, index) in photos" :key="`${src}-${index}`">
          <image class="portrait-photo" :src="src" mode="aspectFill" @tap="handlePhotoTap(index)" @error="emit('photo-error', index)" />
        </swiper-item>
      </swiper>
      <view v-else class="portrait-empty">
        <uni-icons type="person" :size="72" color="#b1a99a" />
        <text>{{ t('profile.noPhotos') }}</text>
      </view>
      <view v-if="photos.length > 1" class="portrait-progress" aria-hidden="true">
        <view v-for="(_, index) in photos" :key="index" class="portrait-progress-segment" :class="{ 'is-current': activePhoto === index }" />
      </view>
      <text v-if="photos.length > 1" class="portrait-count">{{ activePhoto + 1 }} / {{ photos.length }}</text>
    </template>
    <view v-else-if="photos.length" class="photo-gallery">
      <view v-for="(src, index) in photos" :key="`${src}-${index}`" class="photo-cell">
        <image
          class="photo"
          :src="src"
          mode="aspectFill"
          @tap="handlePhotoTap(index)"
          @error="emit('photo-error', index)"
        />
      </view>
    </view>
    <view v-else class="empty-text">{{ t('profile.noPhotos') }}</view>

    <!-- 组件只上报交互，不直接发请求，方便个人页和他人资料页复用。 -->
    <view v-if="enableLike && showLikeControl" class="like-button" @tap.stop="emitToggleLike">
      <image
        class="like-icon"
        :src="liked ? '/static/img/like_act.png' : '/static/img/like.png'"
        mode="aspectFit"
      />
      <text v-if="likeCount > 0" class="like-count">{{ likeCount }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({
  photos: { type: Array, default: () => [] },
  presentation: { type: String, default: 'classic' },
  showLikeControl: { type: Boolean, default: true },
  enableLike: { type: Boolean, default: false },
  liked: { type: Boolean, default: false },
  likeCount: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-like', 'photo-error'])
const lastTap = ref({ index: -1, at: 0 })
const activePhoto = ref(0)

function changePhoto(event) {
  activePhoto.value = Number(event.detail.current) || 0
  lastTap.value = { index: -1, at: 0 }
}

watch(() => props.photos.length, length => {
  activePhoto.value = Math.max(0, Math.min(activePhoto.value, length - 1))
  lastTap.value = { index: -1, at: 0 }
})

function emitToggleLike() {
  if (props.enableLike) emit('toggle-like')
}

// App 端并不总能稳定触发 dblclick，因此用同一张图片 300ms 内的两次 tap 做兼容。
function handlePhotoTap(index) {
  if (!props.enableLike) return

  const now = Date.now()
  if (lastTap.value.index === index && now - lastTap.value.at <= 300) {
    lastTap.value = { index: -1, at: 0 }
    emitToggleLike()
    return
  }
  lastTap.value = { index, at: now }
}
</script>

<style scoped lang="scss">
.photo-gallery-wrap {
  position: relative;
}

.photo-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-cell {
  width: calc(50% - 10rpx);
}

.photo {
  width: 100%;
  height: 400rpx;
  border-radius: 8rpx;
  background-color: #eee;
}

.empty-text {
  color: #999;
  font-size: 26rpx;
  padding: 20rpx 0;
  text-align: center;
}

.like-button {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  min-width: 72rpx;
  height: 56rpx;
  padding: 0 14rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.like-icon {
  width: 42rpx;
  height: 42rpx;
}

.like-count {
  color: #666;
  font-size: 22rpx;
}

.photo-gallery-wrap--portrait {
  overflow: hidden;
  border-radius: 24px;
  background: #e7e3db;
}
.portrait-gallery { width: 100%; height: 122vw; max-height: 620px; }
.portrait-photo { display: block; width: 100%; height: 100%; }
.portrait-empty { min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #777269; font-size: 14px; }
.portrait-progress { position: absolute; top: 12px; left: 16px; right: 16px; display: flex; gap: 5px; pointer-events: none; }
.portrait-progress-segment { flex: 1; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .35); }
.portrait-progress-segment.is-current { background: #fff; }
.portrait-count { position: absolute; right: 16px; bottom: 16px; padding: 5px 10px; border-radius: 16px; background: rgba(25, 24, 22, .4); color: #fff; font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums; pointer-events: none; }
</style>
