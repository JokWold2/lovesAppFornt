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

function messageArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.messages)) return value.messages
  if (Array.isArray(value?.data?.messages)) return value.data.messages
  return []
}

function mergeMessageByReference(currentMessage, incomingMessage) {
  if (
    !currentMessage
    || typeof currentMessage !== "object"
    || !incomingMessage
    || typeof incomingMessage !== "object"
  ) {
    return incomingMessage
  }

  Object.keys(incomingMessage).forEach((key) => {
    if (!Object.is(currentMessage[key], incomingMessage[key])) {
      currentMessage[key] = incomingMessage[key]
    }
  })

  return currentMessage
}

function sameMessageList(currentMessages, nextMessages) {
  return currentMessages.length === nextMessages.length && currentMessages.every((message, index) =>
    JSON.stringify(message) === JSON.stringify(nextMessages[index])
  )
}

export function mergeChatMessages(currentMessages = [], incomingMessages = []) {
  const currentList = messageArray(currentMessages)
  const messagesById = new Map(currentList.map(message => [Number(message.id), message]))
  messageArray(incomingMessages).forEach((incomingMessage) => {
    const id = Number(incomingMessage?.id)
    if (Number.isNaN(id)) return
    const currentMessage = messagesById.get(id)
    const mergedMessage = mergeMessageByReference(currentMessage, incomingMessage)
    messagesById.set(id, mergedMessage)
  })
  const nextList = [...messagesById.values()].sort((left, right) => Number(left.id) - Number(right.id))
  return sameMessageList(currentList, nextList) ? currentList : nextList
}

export function shouldStickToBottom({ scrollTop = 0, scrollHeight = 0, viewportHeight = 0 }) {
  return Number(scrollTop) + Number(viewportHeight) >= Number(scrollHeight) - 80
}

export function shouldLoadOlderMessagesFromH5Scroll({ scrollTop = 0, hasOlderMessages = false, loadingOlder = false }) {
  return Boolean(hasOlderMessages) && !Boolean(loadingOlder) && Number(scrollTop) <= 60
}

function readFiniteH5ScrollMetrics(source) {
  const scrollTop = Number(source?.scrollTop)
  const scrollHeight = Number(source?.scrollHeight)
  const clientHeight = Number(source?.clientHeight)
  if (
    !Number.isFinite(scrollTop)
    || !Number.isFinite(scrollHeight)
    || !Number.isFinite(clientHeight)
    || scrollTop < 0
    || scrollHeight <= 0
    || clientHeight <= 0
  ) return null
  return { scrollTop, scrollHeight, clientHeight }
}

export function readH5MessageScrollMetrics({ element, event } = {}) {
  return readFiniteH5ScrollMetrics(element)
    || readFiniteH5ScrollMetrics(event?.detail)
    || readFiniteH5ScrollMetrics(event?.target)
    || readFiniteH5ScrollMetrics(event?.currentTarget)
}

export function shouldAutoScrollOnChatLoad({ forceScroll = false, atBottom = false, userScrolled = false }) {
  return !Boolean(userScrolled) && (Boolean(forceScroll) || Boolean(atBottom))
}

export function shouldShowChatLatestButton({ atBottom = true }) {
  return !Boolean(atBottom)
}

export function shouldStickToBottomAfterChatLoad({
  forceScroll = false,
  requestStartedAtBottom = false,
  atBottom = false,
  userScrolled = false,
}) {
  return !Boolean(userScrolled) && (Boolean(forceScroll) || (Boolean(requestStartedAtBottom) && Boolean(atBottom)))
}
