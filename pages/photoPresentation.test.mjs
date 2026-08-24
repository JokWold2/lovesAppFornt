import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('首页动态大图按宽度完整展示', async () => {
  const source = await readFile(new URL('./index/index360.vue', import.meta.url), 'utf8')
  assert.match(source, /class="media-img"[\s\S]*mode="widthFix"/)
  assert.doesNotMatch(source, /\.post-media\s*\{[^}]*height:\s*700rpx/)
})

test('朋友圈封面使用自适应图片高度而不保留裁切功能', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')
  assert.match(source, /:style="\{ height: `\$\{currentCoverHeight\}px` \}"/)
  assert.match(source, /<image\s+class="cover-bg"[\s\S]*mode="widthFix"[\s\S]*@load="onCoverImageLoad\(\$event, index\)"/)
  assert.doesNotMatch(source, /CoverCropper/)
  assert.doesNotMatch(source, /uploadCroppedCover/)
})

test('首页图片加载前展示媒体骨架，加载后移除', async () => {
  const source = await readFile(new URL('./index/index360.vue', import.meta.url), 'utf8')

  assert.match(source, /v-if="!isImageLoaded\(item\.profileId\)" class="media-skeleton"/)
  assert.match(source, /@load="markImageLoaded\(item\.profileId\)"/)
  assert.match(source, /const loadedImageIds = ref\(new Set\(\)\)/)
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

test('封面外部换封面按钮位于右上角且不遮挡头像', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')

  assert.match(source, /class="cover-change-button" @tap\.stop="changeCover"/)
  assert.match(source, /\.cover-change-button\s*\{[\s\S]*top:\s*24rpx[\s\S]*right:\s*24rpx/)
})

test('资料照片支持从预览中删除，并在删除后刷新列表', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')
  const api = await readFile(new URL('../api/index.js', import.meta.url), 'utf8')

  assert.match(source, /class="cover-preview-delete" @tap\.stop="deleteCurrentCover"/)
  assert.match(source, /await deleteProfilePhotoApi\(photo\)/)
  assert.match(source, /profilePhotos\.value = normalizePhotoUrls\(result\.photos\)/)
  assert.match(api, /export function deleteProfilePhotoApi\(photoUrl\)/)
  assert.match(api, /return del\('\/api\/profile\/photos', \{ photoUrl \}\)/)
})
