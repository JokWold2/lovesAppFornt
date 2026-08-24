import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('首页动态大图按宽度完整展示', async () => {
  const source = await readFile(new URL('./index/index360.vue', import.meta.url), 'utf8')
  assert.match(source, /class="media-img"[\s\S]*mode="widthFix"/)
  assert.doesNotMatch(source, /\.post-media\s*\{[^}]*height:\s*700rpx/)
})

test('朋友圈单图完整展示，多图不裁切', async () => {
  const source = await readFile(new URL('./my/myLifeShow/myLifeShow.vue', import.meta.url), 'utf8')
  assert.match(source, /class="media-box single-img"[\s\S]*mode="widthFix"/)
  assert.match(source, /class="media-box grid-img"[\s\S]*mode="aspectFit"/)
  assert.doesNotMatch(source, /\.single-img\s*\{[^}]*height:\s*400rpx/)
})
