import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('群头像优先使用自定义图片，否则最多拼接四位成员', async () => {
  const source = await readFile(new URL('./GroupAvatar.vue', import.meta.url), 'utf8')
  assert.match(source, /v-if="avatarUrl"/)
  assert.match(source, /members\.slice\(0, 4\)/)
  assert.match(source, /group-avatar-grid/)
  assert.match(source, /border-radius: 50%/)
})
