import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import compat from '../build/uni-console-compat.cjs'

const id = '/toolchain/node_modules/@dcloudio/uni-console/dist/mp.esm.js'
const source = await readFile(new URL('../node_modules/@dcloudio/uni-console/dist/mp.esm.js', import.meta.url), 'utf8')
const plugin = compat({ platform: 'mp-weixin', development: true })

test('development console timeouts close with a permitted code and allow host fallback', async () => {
  const fixed = plugin.transform(source, id).code
  const start = fixed.indexOf('function tryConnectSocket(')
  const end = fixed.indexOf('\nfunction ', start + 1)
  const timeouts = []
  const closed = []
  const sandbox = {
    SOCKET_TIMEOUT: 500,
    setTimeout: callback => { timeouts.push(callback); return 1 }, clearTimeout() {},
    uni: { connectSocket: () => ({
      close: ({ code }) => {
        assert.ok(code === 1000 || code >= 3000 && code <= 4999)
        closed.push(code)
      },
      onOpen() {}, onClose() {}, onError() {}, onMessage() {}
    }) }
  }
  const connect = vm.runInNewContext(fixed.slice(start, end) + '\ntryConnectSocket', sandbox)
  const result = connect('127.0.0.1', 8090, 'test-console')
  timeouts[0]()
  assert.equal(await result, null)
  assert.deepEqual(closed, [1000])
})

test('patch leaves production, other platforms and application sockets unchanged', () => {
  assert.equal(compat({ platform: 'mp-weixin', development: false }).transform(source, id), null)
  assert.equal(compat({ platform: 'h5', development: true }).transform(source, id), null)
  assert.equal(plugin.transform(source, '/src/business-socket.js'), null)
  const fixed = plugin.transform(source, id).code
  assert.equal(plugin.transform(fixed, id), null)
})
