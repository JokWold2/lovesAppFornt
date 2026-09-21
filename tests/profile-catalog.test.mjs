import test from 'node:test'
import assert from 'node:assert/strict'
import { getProfileCatalog, searchProfileCatalog, findProfileCountry, profileFlagStyle } from '../utils/profileCatalog.js'
import { getProfileEditorGroups, hydrateProfileEditor, buildProfileEditorPatch, validateProfileEditor } from '../utils/profileEditorModel.js'
import { profileEditorMessages } from '../utils/profileEditorMessages.js'

const t = locale => key => key.split('.').slice(1).reduce((v, part) => v?.[part], profileEditorMessages[locale])

test('all country and language fields use a catalog instead of embedding thousands of choices', () => {
  const fields = getProfileEditorGroups(t('zh-Hans')).flatMap(g => g.fields)
  for (const key of ['country','nationality','preferred_country1','preferred_country2','lang1_name','lang2_name']) {
    const field = fields.find(f => f.key === key)
    assert.equal(field.type, 'catalog')
    assert.ok(['countries','preferredCountries','languages'].includes(field.catalog))
    assert.equal(field.options, undefined)
  }
  assert.equal(fields.find(f => f.key === 'bio').label, '签名')
})

test('country coverage, six locales and metadata-only flags', () => {
  for (const locale of Object.keys(profileEditorMessages)) {
    const countries = getProfileCatalog('countries', locale)
    assert.equal(countries.length, 249)
    const china = countries.find(c => c.code === 'CN')
    assert.ok(china.label && !/\p{Regional_Indicator}/u.test(china.label))
    assert.equal(findProfileCountry(china.label)?.code, 'CN')
    assert.equal(profileFlagStyle(china.flagIndex).backgroundSize, '512px 384px')
    const draft = hydrateProfileEditor({}); draft.country = china.label
    assert.deepEqual(buildProfileEditorPatch({}, draft), { country: china.label })
    assert.equal(validateProfileEditor(draft, {}), null)
    assert.equal(getProfileCatalog('preferredCountries', locale)[0].label, t(locale)('profileEditor.options.preferredCountry.all'))
  }
})

test('search accepts codes and names in all six UI languages without changing labels', () => {
  for (const term of ['Japan', '日本', '일본', 'Япония', 'JP']) {
    assert.equal(searchProfileCatalog('countries','en',term)[0].code,'JP')
  }
  assert.equal(searchProfileCatalog('countries','zh-Hans','  BR  ')[0].code,'BR')
  assert.equal(searchProfileCatalog('countries','en','Cote d’Ivoire')[0].code,'CI')
  for (const term of ['Korean','한국어','韩语','韓国語','kor','ko']) {
    assert.ok(searchProfileCatalog('languages','zh-Hans',term).some(row => row.code === 'kor'), term)
  }
  assert.deepEqual(searchProfileCatalog('countries','en','no-such-country-999'), [])
})

test('full ISO language catalog and existing raw text remain saveable', () => {
  const languages = getProfileCatalog('languages','zh-Hans')
  assert.ok(languages.length > 7900)
  assert.ok(languages.find(l => l.code === 'yue'))
  for (const item of languages) {
    assert.ok(Array.from(item.label).length <= 50, item.code)
  }
  const original = { lang1_name: '历史语言自定义内容', nationality: 'Japan', country: '不在目录里的文字' }
  const draft = hydrateProfileEditor(original)
  getProfileCatalog('languages', 'ja')
  assert.deepEqual(buildProfileEditorPatch(original, draft), {})
  draft.lang1_name = languages.find(l => l.code === 'kor').label
  assert.deepEqual(buildProfileEditorPatch(original, draft), { lang1Name: draft.lang1_name })
})
