import { buildTimeDivider } from './chatMessagePresentation.js'

export function buildChatDisplayItems(messages = []) {
  return messages.flatMap((message, index) => {
    const divider = buildTimeDivider(message, messages[index - 1])
    const items = []
    if (divider) items.push({ key: `time-${message.id}`, kind: 'time', label: divider })
    items.push({ key: `message-${message.id}`, kind: 'message', message })
    return items
  })
}

export function mergeChatMessages(currentMessages = [], incomingMessages = []) {
  const messagesById = new Map(currentMessages.map(message => [Number(message.id), message]))
  incomingMessages.forEach(message => messagesById.set(Number(message.id), message))
  return [...messagesById.values()].sort((left, right) => Number(left.id) - Number(right.id))
}

export function shouldStickToBottom({ scrollTop = 0, scrollHeight = 0, viewportHeight = 0 }) {
  return Number(scrollTop) + Number(viewportHeight) >= Number(scrollHeight) - 80
}
