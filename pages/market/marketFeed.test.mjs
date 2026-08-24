import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('市场详情使用统一尺寸的点赞和评论图标', async () => {
  const source = await readFile(new URL('./marketFeed.vue', import.meta.url), 'utf8')
	assert.match(source, /\/static\/img\/like\.png/)
	assert.match(source, /\/static\/img\/like_act\.png/)
	assert.match(source, /class="meta-like-icon"[\s\S]*post\.isLiked[\s\S]*\/static\/img\/like_act\.png[\s\S]*\/static\/img\/like\.png/)
	assert.match(source, /\.action-icon\s*\{[^}]*width:\s*62rpx;[^}]*height:\s*62rpx/)
	assert.match(source, /\.comment-icon\s*\{[^}]*width:\s*62rpx;[^}]*height:\s*62rpx/)
})

test('双击图片在触点位置展示并淡出点赞动画', async () => {
  const source = await readFile(new URL('./marketFeed.vue', import.meta.url), 'utf8')
  assert.match(source, /@tap="onPhotoTap\(post, \$event\)"/)
  assert.match(source, /class="double-like-heart"/)
  assert.match(source, /doubleLikePosition/)
  assert.match(source, /setTimeout\(\(\) => \{[^}]*doubleLikePostId\.value = null[^}]*\}, 1500\)/)
  assert.match(source, /@keyframes double-like-pop/)
})
