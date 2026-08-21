import assert from 'node:assert/strict'
import test from 'node:test'
import { appendReplies, formatCommentTime } from './marketComments.js'

test('appends expanded replies without duplicating existing preview items', () => {
  const floor = { replies: [{ id: 2 }], reply_count: 2 }
  const result = appendReplies(floor, [{ id: 2 }, { id: 3 }])

  assert.deepEqual(result.replies.map(item => item.id), [2, 3])
  assert.equal(result.repliesExpanded, true)
})

test('formats a recent comment as relative minutes', () => {
  const now = new Date('2026-08-21T12:00:00.000Z')
  assert.equal(formatCommentTime('2026-08-21T11:57:00.000Z', now), '3分钟前')
})
