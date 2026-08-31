import test from 'node:test'
import assert from 'node:assert/strict'

import {
  measureH5Viewport,
  writeH5ViewportVariables,
  installH5Viewport,
} from './h5Viewport.js'

test('prefers visual viewport and calculates the covered bottom area', () => {
  assert.deepEqual(
    measureH5Viewport({
      innerHeight: 844,
      visualViewport: { height: 500, offsetTop: 20 },
    }),
    { height: 500, bottomOffset: 324 },
  )
})

test('falls back to innerHeight when visual viewport is missing', () => {
  assert.deepEqual(measureH5Viewport({ innerHeight: 640 }), {
    height: 640,
    bottomOffset: 0,
  })
})

test('normalizes invalid and negative measurements to zero', () => {
  assert.deepEqual(measureH5Viewport({
    innerHeight: -1,
    visualViewport: { height: Number.NaN, offsetTop: -4 },
  }), { height: 0, bottomOffset: 0 })
})

test('writes viewport metrics as pixel CSS variables', () => {
  const values = {}
  writeH5ViewportVariables({ style: { setProperty(name, value) { values[name] = value } } }, {
    height: 500,
    bottomOffset: 324,
  })
  assert.deepEqual(values, {
    '--app-viewport-height': '500px',
    '--app-viewport-bottom-offset': '324px',
  })
})

function makeViewportWindow() {
  const listeners = new Map()
  const visualListeners = new Map()
  const visualViewport = {
    height: 500,
    offsetTop: 20,
    addEventListener(type, listener) { visualListeners.set(type, listener) },
    removeEventListener(type, listener) {
      if (visualListeners.get(type) === listener) visualListeners.delete(type)
    },
    dispatch(type) { visualListeners.get(type)?.() },
  }
  const windowLike = {
    innerHeight: 844,
    visualViewport,
    addEventListener(type, listener) { listeners.set(type, listener) },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
    dispatch(type) { listeners.get(type)?.() },
    requestAnimationFrame(callback) { callback(); return 1 },
    cancelAnimationFrame() {},
  }
  return { windowLike, visualViewport, listeners, visualListeners }
}

test('installs, synchronizes on every viewport event, coalesces frames, and cleans up', () => {
  const { windowLike, visualViewport, listeners, visualListeners } = makeViewportWindow()
  const values = {}
  const documentLike = { documentElement: { style: { setProperty(name, value) { values[name] = value } } } }
  let rafCalls = 0
  let frameCallback
  windowLike.requestAnimationFrame = (callback) => { rafCalls += 1; frameCallback = callback; return rafCalls }

  const cleanup = installH5Viewport(windowLike, documentLike)
  assert.equal(rafCalls, 0)
  assert.equal(values['--app-viewport-height'], '500px')
  assert.equal(values['--app-viewport-bottom-offset'], '324px')

  for (const [target, type] of [
    [visualViewport, 'resize'], [visualViewport, 'scroll'],
    [windowLike, 'resize'], [windowLike, 'orientationchange'], [windowLike, 'pageshow'],
  ]) {
    const before = rafCalls
    target.dispatch(type)
    target.dispatch(type)
    assert.equal(rafCalls, before + 1)
    frameCallback()
  }

  cleanup()
  assert.equal(listeners.size, 0)
  assert.equal(visualListeners.size, 0)
  const beforeCleanup = rafCalls
  windowLike.dispatch('resize')
  visualViewport.dispatch('resize')
  assert.equal(rafCalls, beforeCleanup)
})

test('warns with a fixed message when scheduling an update fails', () => {
  const { windowLike } = makeViewportWindow()
  const documentLike = { documentElement: { style: { setProperty() {} } } }
  windowLike.requestAnimationFrame = () => { throw new Error('scheduling detail') }
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args)
  try {
    const cleanup = installH5Viewport(windowLike, documentLike)
    windowLike.dispatch('resize')
    assert.deepEqual(warnings, [['[h5Viewport] viewport sync failed']])
    cleanup()
  } finally {
    console.warn = originalWarn
  }
})

test('does not overwrite the last valid variables when a later reading is invalid', () => {
  const { windowLike } = makeViewportWindow()
  const values = {}
  const documentLike = { documentElement: { style: { setProperty(name, value) { values[name] = value } } } }
  const cleanup = installH5Viewport(windowLike, documentLike)
  assert.equal(values['--app-viewport-height'], '500px')
  windowLike.innerHeight = Number.NaN
  windowLike.visualViewport.height = Number.NaN
  windowLike.dispatch('resize')
  assert.equal(values['--app-viewport-height'], '500px')
  cleanup()
})
