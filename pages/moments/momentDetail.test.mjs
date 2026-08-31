import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('朋友圈详情提供多图横向滑动和点赞评论入口', async () => {
  const source = await readFile(new URL('./momentDetail.vue', import.meta.url), 'utf8')
  assert.match(source, /<swiper/)
  assert.match(source, /@change="currentImageIndex = \$event\.detail\.current"/)
  assert.match(source, /toggleLikeMomentApi/)
  assert.match(source, /addCommentApi/)
  assert.match(source, /getCommentsApi/)
})

test('评论按楼层展示头像、作者标识和精确到分钟的时间', async () => {
  const source = await readFile(new URL('./momentDetail.vue', import.meta.url), 'utf8')
  assert.match(source, /class="comment-avatar"/)
  assert.doesNotMatch(source, /第\{\{ index \+ 1 \}\}楼/)
  assert.match(source, /作者/)
  assert.match(source, /formatMinuteTime/)
})

test('底部发送在左侧且为黑灰色，点赞在右侧', async () => {
  const source = await readFile(new URL('./momentDetail.vue', import.meta.url), 'utf8')
  assert.ok(source.indexOf('class="send"') < source.indexOf('class="like"'))
  assert.match(source, /\.send\{[^}]*color:#4a4a4a/)
})

test('动态评论使用名称展示，并将回复限制为一级评论下的第二层', async () => {
  const source = await readFile(new URL('./momentDetail.vue', import.meta.url), 'utf8')
  assert.match(source, /comment\.author_name/)
  assert.match(source, /@tap\.stop="replyTo\(comment\)"/)
  assert.match(source, /v-for="reply in comment\.replies"/)
  assert.match(source, /replyToCommentId/)
  assert.doesNotMatch(source, /class="floor"/)
})

test('动态评论支持分页与二级回复展开收起', async () => {
  const source = await readFile(new URL('./momentDetail.vue', import.meta.url), 'utf8')
  assert.match(source, /@scrolltolower="loadMoreComments"/)
  assert.match(source, /expandReplies\(comment\)/)
  assert.match(source, /collapseReplies\(comment\)/)
  assert.match(source, /reply_count > comment\.replies\.length/)
  assert.match(source, /getMomentCommentRepliesApi/)
})
