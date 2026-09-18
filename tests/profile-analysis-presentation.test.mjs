import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProfileAnalysisRows } from '../utils/profileAnalysisPresentation.js'

test('changing the interface language never translates stored profile values', () => {
  const profile = {
    tool_hands: '右拇指', tool_yinyang: '陽', tool_five_elements: '木',
    tool_enneagram: '1: 改革型', tool_mbti: 'INFJ'
  }
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
    const translatedKeys = []
    const rows = buildProfileAnalysisRows(profile, key => {
      translatedKeys.push(key)
      return `${locale}:${key}`
    })
    assert.deepEqual(rows.map(row => row.myType), Object.values(profile))
    assert.equal(translatedKeys.length, 4, 'only section labels are translated')
    assert.ok(translatedKeys.every(key => key.startsWith('profile.myFile.')))
  }
})

test('actual arrays preserve order and JSON-looking text is displayed literally', () => {
  const rows = buildProfileAnalysisRows({
    tool_hands: ['Left hand', '右手'],
    tool_yinyang: '["陰","Yang"]',
    tool_five_elements: '自定义内容',
    tool_enneagram: 'not a JSON value',
    tool_mbti: ''
  }, key => key)
  assert.deepEqual(rows.map(row => row.myType), [
    'Left hand / 右手', '["陰","Yang"]', '自定义内容', 'not a JSON value', '—'
  ])
  assert.deepEqual(rows.map(row => row.recommend), ['—', '—', '—', '—', '—'])
})
