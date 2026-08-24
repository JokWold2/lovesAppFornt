import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('首页动态大图按宽度完整展示', async () => {
  const source = await readFile(new URL('./index/index360.vue', import.meta.url), 'utf8')
  assert.match(source, /class="media-img"[\s\S]*mode="widthFix"/)
  assert.doesNotMatch(source, /\.post-media\s*\{[^}]*height:\s*700rpx/)
})

test('朋友圈顶部封面展示已确认的裁切结果', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')
  assert.match(source, /<image\s+class="cover-bg"[^>]*mode="aspectFill"/)
})

test('选择封面先进入裁切层，只有裁切结果才能上传', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')

  assert.match(source, /<CoverCropper[\s\S]*@confirm="uploadCroppedCover"/)
  assert.match(source, /cropSource\.value = res\.tempFilePaths\[0\]/)
  assert.match(source, /uploadProfilePhotosApi\(\[tempFilePath\]\)/)
  assert.doesNotMatch(source, /uploadProfilePhotosApi\(res\.tempFilePaths\)/)
})

test('展开封面暂停轮播并固定当前图片，收起后恢复轮播', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')

  assert.match(source, /:current="currentCoverIndex"/)
  assert.match(source, /:autoplay="coverAutoplay"/)
  assert.match(source, /@change="onCoverChange"/)
  assert.match(source, /v-if="coverExpanded"/)
  assert.match(source, /@tap="closeCoverPreview"/)
  assert.match(source, /class="cover-preview-image"[\s\S]*mode="aspectFit"/)
})
