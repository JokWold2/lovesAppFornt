// Locked rows must never fall back to an original, identifiable image.
export function messageLikePhoto(item, locked = false, available = value => typeof value === 'string' ? value.trim() : '') {
  if (locked || item?.locked) return available(item?.previewUrl)
  return available(item?.avatarUrl) || available(item?.photoUrl)
}
