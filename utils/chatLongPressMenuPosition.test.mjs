import test from 'node:test'
import assert from 'node:assert/strict'

import { getLongPressMenuPosition } from './chatLongPressMenuPosition.js'

test('长按菜单优先显示在被选消息的上方并水平贴近消息', () => {
  assert.deepEqual(
    getLongPressMenuPosition({ x: 210, y: 460 }, { width: 390, height: 760 }, { width: 172, height: 62 }),
    { left: 124, top: 386, arrow: 'bottom' }
  )
})

test('靠近顶部的消息将菜单放在下方且不越出屏幕', () => {
  assert.deepEqual(
    getLongPressMenuPosition({ x: 18, y: 20 }, { width: 390, height: 760 }, { width: 172, height: 62 }),
    { left: 12, top: 32, arrow: 'top' }
  )
})
