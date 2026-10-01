export function createSearchForm () {
  return {
    name: '',
    gender: [],
    generation: [],
    status: [],
    preferredCountries: [],
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: '',
    topGun: false,
    jobs: [],
    faithLife: [],
    wantBlessing2026: false,
    tools: {
      hands: { enabled: false, value: '' },
      yinyang: { enabled: false, value: '' },
      fiveElements: { enabled: false, values: [] },
      enneagram: { enabled: false, values: [] },
      mbti: { enabled: false, value: '' }
    }
  }
}

export function countAdvancedFilters (form = {}) {
  const arrays = ['generation', 'status', 'preferredCountries', 'jobs', 'faithLife']
  let count = arrays.reduce((sum, key) => sum + (Array.isArray(form[key]) ? form[key].length : 0), 0)
  for (const key of ['ageMin', 'ageMax', 'heightMin', 'heightMax']) {
    if (form[key] && form[key] !== '全部') count += 1
  }
  if (form.topGun) count += 1
  if (form.wantBlessing2026) count += 1
  const tools = form.tools || {}
  for (const key of ['hands', 'yinyang', 'fiveElements', 'enneagram', 'mbti']) {
    if (tools[key]?.enabled) count += 1
  }
  return count
}

export function buildSearchPayload (form, page, pageSize) {
  const payload = JSON.parse(JSON.stringify(form || {}))
  for (const key of ['ageMin', 'ageMax', 'heightMin', 'heightMax']) {
    if (!payload[key] || payload[key] === '全部') delete payload[key]
  }
  return { ...payload, page, pageSize }
}
