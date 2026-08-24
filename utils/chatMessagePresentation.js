function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function buildTimeDivider(current, previous) {
  const currentDate = toDate(current?.created_at)
  if (!currentDate) return null
  const previousDate = toDate(previous?.created_at)
  if (previousDate && isSameDay(currentDate, previousDate) && currentDate - previousDate <= 5 * 60 * 1000) return null

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = `${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}`
  if (isSameDay(currentDate, now)) return `今天 ${time}`
  if (isSameDay(currentDate, yesterday)) return `昨天 ${time}`
  return `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())} ${time}`
}

export function formatConversationTime(value, now = new Date()) {
  const date = toDate(value)
  if (!date) return ''
  const today = toDate(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (isSameDay(date, yesterday)) return '昨天'
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function getReceiptIcon(status) {
  return ({ sending: 'clock', delivered: 'single', read: 'double-blue' })[status] || 'single'
}

export function tokenizeMentions(content, mentions = []) {
  const text = String(content || '')
  const normalized = (Array.isArray(mentions) ? mentions : [])
    .map(item => ({ userId: Number(item?.userId), name: String(item?.name || '').trim() }))
    .filter(item => Number.isInteger(item.userId) && item.userId > 0 && item.name)
    .sort((left, right) => right.name.length - left.name.length)
  if (!text || !normalized.length) return [{ text, mentioned: false, userId: null }]

  const tokens = []
  let cursor = 0
  while (cursor < text.length) {
    const match = normalized.find(item => text.startsWith(`@${item.name}`, cursor))
    if (match) {
      tokens.push({ text: `@${match.name}`, mentioned: true, userId: match.userId })
      cursor += match.name.length + 1
      continue
    }
    const start = cursor
    cursor += 1
    while (cursor < text.length && !normalized.some(item => text.startsWith(`@${item.name}`, cursor))) cursor += 1
    tokens.push({ text: text.slice(start, cursor), mentioned: false, userId: null })
  }
  return tokens
}

export function formatReplyPreview(message) {
  if (!message) return { author: '', text: '原消息已删除', imageUrl: '' }
  const isImage = message.message_type === 'image'
  return {
    author: message.sender_name || '成员',
    text: isImage ? '[图片]' : (message.content || '[消息]'),
    imageUrl: isImage ? (message.media_url || '') : ''
  }
}
