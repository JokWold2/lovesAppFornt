import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProfileAnalysisRows } from './profileAnalysisPresentation.js'

test('profile analysis rows localize stored values without mutating profile data', () => {
  const profile = {
    tool_hands: '右拇指',
    tool_yinyang: '陽',
    tool_five_elements: '["木","水"]',
    tool_enneagram: '1: 改革型',
    tool_mbti: 'INTJ'
  }
  const translations = {
    'profile.myFile.handsLabel': 'Hands',
    'profile.myFile.yinYangLabel': 'Yin / Yang',
    'profile.myFile.fiveElementsLabel': 'Five elements',
    'profile.myFile.enneagramLabel': 'Enneagram',
    'profile.options.hands.rightThumb': 'Right thumb',
    'profile.options.yinYang.yang': 'Yang',
    'profile.options.fiveElements.wood': 'Wood',
    'profile.options.fiveElements.water': 'Water',
    'profile.options.enneagram.1': '1: Reformer'
  }

  const rows = buildProfileAnalysisRows(profile, key => translations[key] || key)

  assert.deepEqual(rows, [
    { tool: 'Hands', myType: 'Right thumb', recommend: '—' },
    { tool: 'Yin / Yang', myType: 'Yang', recommend: '—' },
    { tool: 'Five elements', myType: 'Wood / Water', recommend: '—' },
    { tool: 'Enneagram', myType: '1: Reformer', recommend: '—' },
    { tool: 'MBTI', myType: 'INTJ', recommend: '—' }
  ])
  assert.equal(profile.tool_five_elements, '["木","水"]')
})
