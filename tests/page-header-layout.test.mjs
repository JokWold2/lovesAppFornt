import test from 'node:test'
import assert from 'node:assert/strict'
import { getPageHeaderInset, readPageHeaderInset } from '../utils/pageHeaderLayout.js'

test('WeChat custom controls are below both iOS and Android menu capsules', () => {
  assert.equal(getPageHeaderInset({ statusBarHeight: 59, uniPlatform: 'mp-weixin' }, { top: 63, bottom: 95, height: 32, width: 87 }), 103)
  assert.equal(getPageHeaderInset({ statusBarHeight: 24, uniPlatform: 'mp-weixin' }, { top: 28, bottom: 60, height: 32, width: 87 }), 68)
})

test('native safe areas and H5 without a native status bar remain distinct', () => {
  assert.equal(getPageHeaderInset({ statusBarHeight: 44, safeAreaInsets: { top: 47 } }), 47)
  assert.equal(getPageHeaderInset({ statusBarHeight: 24, safeArea: { top: 24 } }), 24)
  assert.equal(getPageHeaderInset({ uniPlatform: 'web' }), 0)
})

test('invalid or not-yet-ready WeChat capsule metrics reserve a native navigation row', () => {
  const info = { statusBarHeight: 59, uniPlatform: 'mp-weixin' }
  assert.equal(getPageHeaderInset(info, { top: 0, bottom: 0, width: 0, height: 0 }), 103)
  assert.equal(getPageHeaderInset(info, { top: 63, bottom: 9999, width: 87, height: 32 }), 103)
})

test('SDK version fallback handles unavailable metrics without throwing', () => {
  assert.equal(readPageHeaderInset({ getWindowInfo() { throw Error('unsupported') }, getSystemInfoSync: () => ({ statusBarHeight: 24 }), getMenuButtonBoundingClientRect() { throw Error('unsupported') } }), 24)
  assert.equal(readPageHeaderInset({}), 0)
  assert.equal(readPageHeaderInset({ getWindowInfo: () => ({ statusBarHeight: 59 }), getSystemInfoSync: () => ({ uniPlatform: 'mp-weixin', statusBarHeight: 59 }), getMenuButtonBoundingClientRect: () => ({ height: 0 }) }), 103)
})
