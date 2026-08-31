const valueKeys = {
  hands: { '右拇指': 'profile.options.hands.rightThumb', '左拇指': 'profile.options.hands.leftThumb' },
  yinYang: { '陽': 'profile.options.yinYang.yang', '陰': 'profile.options.yinYang.yin' },
  fiveElements: { '木': 'profile.options.fiveElements.wood', '火': 'profile.options.fiveElements.fire', '土': 'profile.options.fiveElements.earth', '金': 'profile.options.fiveElements.metal', '水': 'profile.options.fiveElements.water' },
  enneagram: { '1: 改革型': 'profile.options.enneagram.1', '2: 助人型': 'profile.options.enneagram.2', '3: 成就型': 'profile.options.enneagram.3', '4: 藝術型': 'profile.options.enneagram.4', '5: 智慧型': 'profile.options.enneagram.5', '6: 忠誠型': 'profile.options.enneagram.6', '7: 遠見型': 'profile.options.enneagram.7', '8: 領導型': 'profile.options.enneagram.8', '9: 和平型': 'profile.options.enneagram.9' }
}

const toolDefinitions = [
  { field: 'tool_hands', type: 'hands', label: 'profile.myFile.handsLabel' },
  { field: 'tool_yinyang', type: 'yinYang', label: 'profile.myFile.yinYangLabel' },
  { field: 'tool_five_elements', type: 'fiveElements', label: 'profile.myFile.fiveElementsLabel' },
  { field: 'tool_enneagram', type: 'enneagram', label: 'profile.myFile.enneagramLabel' },
  { field: 'tool_mbti', type: 'mbti', label: null }
]

function valuesFromStoredField(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch (_) {
    return [value]
  }
}

function displayValue(type, value, translate) {
  const keys = valueKeys[type] || {}
  const values = valuesFromStoredField(value)
  return values.map((item) => {
    const key = keys[item]
    return key ? translate(key) : item
  }).join(' / ') || '—'
}

export function buildProfileAnalysisRows(profile = {}, translate) {
  return toolDefinitions.map(({ field, type, label }) => ({
    tool: label ? translate(label) : 'MBTI',
    myType: displayValue(type, profile[field], translate),
    recommend: '—'
  }))
}
