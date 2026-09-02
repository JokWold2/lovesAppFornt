export function normalizeFacebookPhotos(photos) {
  if (!Array.isArray(photos)) return []
  const seen = new Set()
  return photos.reduce((result, photo) => {
    const id = typeof photo?.id === 'string' ? photo.id.trim() : ''
    const picture = typeof photo?.picture === 'string' ? photo.picture.trim() : ''
    if (!id || !picture || seen.has(id)) return result
    seen.add(id)
    result.push({ id, picture })
    return result
  }, [])
}

export function toggleFacebookPhotoSelection(selectedIds, photoId, maxCount) {
  const selected = Array.isArray(selectedIds) ? selectedIds : []
  if (selected.includes(photoId)) return selected.filter(id => id !== photoId)
  if (selected.length >= Math.max(0, Number(maxCount) || 0)) return selected
  return [...selected, photoId]
}
