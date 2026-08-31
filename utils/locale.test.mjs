import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveLocale, translate } from './locale.js'

test('manual locale overrides system and country locale', () => {
  assert.equal(resolveLocale({ mode: 'manual', preferredLocale: 'ru', systemLocale: 'ja-JP', countryCode: 'CN' }), 'ru')
})

test('system locale wins and unknown values fall back to English', () => {
  assert.equal(resolveLocale({ mode: 'auto', systemLocale: 'ko-KR', countryCode: 'CN' }), 'ko')
  assert.equal(resolveLocale({ mode: 'auto', systemLocale: 'fr-FR', countryCode: 'FR' }), 'en')
})

test('translation returns English fallback and preserves unknown keys for diagnostics', () => {
  assert.equal(translate('ja', 'common.save'), '保存')
	assert.equal(translate('ru', 'navigation.messages'), 'Сообщения')
  assert.equal(translate('ru', 'common.missing'), 'common.missing')
})

test('profile picker labels have localized region, country, and blood-type displays', () => {
  assert.equal(translate('ja', 'profile.options.region.asia'), 'アジア')
  assert.equal(translate('ru', 'profile.options.country.japan'), 'Япония')
  assert.equal(translate('ko', 'profile.options.bloodType.a'), 'A형')
})

test('profile analysis options are not left in English for Russian, Japanese, or Korean', () => {
  assert.equal(translate('ru', 'profile.options.fiveElements.wood'), 'Дерево')
  assert.equal(translate('ja', 'profile.options.enneagram.1'), '1: 改革者')
  assert.equal(translate('ko', 'profile.options.hands.rightThumb'), '오른쪽 엄지')
})

test('profile analysis tool labels are localized in Russian', () => {
  assert.equal(translate('ru', 'profile.myFile.handsLabel'), 'Сцепление рук')
  assert.equal(translate('ru', 'profile.myFile.yinYangLabel'), 'Инь / Ян')
  assert.equal(translate('ru', 'profile.myFile.fiveElementsLabel'), 'Пять элементов')
  assert.equal(translate('ru', 'profile.myFile.enneagramLabel'), 'Эннеаграмма')
})

test('moment visibility member label is localized', () => {
  assert.equal(translate('ru', 'publish.visibleFriends'), 'Видимые друзья:')
})

test('native dialog actions are localized for every supported locale', () => {
  const expected = {
    'zh-Hans': ['取消', '确认'],
    'zh-Hant': ['取消', '確認'],
    en: ['Cancel', 'Confirm'],
    ru: ['Отмена', 'Подтвердить'],
    ja: ['キャンセル', '確認'],
    ko: ['취소', '확인']
  }

  for (const [locale, [cancel, confirm]] of Object.entries(expected)) {
    assert.equal(translate(locale, 'common.cancel'), cancel)
    assert.equal(translate(locale, 'common.confirm'), confirm)
  }
})

test('destructive group-dialog actions do not fall back to English', () => {
  const expected = {
    'zh-Hans': ['移除', '解散群聊'],
    'zh-Hant': ['移除', '解散群聊'],
    en: ['Remove', 'Dissolve group'],
    ru: ['Удалить', 'Распустить группу'],
    ja: ['削除', 'グループを解散'],
    ko: ['제거', '그룹 해산']
  }

  for (const [locale, [remove, dissolve]] of Object.entries(expected)) {
    assert.equal(translate(locale, 'group.remove'), remove)
    assert.equal(translate(locale, 'group.dissolve'), dissolve)
  }
})

test('custom rejection and publishing confirmations do not use English fallbacks', () => {
  for (const locale of ['zh-Hans', 'zh-Hant', 'ru', 'ja', 'ko']) {
    for (const key of ['review.rejectTitle', 'review.confirmReject', 'publish.notice', 'publish.discard', 'publish.deleteImage']) {
      assert.notEqual(translate(locale, key), translate('en', key), `${locale} ${key}`)
    }
  }
})
