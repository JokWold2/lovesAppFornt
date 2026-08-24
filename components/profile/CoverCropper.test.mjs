import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('裁切组件提供固定取景框并导出裁切后的临时文件', async () => {
  const source = await readFile(new URL('./CoverCropper.vue', import.meta.url), 'utf8')

  assert.match(source, /class="crop-frame"/)
  assert.match(source, /canvas-id="coverCropCanvas"/)
  assert.match(source, /uni\.canvasToTempFilePath/)
  assert.match(source, /emit\('confirm', tempFilePath\)/)
})

test('裁切组件使用 uni-app 触摸事件完成拖动和缩放', async () => {
  const source = await readFile(new URL('./CoverCropper.vue', import.meta.url), 'utf8')

  assert.match(source, /@touchstart="onTouchStart"/)
  assert.match(source, /@touchmove="onTouchMove"/)
  assert.match(source, /@touchend="onTouchEnd"/)
  assert.doesNotMatch(source, /window\.|document\./)
})
