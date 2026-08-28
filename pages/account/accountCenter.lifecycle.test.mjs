import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('个人中心从 uni-app 导入 onShow 生命周期', async () => {
  const source = await readFile(new URL('./accountCenter.vue', import.meta.url), 'utf8')
  assert.match(source, /import\s*\{\s*onShow\s*\}\s*from\s*['"]@dcloudio\/uni-app['"]/)
  assert.doesNotMatch(source, /import\s*\{[^}]*\bonShow\b[^}]*\}\s*from\s*['"]vue['"]/) 
})
