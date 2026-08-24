export function presentGroupName(value, fallback = '群聊') {
  let decoded = String(value || '')
  for (let pass = 0; pass < 8; pass += 1) {
    const next = decoded.replace(/&amp;/gi, '&').replace(/&gt;/gi, '>')
    if (next === decoded) break
    decoded = next
  }
  const name = decoded
    .replace(/^[\s>]+/, '')
    .trim()
  return name || fallback
}
