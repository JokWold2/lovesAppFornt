import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appSource = fs.readFileSync(path.join(repoRoot, 'App.vue'), 'utf8')
const h5Blocks = [...appSource.matchAll(/\/\*\s*#ifdef\s+H5\s*\*\/(.*?)(?:\/\*\s*#endif\s*\*\/)/gs)]
  .map((match) => match[1])
const h5Source = h5Blocks.join('\n')

test('App.vue defines the shared H5 viewport layout classes and variables', () => {
  for (const className of [
    '.app-h5-screen',
    '.app-h5-min-screen',
    '.app-h5-scroll',
    '.app-h5-fixed-bottom',
    '.app-h5-sheet-mask',
    '.app-h5-sheet'
  ]) {
    assert.match(h5Source, new RegExp(`${className.replace('.', '\\.') }\\s*\\{`))
  }

  for (const token of [
    '--app-viewport-height',
    '--app-viewport-offset-top',
    '--app-viewport-bottom-offset',
    '--app-layout-viewport-height',
    'env(safe-area-inset-bottom)'
  ]) {
    assert.match(h5Source, new RegExp(token.replace(/[()]/g, '\\$&')))
  }

  assert.match(h5Source, /\.app-h5-screen\s*\{[^}]*position\s*:\s*fixed[^}]*top\s*:\s*calc\(var\(--app-viewport-offset-top[^}]*height\s*:\s*calc\(var\(--app-viewport-height/s)
  assert.match(h5Source, /\.app-h5-min-screen\s*\{[^}]*min-height\s*:\s*calc\(var\(--app-layout-viewport-height/s)
})

test('shared H5 layout styles do not disable native page scrolling globally', () => {
  assert.doesNotMatch(appSource, /uni-page-body\s*\{[^}]*overflow\s*:\s*hidden\s*;[^}]*\}/s)
  assert.doesNotMatch(appSource, /body\s*\{[^}]*overflow\s*:\s*hidden\s*;[^}]*\}/s)
})
