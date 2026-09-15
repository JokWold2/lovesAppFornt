import test from 'node:test'
import assert from 'node:assert/strict'
import { SUPPORTED_LOCALES, translate } from '../utils/locale.js'
import { getMembershipChatPrompt, formatMembershipPrice, formatMembershipQuota, getMembershipTierName, getMembershipErrorMessage } from '../utils/membership.js'
const { membershipMessages = {} } = await import('../utils/membershipMessages.js').catch(() => ({}))

test('every supported language has complete membership copy with matching placeholders', () => {
  assert.ok(membershipMessages['zh-Hans'])
  const keys = Object.keys(membershipMessages['zh-Hans']).sort()
  assert.ok(keys.length > 60)
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(membershipMessages[locale] || {}).sort(), keys, locale)
    for (const key of keys) {
      const value = membershipMessages[locale][key]
      assert.equal(typeof value, 'string', `${locale}.${key}`)
      assert.ok(value.length, `${locale}.${key}`)
      assert.deepEqual(placeholders(value), placeholders(membershipMessages['zh-Hans'][key]), `${locale}.${key}`)
      if (['en', 'ru'].includes(locale)) assert.doesNotMatch(value, /[\u3400-\u9fff]/, `${locale}.${key}`)
    }
  }
})

test('membership helpers use the selected language and keep server-only Chinese out of errors', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const t = (key, params) => translate(locale, key, params)
    assert.equal(formatMembershipPrice(0, t), t('membership.free'))
    assert.equal(formatMembershipQuota(null, 'people', t), t('membership.unlimited'))
    assert.equal(formatMembershipQuota(20, 'comments', t), t('membership.commentsPerDay', { count: 20 }))
    assert.equal(getMembershipTierName(6, t), t('membership.tier4'))
    assert.equal(getMembershipChatPrompt({}, t).title, t('membership.likeRequiredTitle'))
    assert.equal(getMembershipChatPrompt({ isLiked: true }, t).title, t('membership.mutualRequiredTitle'))
    assert.equal(getMembershipErrorMessage({ error: '服务异常' }, t, 'loadFailed'), t('membership.loadFailed'))
  }
})

test('native dialog buttons fit the WeChat four-character limit in every language', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of ['goLike', 'gotIt', 'submit', 'confirm', 'cancel']) {
      const value = translate(locale, `membership.${key}`)
      assert.ok([...value].length <= 4, `${locale}.${key}: ${value}`)
    }
  }
})

test('membership, navigation and rewind keys resolve through the app translator', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of ['navigation.likes', 'deck.rewind', 'membership.incoming', 'membership.likeRequiredTitle', 'membership.tier4']) {
      assert.notEqual(translate(locale, key), key, `${locale}.${key}`)
    }
    assert.equal(translate(locale, 'membership.currentTier', { tier: 'Gold' }).includes('Gold'), true)
  }
})
