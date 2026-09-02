import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const configSource = await readFile(new URL('../utils/config.js', import.meta.url), 'utf8')

assert.match(
  configSource,
  /baseURL:\s*''/,
  'H5 deployment must use a same-origin API base so HTTPS does not load an insecure HTTP API.'
)

console.log('H5 API base uses the current origin.')
