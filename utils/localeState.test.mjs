import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocaleState } from './localeState.js'

test('manual selection persists and bootstrap cannot override it', async () => {
  const values = new Map()
  const state = createLocaleState({ get: key => values.get(key), set: (key, value) => values.set(key, value), bootstrap: async () => ({ localeMode: 'auto', suggestedLocale: 'ja' }), save: async () => {} })
  await state.setManualLocale('ko')
  await state.bootstrap('ja-JP')
  assert.equal(state.locale.value, 'ko')
  assert.equal(state.mode.value, 'manual')
})
