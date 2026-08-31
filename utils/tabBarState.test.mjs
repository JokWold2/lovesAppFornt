import test from 'node:test'
import assert from 'node:assert/strict'
import { isTabBarRoute } from './tabBarState.js'

test('tab bar updates are allowed only for configured tab pages', () => {
  assert.equal(isTabBarRoute('pages/index/index360'), true)
  assert.equal(isTabBarRoute('/pages/notice/notice'), true)
  assert.equal(isTabBarRoute('pages/my/myLifeShow/myLifeShow'), true)
  assert.equal(isTabBarRoute('pages/account/accountCenter'), false)
  assert.equal(isTabBarRoute(''), false)
})
