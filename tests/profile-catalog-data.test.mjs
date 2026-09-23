import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import {
  catalogCountries, catalogLanguages, catalogLanguageNames, catalogLocales,
  catalogFlagSprite, catalogMetadata
} from '../pages/tutorial/utils/profileCatalogData.js'

test('country catalog covers all 249 ISO 3166-1 entries once and has six locale names', () => {
  assert.equal(catalogCountries.length, 249)
  assert.equal(new Set(catalogCountries.map(row => row[0])).size, 249)
  assert.deepEqual(catalogLocales, ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko'])
  for (const [code, names] of catalogCountries) {
    assert.match(code, /^[A-Z]{2}$/)
    assert.equal(names.length, 6)
    for (const name of names) assert.ok(name.length > 0 && name.length <= 100)
  }
  for (const code of ['CN', 'HK', 'MO', 'TW', 'JP', 'KR', 'US', 'BR', 'ZA', 'AQ', 'AX', 'BQ', 'SS']) {
    assert.ok(catalogCountries.some(row => row[0] === code), code)
  }
  for (const code of ['EU', 'ZZ', 'AN', 'XK']) assert.ok(!catalogCountries.some(row => row[0] === code))
})

test('language catalog keeps current individual and macro languages, omits four special codes', () => {
  assert.equal(catalogLanguages.length, 7923)
  assert.equal(new Set(catalogLanguages.map(row => row[0])).size, 7923)
  assert.equal(catalogMetadata.individualCount, 7860)
  assert.equal(catalogMetadata.macrolanguageCount, 63)
  for (const [code, official, alpha2] of catalogLanguages) {
    assert.match(code, /^[a-z]{3}$/)
    assert.ok(official.length > 0 && official.length <= 50)
    if (alpha2) assert.match(alpha2, /^[a-z]{2}$/)
  }
  for (const code of ['eng', 'zho', 'cmn', 'yue', 'jpn', 'kor', 'rus', 'spa', 'ase', 'nzs', 'aaa', 'zul', 'lat']) {
    assert.ok(catalogLanguages.some(row => row[0] === code), code)
  }
  for (const code of ['und', 'mul', 'mis', 'zxx']) assert.ok(!catalogLanguages.some(row => row[0] === code))
})

test('localized names fit existing database columns and resolve unambiguously without fabricated translations', () => {
  const codes = new Set(catalogLanguages.map(row => row[0]))
  for (const locale of catalogLocales) {
    const names = catalogLanguageNames[locale]
    assert.ok(Object.keys(names).length > 100)
    for (const code of Object.keys(names)) assert.ok(codes.has(code))
    const labels = catalogLanguages.map(([code, official]) => names[code] || official)
    for (const label of labels) assert.ok(label.length > 0 && label.length <= 50)
    assert.equal(new Set(labels).size, labels.length, `duplicate ${locale} label`)
  }
  assert.equal(catalogLanguageNames['zh-Hans'].eng, '英语')
  assert.equal(catalogLanguageNames.ja.eng, '英語')
  assert.equal(catalogLanguageNames.ko.eng, '영어')
  assert.equal(catalogLanguageNames['zh-Hans'].aaa, undefined)
  assert.equal(catalogLanguageNames.en.lah, undefined)
  assert.equal(catalogLanguageNames.en.ori, undefined)
})

test('bundled flag atlas covers every country at retina resolution within mini-program asset budget', () => {
  const png = readFileSync(new URL('../static/profile-flags.png', import.meta.url))
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), catalogFlagSprite.width * catalogFlagSprite.density)
  assert.equal(png.readUInt32BE(20), catalogFlagSprite.height * catalogFlagSprite.density)
  assert.ok(catalogFlagSprite.columns * catalogFlagSprite.height / catalogFlagSprite.tileHeight >= catalogCountries.length)
  assert.equal(catalogFlagSprite.path, '/static/profile-flags.png')
  const dataSize = statSync(new URL('../pages/tutorial/utils/profileCatalogData.js', import.meta.url)).size
  assert.ok(dataSize + png.length < 500 * 1024, `${dataSize + png.length} bytes`)
})
