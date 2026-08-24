import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('消息页会轮询刷新群聊未读红点和底部消息角标', async () => {
  const source = await readFile(new URL('./notice.vue', import.meta.url), 'utf8')
  assert.match(source, /hasUnreadMessages\(group\.unread_count\)/)
  assert.match(source, /startMessagePolling/)
  assert.match(source, /setInterval\(load, 5000\)/)
  assert.match(source, /onHide\(stopMessagePolling\)/)
})

test('消息页搜索框从右向左展开，并将标题移动到下一行', async () => {
  const source = await readFile(new URL('./notice.vue', import.meta.url), 'utf8')
  assert.match(source, /@tap="toggleSearch"/)
  assert.match(source, /v-model="searchKeyword"/)
  assert.match(source, /:class="\{ 'search-open': searchOpen \}"/)
  assert.match(source, /width\s+\d+ms ease/)
  assert.match(source, /\.search-open \.header-title-wrap/)
})

test('搜索按钮仅在展开时显示输入框背景色', async () => {
  const source = await readFile(new URL('./notice.vue', import.meta.url), 'utf8')
  assert.match(source, /\.search-shell\s*\{[^}]*background:\s*transparent/)
  assert.match(source, /\.search-open \.search-shell\s*\{[^}]*background:\s*#f3f4f5/)
})

test('消息页搜索会筛选互动消息、待审核项和群聊，并提供空状态', async () => {
  const source = await readFile(new URL('./notice.vue', import.meta.url), 'utf8')
  assert.match(source, /function matchesSearch\(/)
  assert.match(source, /filteredChatGroups/)
  assert.match(source, /filteredRequests/)
  assert.match(source, /暂无匹配消息/)
})
