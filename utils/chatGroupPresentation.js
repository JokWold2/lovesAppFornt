export function presentGroupName(value, fallback = '群聊') {
  const name = String(value || '')
    .replace(/^(?:\s|&(?:amp;)?gt;|>)+/i, '')
    .trim()
  return name || fallback
}
