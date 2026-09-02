import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('publishes a dedicated data-deletion instruction page', async () => {
  const pages = JSON.parse(await readFile(new URL('pages.json', root), 'utf8'))
  assert.ok(pages.pages.some(page => page.path === 'pages/legal/dataDeletion'))
  const page = await readFile(new URL('pages/legal/dataDeletion.vue', root), 'utf8')
  assert.match(page, /dataDeletion/)
  const document = await readFile(new URL('utils/legalDocuments.js', root), 'utf8')
  assert.match(document, /c546460@gmail\.com/)
})

test('privacy policy provides the public privacy contact address', async () => {
  const document = await readFile(new URL('utils/legalDocuments.js', root), 'utf8')
  assert.match(document, /c546460@gmail\.com/)
})
