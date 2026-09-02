import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Android manifest enables Facebook OAuth with the public Meta app ID', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'))
  const oauth = manifest['app-plus']?.distribute?.sdkConfigs?.oauth

  assert.equal(oauth?.facebook?.appid, '2610824026054986')
})
