import assert from 'node:assert/strict'
import test from 'node:test'
import { presentGroupName } from './chatGroupPresentation.js'

test('群名称展示会移除历史遗留的 HTML 箭头前缀', () => {
  assert.equal(presentGroupName('&gt; 一群'), '一群')
  assert.equal(presentGroupName('&amp;gt; 一群'), '一群')
  assert.equal(presentGroupName('正常群名'), '正常群名')
})
