import test from 'node:test'
import assert from 'node:assert/strict'
import { messageInboxMessages } from '../utils/messageInboxMessages.js'
import { SUPPORTED_LOCALES, translate } from '../utils/locale.js'
import { formatUnreadBadge } from '../utils/unreadBadgeState.js'

test('all six locales translate each message-page label with matching placeholders', () => {
  const keys = Object.keys(messageInboxMessages['zh-Hans']).sort()
  const variables = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(messageInboxMessages[locale]).sort(), keys)
    for (const key of keys) {
      const value = messageInboxMessages[locale][key]
      assert.equal(typeof value, 'string')
      assert.ok(value.trim(), `${locale}.${key}`)
      assert.deepEqual(variables(value), variables(messageInboxMessages['zh-Hans'][key]), `${locale}.${key}`)
      assert.notEqual(translate(locale, `messageInbox.${key}`, { count: 18, name: 'Alex' }), `messageInbox.${key}`)
      if (['en', 'ru'].includes(locale)) assert.doesNotMatch(value, /[\u3400-\u9fff]/)
    }
    assert.match(translate(locale, 'messageInbox.countDescription', { count: 18 }), /18/)
  }
  assert.equal(translate('unknown', 'messageInbox.newLikes'), 'New likes')
})

test('message-page badges reuse the existing 99+ cap', () => {
  assert.equal(formatUnreadBadge(0), '')
  assert.equal(formatUnreadBadge(1), '1')
  assert.equal(formatUnreadBadge(99), '99')
  assert.equal(formatUnreadBadge(100), '99+')
  assert.equal(formatUnreadBadge(7923), '99+')
})
