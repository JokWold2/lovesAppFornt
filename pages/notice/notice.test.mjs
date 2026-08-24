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
