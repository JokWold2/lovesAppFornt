import { membershipMessages } from './membershipMessages.js'

export const BLESSING_CHANGED_EVENT = 'blessing:changed'
let requestSequence = 0
const defaultT = (key, params = {}) => (membershipMessages['zh-Hans'][key.replace(/^membership\./, '')] || key).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')

export function createMembershipRequestId() {
  requestSequence = (requestSequence + 1) % 1000000
  return `${Date.now().toString(36)}-${requestSequence.toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function formatMembershipPrice(cents, t = defaultT) {
  if (!Number.isSafeInteger(cents) || cents < 0) return '—'
  return cents === 0 ? t('membership.free') : `$${(cents / 100).toFixed(2)}`
}

export function formatMembershipQuota(limit, unit = 'times', t = defaultT) {
  if (limit === null) return t('membership.unlimited')
  if (!Number.isSafeInteger(limit) || limit < 0) return '—'
  const key = ['people', '人'].includes(unit) ? 'peoplePerDay' : ['comments', '条'].includes(unit) ? 'commentsPerDay' : 'timesPerDay'
  return t(`membership.${key}`, { count: limit })
}

export function getMembershipTierName(level, t = defaultT) {
  const tier = Math.min(4, Math.max(1, Number(level) || 1))
  return t(`membership.tier${tier}`)
}

export function getMembershipDisplayPlan(plan, accountLevel) {
  if (Number(accountLevel) >= 5 && plan?.level === 4) return { ...plan, likeLimit: null, commentLimit: null, rewindLimit: null }
  return plan
}

export function mergeBlessingLikes(current, incoming) {
  const merged = [], positions = new Map()
  for (const item of [...current, ...incoming]) {
    const key = item.rowKey ? `locked:${item.rowKey}` : item.profileId != null ? `profile:${item.profileId}` : null
    if (key !== null && positions.has(key)) merged[positions.get(key)] = item
    else { if (key !== null) positions.set(key, merged.length); merged.push(item) }
  }
  return merged
}

export function getMembershipErrorMessage(error, t = defaultT, fallbackKey = 'unavailable') {
  const messages = {
    BLESSING_QUOTA_EXCEEDED: 'quotaExceeded', MEMBERSHIP_REQUIRED: 'membershipRequired',
    LIKE_REQUIRED: 'likeRequired', MUTUAL_LIKE_REQUIRED: 'mutualRequired',
    MEMBERSHIP_REQUEST_PENDING: 'noDuplicate', REQUEST_ALREADY_REVIEWED: 'requestConflict',
    REQUEST_CONFLICT: 'requestConflict', NO_REWIND_AVAILABLE: 'noRewind', REWIND_STALE: 'requestConflict'
  }
  return t(`membership.${messages[error?.code] || fallbackKey}`)
}

export function getUpgradeQuote(plans, accountLevel, targetLevel) {
  const current = Number(accountLevel), target = Number(targetLevel)
  if (!Array.isArray(plans) || current < 1 || current >= 4 || target <= current || target > 4) return null
  const from = plans.find(plan => Number(plan.level) === current)
  const to = plans.find(plan => Number(plan.level) === target)
  if (!Number.isSafeInteger(from?.priceCents) || !Number.isSafeInteger(to?.priceCents) || from.priceCents < 0 || to.priceCents < from.priceCents) return null
  return to.priceCents - from.priceCents
}

export function getMembershipChatPrompt({ isLiked = false, mutual = false } = {}, t = defaultT) {
  if (!isLiked) return {
    type: 'like', title: t('membership.likeRequiredTitle'),
    message: t('membership.likeRequired'),
    confirmText: t('membership.goLike')
  }
  if (!mutual) return {
    type: 'wait', title: t('membership.mutualRequiredTitle'),
    message: t('membership.mutualRequired'),
    confirmText: t('membership.gotIt')
  }
  return { type: 'request' }
}

export function openMembershipUpgrade(action = '') {
  if (typeof uni === 'undefined') return
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages[pages.length - 1]?.route === 'pages/membership/upgrade') return
  const reason = ['like', 'comment', 'rewind', 'likes', 'search'].includes(action) ? action : ''
  uni.navigateTo({ url: `/pages/membership/upgrade${reason ? `?reason=${reason}` : ''}` })
}

export function handleMembershipError(error) {
  if (error?.code === 'BLESSING_QUOTA_EXCEEDED') {
    openMembershipUpgrade(error.action)
    return true
  }
  if (error?.code === 'MEMBERSHIP_REQUIRED') {
    openMembershipUpgrade(error.action || 'search')
    return true
  }
  return false
}

export function notifyBlessingChanged(payload = {}) {
  if (typeof uni !== 'undefined') uni.$emit?.(BLESSING_CHANGED_EVENT, payload)
}
