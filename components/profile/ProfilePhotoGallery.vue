<template>
  <view class="photo-gallery-wrap">
    <view v-if="photos.length" class="photo-gallery">
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
    <view v-else class="empty-text">暫無照片</view>

    <!-- 组件只上报交互，不直接发请求，方便个人页和他人资料页复用。 -->
    <view v-if="enableLike" class="like-button" @tap.stop="emitToggleLike">
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
import { ref } from 'vue'

const props = defineProps({
  photos: { type: Array, default: () => [] },
  enableLike: { type: Boolean, default: false },
  liked: { type: Boolean, default: false },
  likeCount: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-like', 'photo-error'])
const lastTap = ref({ index: -1, at: 0 })

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
</style>
