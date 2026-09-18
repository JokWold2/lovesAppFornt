import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hydrateProfileEditor, buildProfileEditorPatch, validateProfileEditor,
  getProfileEditorGroups, getProfileCompletion
} from '../utils/profileEditorModel.js'
import { profileEditorMessages } from '../utils/profileEditorMessages.js'

const translate = locale => key => key.split('.').slice(1).reduce((value, part) => value?.[part], profileEditorMessages[locale])

test('opening and confirming untouched legacy content never rewrites stored languages or arrays', () => {
  const original = { occupation: '自營商', faith_life: '有彈性', spouse_faith_life: ['非常傳統', '有彈性'], tool_hands: '["右拇指"]', birth_year: 1990, birth_month: null, birth_day: null, height: 170, photos: ['photo.jpg'], careers: [{ role: 'teacher' }], status: 'old' }
  const draft = hydrateProfileEditor(original)
  assert.equal(draft.spouse_faith_life, '非常傳統 / 有彈性')
  assert.equal(draft.tool_hands, '["右拇指"]')
  assert.equal(draft.birth_date, '')
  assert.deepEqual(buildProfileEditorPatch(original, draft), {})
  getProfileEditorGroups(translate('ja'))
  assert.deepEqual(buildProfileEditorPatch(original, draft), {})
  assert.deepEqual(original.spouse_faith_life, ['非常傳統', '有彈性'])
})

test('only changed text is submitted raw and nested tools include only changed keys', () => {
  const original = { occupation: '受雇', tool_hands: '右拇指', tool_mbti: 'INFP', spouse_faith_life: ['有彈性'], helper_mobile: '+81 090-0123', bio: 'Hello', Selfintroduction: 'Older introduction', photos: ['keep.jpg'] }
  const draft = hydrateProfileEditor(original)
  draft.occupation = 'デザイナー'
  draft.tool_hands = '左手'
  draft.spouse_faith_life = '自由に話し合いたい'
  draft.Selfintroduction = '新しい自己紹介'
  draft.bio = '短いひとこと'
  assert.deepEqual(buildProfileEditorPatch(original, draft), { selfIntroduction: '新しい自己紹介', bio: '短いひとこと', occupation: 'デザイナー', spouseFaithLife: '自由に話し合いたい', tools: { hands: '左手' } })
  assert.equal(original.tool_hands, '右拇指')
})

test('JSON-looking spouse text remains literal while actual legacy arrays are joined for editing', () => {
  const original = { spouse_faith_life: '["祷告"]', tool_hands: '["left"]' }
  const draft = hydrateProfileEditor(original)
  assert.equal(draft.spouse_faith_life, '["祷告"]')
  assert.equal(draft.tool_hands, '["left"]')
  assert.deepEqual(buildProfileEditorPatch(original, draft), {})
  draft.spouse_faith_life = '["literal"]'
  assert.deepEqual(buildProfileEditorPatch(original, draft), { spouseFaithLife: '["literal"]' })
})

test('hidden calendar and unrelated profile properties are never drafted or submitted', () => {
  const original = { calendar_type: '陰曆', status: 'old', photos: ['keep.jpg'] }
  const draft = hydrateProfileEditor(original)
  assert.equal(Object.hasOwn(draft, 'calendar_type'), false)
  draft.calendar_type = 'Solar calendar'
  draft.status = 'new'
  draft.photos = []
  assert.deepEqual(buildProfileEditorPatch(original, draft), {})
})

test('cancelled group drafts cannot mutate the profile or editor baseline', () => {
  const original = { spouse_faith_life: ['old'], tool_mbti: ['INFP'], occupation: 'Writer' }
  const editorDraft = hydrateProfileEditor(original)
  const groupDraft = { ...editorDraft, occupation: 'Changed', spouse_faith_life: 'New' }
  assert.equal(groupDraft.occupation, 'Changed')
  assert.equal(editorDraft.occupation, 'Writer')
  assert.deepEqual(original.spouse_faith_life, ['old'])
  assert.deepEqual(buildProfileEditorPatch(original, editorDraft), {})
})

test('valid leap-day birthday saves three numeric parts and clearing clears all parts', () => {
  const original = { birth_year: 2000, birth_month: 2, birth_day: 29 }
  const draft = hydrateProfileEditor(original)
  assert.equal(draft.birth_date, '2000-02-29')
  draft.birth_date = '1996-02-29'
  assert.equal(validateProfileEditor(draft, original), null)
  assert.deepEqual(buildProfileEditorPatch(original, draft), { birthYear: 1996, birthMonth: 2, birthDay: 29 })
  draft.birth_date = ''
  assert.deepEqual(buildProfileEditorPatch(original, draft), { birthYear: null, birthMonth: null, birthDay: null })
})

test('invalid dates and future dates are rejected while unchanged incomplete legacy dates survive', () => {
  const original = { birth_year: 1988, birth_month: null }
  const draft = hydrateProfileEditor(original)
  assert.equal(validateProfileEditor(draft, original), null)
  for (const value of ['2001-02-29', '2000-04-31', '1998-13-01', 'not a date', '2999-01-01']) {
    draft.birth_date = value
    assert.deepEqual(validateProfileEditor(draft, original), { field: 'birth_date', key: 'profileEditor.errors.date' })
  }
})

test('edited height and weight require positive integers without blocking unchanged legacy values', () => {
  const original = { height: 'legacy', weight: 60 }
  const draft = hydrateProfileEditor(original)
  assert.equal(validateProfileEditor(draft, original), null)
  for (const value of ['170.5', '0', '-1', 'abc', 'Infinity', '1e2']) {
    draft.height = value
    assert.deepEqual(validateProfileEditor(draft, original), { field: 'height', key: 'profileEditor.errors.height' })
  }
  draft.height = '170'
  draft.weight = '61'
  assert.equal(validateProfileEditor(draft, original), null)
  assert.deepEqual(buildProfileEditorPatch(original, draft), { height: 170, weight: 61 })
})

test('edited empty fields become null while unchanged whitespace and contact strings remain untouched', () => {
  const original = { occupation: 'Artist', helper_mobile: '+44 (0) 0123', hobby1: '  old  ', helper_email: 'old-invalid' }
  const draft = hydrateProfileEditor(original)
  draft.occupation = ''
  assert.equal(validateProfileEditor(draft, original), null)
  assert.deepEqual(buildProfileEditorPatch(original, draft), { occupation: null })
  draft.helper_mobile = '+81 090-0012-3456'
  assert.deepEqual(buildProfileEditorPatch(original, draft), { occupation: null, helperMobile: '+81 090-0012-3456' })
  draft.helper_email = 'invalid'
  assert.deepEqual(validateProfileEditor(draft, original), { field: 'helper_email', key: 'profileEditor.errors.email' })
})

test('known backend text limits apply only to changed content', () => {
  for (const [field, max] of [['Selfintroduction', 2000], ['bio', 50], ['occupation', 100], ['faith_life', 50], ['spouse_faith_life', 2000], ['native_first_name', 100], ['helper_mobile', 30], ['school_name', 255], ['hobby1', 255]]) {
    const original = { [field]: 'z'.repeat(max + 1) }
    const draft = hydrateProfileEditor(original)
    assert.equal(validateProfileEditor(draft, original), null)
    draft[field] = 'a'.repeat(max + 1)
    assert.deepEqual(validateProfileEditor(draft, original), { field, key: 'profileEditor.errors.tooLong' })
    draft[field] = 'a'.repeat(max)
    assert.equal(validateProfileEditor(draft, original), null)
  }
})

const coreProfile = {
  Selfintroduction: 'About me', health: '健康', generation: '第二代', blessing_type: '第一次祝福', gender: '女', region: 'Asia', country: 'Japan',
  native_first_name: 'A', birth_year: 1990, birth_month: 1, birth_day: 1, height: 170, weight: 60, nationality: 'Japan', lang1_name: '日本語', lang1_level: '流暢',
  degree_level: '大学', occupation: 'Designer', hobby1: 'Reading', faith_life: 'My faith', spouse_faith_life: 'Shared values',
  tool_hands: '左手', tool_yinyang: '陽', tool_five_elements: '木', tool_enneagram: '4：藝術型', tool_mbti: 'INFP'
}

test('all 24 core criteria reach 100 without helper, second values, qualifications, blood or preferred countries', () => {
  assert.deepEqual(getProfileCompletion(coreProfile), { completed: 24, total: 24, percent: 100, missingGroups: [] })
  assert.deepEqual(getProfileCompletion({ ...coreProfile, occupation: '' }), { completed: 23, total: 24, percent: 96, missingGroups: ['employment'] })
})

test('every unfilled core criterion reduces completion and identifies its group', () => {
  const criteria = [
    ['Selfintroduction', 'introduction'],
    ...['health', 'generation', 'blessing_type', 'gender', 'region', 'country'].map(key => [key, 'basic']),
    ...['native_first_name', 'birth_year', 'height', 'weight', 'nationality', 'lang1_name', 'lang1_level'].map(key => [key, 'personal']),
    ['degree_level', 'education'], ['occupation', 'employment'],
    ...['hobby1', 'faith_life', 'spouse_faith_life'].map(key => [key, 'lifestyle']),
    ...['tool_hands', 'tool_yinyang', 'tool_five_elements', 'tool_enneagram', 'tool_mbti'].map(key => [key, 'personality'])
  ]
  for (const [field, group] of criteria) {
    const incomplete = { ...coreProfile, [field]: '' }
    assert.deepEqual(getProfileCompletion(incomplete), { completed: 23, total: 24, percent: 96, missingGroups: [group] }, field)
  }
})

test('completion alternatives preserve their logical criterion and missing groups stay unique', () => {
  const alternatives = { ...coreProfile, Selfintroduction: '', bio: 'Short bio', native_first_name: '', en_first_name: 'A', hobby1: '', hobby2: 'Reading' }
  assert.equal(getProfileCompletion(alternatives).percent, 100)
  assert.deepEqual(getProfileCompletion({ ...coreProfile, height: '', weight: '', nationality: '' }), { completed: 21, total: 24, percent: 88, missingGroups: ['personal'] })
  assert.deepEqual(getProfileCompletion({}), { completed: 0, total: 24, percent: 0, missingGroups: ['introduction', 'basic', 'personal', 'education', 'employment', 'lifestyle', 'personality'] })
  assert.equal(getProfileCompletion({ ...coreProfile, birth_year: 2999 }).completed, 23)
})

test('each locale produces usable editor fields and submits the selected localized option itself', () => {
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
    const groups = getProfileEditorGroups(translate(locale))
    const fields = groups.flatMap(group => group.fields)
    for (const group of groups) assert.equal(typeof group.title, 'string')
    for (const field of fields) {
      assert.ok(field.label, `${locale}: ${field.key}`)
      for (const value of field.options || []) {
        assert.ok(typeof value === 'string' && value.length, `${locale}: ${field.key}`)
        if (field.maxLength) assert.ok(Array.from(value).length <= field.maxLength, `${locale}: ${field.key} '${value}' exceeds ${field.maxLength}`)
      }
    }
    const degree = fields.find(field => field.key === 'degree_level')
    const draft = hydrateProfileEditor({})
    draft.degree_level = degree.options[0]
    assert.deepEqual(buildProfileEditorPatch({}, draft), { degreeLevel: degree.options[0] })
    for (const key of ['occupation', 'hobby1', 'hobby2', 'faith_life', 'spouse_faith_life']) assert.ok(['text', 'textarea'].includes(fields.find(field => field.key === key).type))
  }
})

test('each language has all UI keys and the same interpolation variables', () => {
  const flatten = (object, prefix = '') => Object.fromEntries(Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? Object.entries(flatten(value, `${prefix}${key}.`)) : [[`${prefix}${key}`, value]]))
  const english = flatten(profileEditorMessages.en)
  for (const messages of Object.values(profileEditorMessages)) {
    const local = flatten(messages)
    assert.deepEqual(Object.keys(local).sort(), Object.keys(english).sort())
    for (const key of Object.keys(english)) {
      assert.ok(typeof local[key] === 'string' && local[key].length)
      assert.deepEqual((local[key].match(/\{\w+\}/g) || []).sort(), (english[key].match(/\{\w+\}/g) || []).sort(), key)
    }
    assert.ok(messages.common.completion.includes('{percent}'))
  }
})
