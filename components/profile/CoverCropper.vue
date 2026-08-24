<template>
  <view v-if="visible" class="crop-mask" @touchmove.stop.prevent>
    <view class="crop-panel">
      <text class="crop-title">调整封面</text>
      <view
        class="crop-frame"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <canvas
          canvas-id="coverCropCanvas"
          class="crop-canvas"
          :style="{ width: `${frameWidth}rpx`, height: `${frameHeight}rpx` }"
        />
        <view class="crop-grid crop-grid-horizontal"></view>
        <view class="crop-grid crop-grid-vertical"></view>
      </view>
      <text class="crop-hint">拖动调整位置，双指缩放</text>
      <view class="crop-actions">
        <text class="crop-action crop-cancel" @tap="emit('cancel')">取消</text>
        <text class="crop-action crop-confirm" @tap="confirmCrop">完成</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { getCurrentInstance, nextTick, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  source: { type: String, default: '' }
})

const emit = defineEmits(['cancel', 'confirm'])
const instance = getCurrentInstance()
const frameWidth = 680
const frameHeight = 420
const exportWidth = 1020
const exportHeight = 630
const imageWidth = ref(0)
const imageHeight = ref(0)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragStart = ref(null)
const pinchStart = ref(null)

watch(
  () => [props.visible, props.source],
  ([visible, source]) => {
    if (visible && source) initializeImage()
  },
  { immediate: true }
)

function getCanvasContext() {
  return uni.createCanvasContext('coverCropCanvas', instance)
}

function initializeImage() {
  uni.getImageInfo({
    src: props.source,
    success(info) {
      imageWidth.value = info.width
      imageHeight.value = info.height
      const coverScale = Math.max(exportWidth / info.width, exportHeight / info.height)
      scale.value = coverScale
      offsetX.value = (exportWidth - info.width * coverScale) / 2
      offsetY.value = (exportHeight - info.height * coverScale) / 2
      nextTick(drawCanvas)
    },
    fail() {
      uni.showToast({ title: '图片读取失败，请重新选择', icon: 'none' })
      emit('cancel')
    }
  })
}

function clampOffsets() {
  const drawnWidth = imageWidth.value * scale.value
  const drawnHeight = imageHeight.value * scale.value
  offsetX.value = Math.min(0, Math.max(exportWidth - drawnWidth, offsetX.value))
  offsetY.value = Math.min(0, Math.max(exportHeight - drawnHeight, offsetY.value))
}

function drawCanvas() {
  if (!props.source || !imageWidth.value || !imageHeight.value) return
  const context = getCanvasContext()
  context.setFillStyle('#111111')
  context.fillRect(0, 0, exportWidth, exportHeight)
  context.drawImage(
    props.source,
    offsetX.value,
    offsetY.value,
    imageWidth.value * scale.value,
    imageHeight.value * scale.value
  )
  context.draw(false)
}

function touchDistance(touches) {
  const [first, second] = touches
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

function onTouchStart(event) {
  const touches = event.touches || []
  if (touches.length >= 2) {
    pinchStart.value = { distance: touchDistance(touches), scale: scale.value }
    dragStart.value = null
    return
  }
  if (touches.length === 1) {
    dragStart.value = { x: touches[0].clientX, y: touches[0].clientY, offsetX: offsetX.value, offsetY: offsetY.value }
    pinchStart.value = null
  }
}

function onTouchMove(event) {
  const touches = event.touches || []
  if (touches.length >= 2 && pinchStart.value) {
    const ratio = touchDistance(touches) / pinchStart.value.distance
    scale.value = Math.max(pinchStart.value.scale * ratio, Math.max(exportWidth / imageWidth.value, exportHeight / imageHeight.value))
    clampOffsets()
    drawCanvas()
    return
  }
  if (touches.length === 1 && dragStart.value) {
    const factor = exportWidth / uni.upx2px(frameWidth)
    offsetX.value = dragStart.value.offsetX + (touches[0].clientX - dragStart.value.x) * factor
    offsetY.value = dragStart.value.offsetY + (touches[0].clientY - dragStart.value.y) * factor
    clampOffsets()
    drawCanvas()
  }
}

function onTouchEnd() {
  dragStart.value = null
  pinchStart.value = null
}

function confirmCrop() {
  uni.canvasToTempFilePath({
    canvasId: 'coverCropCanvas',
    width: exportWidth,
    height: exportHeight,
    destWidth: exportWidth,
    destHeight: exportHeight,
    fileType: 'jpg',
    quality: 0.92,
    success(result) {
      const tempFilePath = result.tempFilePath
      emit('confirm', tempFilePath)
    },
    fail() {
      uni.showToast({ title: '裁切失败，请重试', icon: 'none' })
    }
  }, instance)
}
</script>

<style lang="scss" scoped>
.crop-mask {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 28rpx calc(48rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.9);
}

.crop-panel { width: 100%; }
.crop-title { display: block; margin-bottom: 28rpx; color: #fff; text-align: center; font-size: 34rpx; font-weight: 600; }
.crop-frame { position: relative; width: 680rpx; height: 420rpx; margin: 0 auto; overflow: hidden; border: 3rpx solid rgba(255, 255, 255, 0.95); box-sizing: border-box; }
.crop-canvas { display: block; width: 100%; height: 100%; }
.crop-grid { position: absolute; pointer-events: none; background: rgba(255, 255, 255, 0.45); }
.crop-grid-horizontal { left: 0; top: 50%; width: 100%; height: 1rpx; }
.crop-grid-vertical { left: 50%; top: 0; width: 1rpx; height: 100%; }
.crop-hint { display: block; margin-top: 24rpx; color: rgba(255, 255, 255, 0.72); text-align: center; font-size: 24rpx; }
.crop-actions { display: flex; justify-content: space-between; margin-top: 46rpx; padding: 0 44rpx; }
.crop-action { min-width: 140rpx; padding: 20rpx 24rpx; border-radius: 44rpx; text-align: center; font-size: 30rpx; }
.crop-cancel { color: #fff; background: rgba(255, 255, 255, 0.2); }
.crop-confirm { color: #fff; background: #fe385c; }
</style>
