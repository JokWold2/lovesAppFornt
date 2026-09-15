import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const configSource = await readFile(new URL('../utils/config.js', import.meta.url), 'utf8')

// Keep only the platform branch that uni-app would compile, then execute the
// actual configuration without providing APIs belonging to another platform.
function readBaseURL({ h5, hostname, source = configSource }) {
  const active = [true]
  const compiled = source.split(/\r?\n/).filter((line) => {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef)\s+H5\s*$/)
    if (directive) {
      active.push(active.at(-1) && (directive[1] === 'ifdef' ? h5 : !h5))
      return false
    }
    if (/^\s*\/\/\s*#endif\s*$/.test(line)) {
      assert.ok(active.length > 1, 'Conditional compilation directives must be balanced')
      active.pop()
      return false
    }
    return active.at(-1)
  }).join('\n')
  assert.equal(active.length, 1, 'Conditional compilation directives must be balanced')
  const context = h5 ? { window: { location: { hostname } } } : {}
  return vm.runInNewContext(compiled.replace('export const config', 'const config') + '\nconfig.baseURL', context)
}

// The selected API must not be overridden by the H5 page hostname, and the
// exact same switch must work when no browser globals exist on App/WeChat.
for (const baseURL of ['http://127.0.0.1:3000', 'https://www.lovesapp2026.com', 'http://192.168.31.61:3000']) {
  test(`all platforms use the selected backend ${baseURL}`, () => {
    const source = configSource.replace(
      /^const API_BASE_URL = '[^']*'/m,
      `const API_BASE_URL = '${baseURL}'`
    )
    for (const hostname of ['localhost', '127.0.0.1', '::1', '192.168.31.61', 'app.example.com']) {
      assert.equal(readBaseURL({ h5: true, hostname, source }), baseURL, hostname)
    }
    assert.equal(readBaseURL({ h5: false, source }), baseURL)
  })
}
