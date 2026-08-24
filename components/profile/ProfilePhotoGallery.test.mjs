import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('资料相册点赞使用状态对应的图片资源', async () => {
  const source = await readFile(new URL('./ProfilePhotoGallery.vue', import.meta.url), 'utf8')
  assert.match(source, /<image\s+class="like-icon"[\s\S]*liked[\s\S]*\/static\/img\/like_act\.png[\s\S]*\/static\/img\/like\.png/)
  assert.match(source, /\.like-icon\s*\{[^}]*width:\s*42rpx;[^}]*height:\s*42rpx/)
})

test('资料照片按原始比例展示而不裁切', async () => {
  const source = await readFile(new URL('./ProfilePhotoGallery.vue', import.meta.url), 'utf8')
  assert.match(source, /class="photo"[\s\S]*mode="widthFix"/)
  assert.doesNotMatch(source, /\.photo\s*\{[^}]*height:\s*400rpx/)
})
