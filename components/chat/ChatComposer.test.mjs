import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('群聊输入栏使用图片表情图标且不让 textarea 自动顶起页面', async () => {
  const source = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  assert.match(source, /src="\/static\/img\/icon-emoji-dark\.png"/)
  assert.match(source, /:adjust-position="false"/)
  assert.ok(source.indexOf('icon-emoji-dark.png') > source.indexOf('class="draft"'))
})

test('群聊输入栏保留左侧功能入口及右侧语音、表情和附加操作', async () => {
  const source = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  assert.match(source, /class="apps-icon"/)
  assert.match(source, /icon-voice-message-dark\.png/)
  assert.match(source, /icon-emoji-dark\.png/)
  assert.match(source, /icon-create-post-dark\.png/)
})

test('二手市场内容详情使用拆分后的评论图标', async () => {
  const source = await readFile(new URL('../../pages/market/marketFeed.vue', import.meta.url), 'utf8')
  assert.match(source, /src="\/static\/img\/icon-comment\.png"/)
})

test('群聊页面禁用页面滚动以让键盘只压缩消息区域', async () => {
  const source = await readFile(new URL('../../pages.json', import.meta.url), 'utf8')
  assert.match(source, /"path":\s*"pages\/chat\/chatRoom"[\s\S]*?"disableScroll":\s*true/)
})
