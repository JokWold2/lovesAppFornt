export function appendEmoji(draft, emoji) {
  return `${String(draft || '')}${String(emoji || '')}`
}

export function insertMention(draft, mentions = [], member) {
  const normalizedMember = { userId: Number(member?.userId), name: String(member?.name || '').trim() }
  const nextDraft = String(draft || '').replace(/@[^\s@]*$/, `@${normalizedMember.name} `)
  const nextMentions = [...mentions.filter(item => Number(item.userId) !== normalizedMember.userId), normalizedMember]
  return { draft: nextDraft, mentions: nextMentions }
}

export function makeTextMessagePayload(draft, mentions = [], replyMessage = null) {
  const content = String(draft || '').trim()
  const visibleMentions = mentions.filter(item => content.includes(`@${item.name}`))
  return { content, messageType: 'text', mentions: visibleMentions, replyToMessageId: replyMessage?.id || null }
}

export function attachReplyMessage(payload, replyMessage = null) {
  const replyToMessageId = Number(replyMessage?.id)
  return {
    ...payload,
    replyToMessageId: Number.isInteger(replyToMessageId) && replyToMessageId > 0
      ? replyToMessageId
      : (payload.replyToMessageId || null)
  }
}

export function unwrapComponentEventPayload(value) {
  return value && typeof value === 'object' && value.detail && typeof value.detail === 'object'
    ? value.detail
    : value
}
