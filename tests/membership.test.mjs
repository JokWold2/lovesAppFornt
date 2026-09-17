import test from 'node:test'
import assert from 'node:assert/strict'

const membership = await import('../utils/membership.js').catch(() => ({}))

test('upgrade quotes charge the configured difference and never sell a downgrade', () => {
  const plans = [{ level: 1, priceCents: 0 }, { level: 2, priceCents: 2000 }, { level: 3, priceCents: 5000 }, { level: 4, priceCents: 10000 }]
  assert.equal(membership.getUpgradeQuote(plans, 2, 3), 3000)
  assert.equal(membership.getUpgradeQuote(plans, 2, 4), 8000)
  assert.equal(membership.getUpgradeQuote(plans, 3, 4), 5000)
  assert.equal(membership.getUpgradeQuote(plans, 3, 2), null)
  assert.equal(membership.getUpgradeQuote(plans, 6, 4), null)
  assert.equal(membership.getUpgradeQuote(plans, 1, 9), null)
})

test('missing plan prices cannot silently produce a free upgrade', () => {
  assert.equal(membership.getUpgradeQuote([{ level: 1, priceCents: 0 }, { level: 2 }], 1, 2), null)
  assert.equal(membership.getUpgradeQuote([{ level: 2, priceCents: 2000 }], 1, 2), null)
})

test('admin current benefits remain unlimited when the purchasable Gold plan has configured limits', () => {
  const gold = { level: 4, likeLimit: 20, commentLimit: 30, rewindLimit: 40 }
  assert.deepEqual(membership.getMembershipDisplayPlan(gold, 6), { ...gold, likeLimit: null, commentLimit: null, rewindLimit: null })
  assert.deepEqual(membership.getMembershipDisplayPlan(gold, 5), { ...gold, likeLimit: null, commentLimit: null, rewindLimit: null })
  assert.equal(membership.getMembershipDisplayPlan(gold, 4), gold)
  assert.equal(gold.likeLimit, 20, 'display must not alter the configured plan')
})

test('likes pagination merges shifted page boundaries and refreshes relationship state', () => {
  const result = membership.mergeBlessingLikes([{ profileId: 1 }, { profileId: 2, mutual: false }], [{ profileId: 2, mutual: true }, { profileId: 3 }])
  assert.deepEqual(result, [{ profileId: 1 }, { profileId: 2, mutual: true }, { profileId: 3 }])
  assert.deepEqual(membership.mergeBlessingLikes([{ rowKey: 'blur-a', locked: true }], [{ rowKey: 'blur-a', locked: true }, { rowKey: 'blur-b', locked: true }]).map(item => item.rowKey), ['blur-a', 'blur-b'])
})

test('chat guidance requires my like before revealing or using mutual status', () => {
  assert.equal(membership.getMembershipChatPrompt({ isLiked: false, mutual: true }).type, 'like')
  assert.equal(membership.getMembershipChatPrompt({ isLiked: true, mutual: false }).type, 'wait')
  assert.equal(membership.getMembershipChatPrompt({ isLiked: true, mutual: true }).type, 'request')
})

test('prices preserve cents and quota text distinguishes unlimited from unavailable', () => {
  assert.equal(membership.formatMembershipPrice(2050), '$20.50')
  assert.equal(membership.formatMembershipPrice(0), '免费')
  assert.equal(membership.formatMembershipPrice(undefined), '—')
  assert.equal(membership.formatMembershipQuota(null, '人'), '无限')
  assert.equal(membership.formatMembershipQuota(0, '人'), '0人/天')
  assert.equal(membership.formatMembershipQuota(undefined, '人'), '—')
})
