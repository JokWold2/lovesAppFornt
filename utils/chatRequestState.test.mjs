import assert from 'node:assert/strict'
import test from 'node:test'
import { getChatRequestButtonState } from './chatRequestState.js'

test('maps a pending request to a disabled review button', () => {
  assert.deepEqual(getChatRequestButtonState('pending'), { text: '申请审核中', disabled: true, tone: 'muted' })
})

test('maps an approved request to a disabled warm green button', () => {
  assert.deepEqual(getChatRequestButtonState('approved'), { text: '申请已通过', disabled: true, tone: 'approved' })
})

test('allows a rejected request to be submitted again', () => {
  assert.deepEqual(getChatRequestButtonState('rejected'), { text: '申请私聊', disabled: false, tone: 'default' })
})
