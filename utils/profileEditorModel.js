// Values remain user-entered text. Locale changes never normalize stored profile data.
const fieldDefinitions = [
  ['introduction', 'Selfintroduction', 'textarea', 'selfIntroduction', { maxLength: 2000 }],
  ['introduction', 'bio', 'text', 'bio', { maxLength: 50 }],
  ['basic', 'health', 'select', 'health', { choices: 'health.healthy health.special' }],
  ['basic', 'generation', 'select', 'generation', { choices: 'generation.blessing generation.first generation.second' }],
  ['basic', 'blessing_type', 'select', 'blessingType', { choices: 'blessing.first blessing.again' }],
  ['basic', 'gender', 'select', 'gender', { choices: 'gender.male gender.female' }],
  ['basic', 'region', 'select', 'region', { choices: 'region.asia region.europe region.americas region.africa region.oceania' }],
  ['basic', 'country', 'select', 'country', { choices: 'countries' }],
  ['personal', 'native_last_name', 'text', 'nativeLastName'],
  ['personal', 'native_first_name', 'text', 'nativeFirstName'],
  ['personal', 'en_last_name', 'text', 'enLastName'],
  ['personal', 'en_first_name', 'text', 'enFirstName'],
  ['personal', 'birth_date', 'date', null],
  ['personal', 'height', 'number', 'height', { unit: 'cm' }],
  ['personal', 'weight', 'number', 'weight', { unit: 'kg' }],
  ['personal', 'blood_type', 'select', 'bloodType', { choices: 'blood.a blood.b blood.o blood.ab' }],
  ['personal', 'blood_rh', 'select', 'bloodRh', { values: ['RH+', 'RH-'] }],
  ['personal', 'nationality', 'select', 'nationality', { choices: 'countries' }],
  ['personal', 'qualification1', 'text', 'qualification1'],
  ['personal', 'qualification2', 'text', 'qualification2'],
  ['personal', 'preferred_country1', 'select', 'preferredCountry1', { choices: 'preferredCountries' }],
  ['personal', 'preferred_country2', 'select', 'preferredCountry2', { choices: 'preferredCountries' }],
  ['personal', 'lang1_name', 'select', 'lang1Name', { choices: 'languages' }],
  ['personal', 'lang1_level', 'select', 'lang1Level', { choices: 'levels' }],
  ['personal', 'lang2_name', 'select', 'lang2Name', { choices: 'languages' }],
  ['personal', 'lang2_level', 'select', 'lang2Level', { choices: 'levels' }],
  ['education', 'degree_level', 'select', 'degreeLevel', { choices: 'degree.junior degree.high degree.college degree.master degree.doctor' }],
  ['education', 'degree_status', 'select', 'degreeStatus', { choices: 'degreeStatus.graduated degreeStatus.interrupted degreeStatus.studying' }],
  ['education', 'school_name', 'text', 'schoolName'],
  ['education', 'major', 'text', 'major'],
  ['employment', 'occupation', 'text', 'occupation', { maxLength: 100 }],
  ['employment', 'company_name', 'text', 'companyName'],
  ['helper', 'helper_name', 'text', 'helperName'],
  ['helper', 'helper_mobile', 'text', 'helperMobile'],
  ['helper', 'helper_email', 'text', 'helperEmail'],
  ['lifestyle', 'hobby1', 'text', 'hobby1'],
  ['lifestyle', 'hobby2', 'text', 'hobby2'],
  ['lifestyle', 'faith_life', 'text', 'faithLife', { maxLength: 50 }],
  ['lifestyle', 'spouse_faith_life', 'textarea', 'spouseFaithLife', { maxLength: 2000 }],
  ['personality', 'tool_hands', 'select', 'tools.hands', { choices: 'hands.left hands.right' }],
  ['personality', 'tool_yinyang', 'select', 'tools.yinyang', { choices: 'yinYang.yang yinYang.yin' }],
  ['personality', 'tool_five_elements', 'select', 'tools.fiveElements', { choices: 'fiveElements.wood fiveElements.fire fiveElements.earth fiveElements.metal fiveElements.water' }],
  ['personality', 'tool_enneagram', 'select', 'tools.enneagram', { choices: 'enneagram.1 enneagram.2 enneagram.3 enneagram.4 enneagram.5 enneagram.6 enneagram.7 enneagram.8 enneagram.9' }],
  ['personality', 'tool_mbti', 'select', 'tools.mbti', { values: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] }]
]

const groupDefinitions = [
  ['introduction', 'compose'], ['basic', 'info'], ['personal', 'person'],
  ['education', 'flag'], ['employment', 'wallet'], ['helper', 'contact'],
  ['lifestyle', 'star'], ['personality', 'heart']
]
const choiceLists = {
  levels: 'level.fluent level.fair level.basic'
}
const textLimits = {
  health: 50, generation: 50, blessing_type: 50, gender: 10,
  region: 100, country: 100, nationality: 100, preferred_country1: 100, preferred_country2: 100,
  native_last_name: 100, native_first_name: 100, en_last_name: 100, en_first_name: 100,
  blood_type: 5, blood_rh: 5, qualification1: 255, qualification2: 255,
  lang1_name: 50, lang2_name: 50, lang1_level: 20, lang2_level: 20,
  degree_level: 50, degree_status: 50, school_name: 255, major: 255, company_name: 255,
  helper_name: 100, helper_mobile: 30, helper_email: 255, hobby1: 255, hobby2: 255,
  tool_hands: 20, tool_yinyang: 10, tool_five_elements: 10, tool_enneagram: 20, tool_mbti: 10
}

export function getProfileEditorGroups(t) {
  return groupDefinitions.map(([key, icon]) => ({
    key, title: t(`profileEditor.groups.${key}`), icon,
    fields: fieldDefinitions.filter(([group]) => group === key).map(([, field, type, , config = {}]) => {
      const result = { key: field, label: t(`profileEditor.fields.${field}`), type }
      const maxLength = config.maxLength || textLimits[field]
      if (maxLength) result.maxLength = maxLength
      if (config.unit) result.unit = config.unit
      if (config.values) result.options = [...config.values]
      if (['countries', 'preferredCountries', 'languages'].includes(config.choices)) {
        result.type = 'catalog'
        result.catalog = config.choices
      } else if (config.choices) result.options = (choiceLists[config.choices] || config.choices).split(' ').map(choice => t(`profileEditor.options.${choice}`))
      return result
    })
  }))
}

function textValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(item => String(item ?? '')).join(' / ')
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function dateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText), month = Number(monthText), day = Number(dayText)
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= days[month - 1] ? { birthYear: year, birthMonth: month, birthDay: day } : null
}

function profileDate(profile) {
  const values = [profile.birth_year, profile.birth_month, profile.birth_day]
  if (values.some(value => value == null || value === '' || !/^\d+$/.test(String(value)))) return ''
  const iso = `${String(values[0]).padStart(4, '0')}-${String(values[1]).padStart(2, '0')}-${String(values[2]).padStart(2, '0')}`
  return dateParts(iso) ? iso : ''
}

function validBirthDate(value) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return !!dateParts(value) && value <= today
}

export function hydrateProfileEditor(profile = {}) {
  const source = profile || {}
  return Object.fromEntries(fieldDefinitions.map(([, key]) => [key,
    key === 'birth_date' ? profileDate(source) : textValue(source[key])
  ]))
}

function changedFields(original, draft) {
  const baseline = hydrateProfileEditor(original)
  return fieldDefinitions.filter(([, key]) => Object.prototype.hasOwnProperty.call(draft, key) && textValue(draft[key]) !== baseline[key])
}

export function buildProfileEditorPatch(original = {}, draft = {}) {
  const patch = {}
  for (const [, key, type, target] of changedFields(original, draft)) {
    const text = textValue(draft[key])
    if (key === 'birth_date') {
      const parts = text === '' ? { birthYear: null, birthMonth: null, birthDay: null } : dateParts(text)
      if (!parts) throw new RangeError('Invalid birth date')
      Object.assign(patch, parts)
      continue
    }
    const value = text === '' ? null : type === 'number' ? Number(text) : text
    if (target.startsWith('tools.')) {
      if (!patch.tools) patch.tools = {}
      patch.tools[target.slice(6)] = value
    } else {
      patch[target] = value
    }
  }
  return patch
}

export function validateProfileEditor(draft = {}, original = {}) {
  for (const [, field, type, , config = {}] of changedFields(original, draft)) {
    const value = textValue(draft[field])
    if (value === '') continue
    let error = ''
    if (type === 'date') {
      if (!validBirthDate(value)) error = 'date'
    } else if (type === 'number') {
      if (!/^\d+$/.test(value) || Number(value) <= 0 || Number(value) > 2147483647) error = field
    } else if (field === 'helper_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = 'email'
    }
    const maxLength = config.maxLength || textLimits[field]
    if (!error && maxLength && Array.from(value).length > maxLength) error = 'tooLong'
    if (error) return { field, key: `profileEditor.errors.${error}` }
  }
  return null
}

export function getProfileCompletion(profile = {}) {
  const draft = hydrateProfileEditor(profile)
  const filled = key => !!draft[key]?.trim()
  const any = keys => keys.some(filled)
  const criteriaByGroup = [
    ['introduction', [any(['Selfintroduction', 'bio'])]],
    ['basic', ['health', 'generation', 'blessing_type', 'gender', 'region', 'country'].map(filled)],
    ['personal', [
      any(['native_last_name', 'native_first_name', 'en_last_name', 'en_first_name']),
      validBirthDate(draft.birth_date),
      ...['height', 'weight', 'nationality', 'lang1_name', 'lang1_level'].map(filled)
    ]],
    ['education', [filled('degree_level')]],
    ['employment', [filled('occupation')]],
    ['lifestyle', [any(['hobby1', 'hobby2']), filled('faith_life'), filled('spouse_faith_life')]],
    ['personality', ['tool_hands', 'tool_yinyang', 'tool_five_elements', 'tool_enneagram', 'tool_mbti'].map(filled)]
  ]
  const criteria = criteriaByGroup.flatMap(([, values]) => values)
  const missingGroups = criteriaByGroup.filter(([, values]) => values.some(complete => !complete)).map(([key]) => key)
  const total = criteria.length, completed = criteria.filter(Boolean).length
  return { completed, total, percent: Math.round(completed / total * 100), missingGroups }
}
