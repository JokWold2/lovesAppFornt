const toolDefinitions = [
  { field: 'tool_hands', label: 'profile.myFile.handsLabel' },
  { field: 'tool_yinyang', label: 'profile.myFile.yinYangLabel' },
  { field: 'tool_five_elements', label: 'profile.myFile.fiveElementsLabel' },
  { field: 'tool_enneagram', label: 'profile.myFile.enneagramLabel' },
  { field: 'tool_mbti', label: null }
]

function valuesFromStoredField(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value) return []
  return [value]
}

export function buildProfileAnalysisRows(profile = {}, translate) {
  return toolDefinitions.map(({ field, label }) => ({
    tool: label ? translate(label) : 'MBTI',
    // Profile values are stored user text; locale changes affect labels only.
    myType: valuesFromStoredField(profile[field]).join(' / ') || '—',
    recommend: '—'
  }))
}
