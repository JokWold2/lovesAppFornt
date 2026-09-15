export function getSwipeDecision({ x = 0, y = 0, width = 360, elapsed = 500 } = {}) {
  const distance = Math.abs(x)
  if (distance < Math.abs(y) * 1.3) return null
  const threshold = Math.max(64, Math.min(110, width * 0.24))
  const flick = distance >= 40 && distance / Math.max(1, elapsed) >= 0.55
  return distance >= threshold || flick ? (x > 0 ? 'like' : 'pass') : null
}

// Consume at release, never at click: browsers can synthesize a click after a swipe.
export function createPhotoTapGesture() {
  let pending = null
  function move({ x, y }) {
    if (!pending) return
    pending.distance = Math.max(pending.distance, Math.hypot(x - pending.x, y - pending.y))
  }
  return {
    start({ x, y, direction, time }) {
      pending = (direction === -1 || direction === 1) && Number.isFinite(x) && Number.isFinite(y)
        ? { x, y, direction, time, distance: 0 } : null
    },
    move,
    end({ x, y, time }) {
      move({ x, y })
      const tap = pending
      pending = null
      if (!tap || tap.distance > 8 || !Number.isFinite(tap.distance)) return null
      const elapsed = time - tap.time
      return elapsed >= 0 && elapsed <= 350 ? tap.direction : null
    },
    cancel() { pending = null }
  }
}

export function getDeckCandidates(profiles, reviewedIds, currentUserId) {
  const reviewed = new Set(reviewedIds.map(String))
  return profiles.filter(profile => profile.profileId != null
    && !reviewed.has(String(profile.profileId))
    && (currentUserId == null || String(profile.userId) !== String(currentUserId)))
}

export function mergeProfileBatch(previous, incoming) {
  const seen = new Set(previous.map(profile => String(profile.profileId)))
  return previous.concat(incoming.filter(profile => {
    const id = String(profile.profileId)
    if (profile.profileId == null || seen.has(id)) return false
    seen.add(id)
    return true
  }))
}

export function getProfilePhotos(profile, baseURL = '') {
  const photos = Array.isArray(profile?.photos) ? profile.photos : []
  const paths = photos.map(photo => typeof photo === 'string' ? photo : photo?.url).filter(Boolean)
  if (!paths.length && profile?.avatarUrl) paths.push(profile.avatarUrl)
  return [...new Set(paths.filter(path => typeof path === 'string').map(path => {
    if (/^https?:\/\//i.test(path)) return path
    return `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  }))]
}

export function getProfileAge(birthYear, currentYear = new Date().getFullYear()) {
  if (!/^\d{4}$/.test(String(birthYear ?? ''))) return null
  const age = currentYear - Number(birthYear)
  return age >= 0 && age <= 120 ? age : null
}

function applyLikeStatus(profile, result) {
  if (typeof result?.isLiked !== 'boolean') throw new Error('Invalid like status')
  profile.isLiked = result.isLiked
  const count = Number(result.likeCount ?? result.total)
  if (Number.isFinite(count)) profile.likeCount = Math.max(0, count)
  return result
}

// Both views share this lock. A swipe expresses "like", not "toggle".
export function createProfileLikeActions({ read, toggle }) {
  const pending = new Map()
  async function run(profile, operation) {
    const id = String(profile.profileId)
    if (pending.has(id)) return null
    let release
    pending.set(id, new Promise(resolve => { release = resolve }))
    try { return await operation() } finally { pending.delete(id); release() }
  }
  return {
    isBusy: id => pending.has(String(id)),
    toggle: profile => run(profile, async () => applyLikeStatus(profile, await toggle(profile.profileId))),
    ensureLiked: async profile => {
      while (pending.has(String(profile.profileId))) await pending.get(String(profile.profileId))
      return run(profile, async () => {
      const current = applyLikeStatus(profile, await read(profile.profileId))
      if (current.isLiked) return current
      try {
        const saved = applyLikeStatus(profile, await toggle(profile.profileId))
        if (!saved.isLiked) throw new Error('Like was not saved')
        return saved
      } catch (error) {
        // A lost response can follow a successful write. Read before any retry.
        try {
          const reconciled = applyLikeStatus(profile, await read(profile.profileId))
          if (reconciled.isLiked) return reconciled
        } catch (_) { /* Keep the original failure and the current card. */ }
        throw error
      }
      })
    }
  }
}
