export function filterBlessingCandidates(items, excludedIds = [], currentUserId, activeProfileId) {
  const excluded = new Set(excludedIds.map(String))
  return items.filter(item => {
    if (currentUserId != null && String(item.userId ?? item.user_id) === String(currentUserId)) return false
    // Keep the active card mounted until its exit animation emits dismissal.
    if (activeProfileId != null && String(item.profileId) === String(activeProfileId)) return true
    return !item.isLiked && !excluded.has(String(item.profileId))
  })
}

export function filterFeaturedBlessings(items, excludedIds = []) {
  const excluded = new Set(excludedIds.map(String))
  return items.filter(item => item.type !== 'blessing' || (!item.isLiked && !excluded.has(String(item.id))))
}

export function reconcileBlessingExclusions(excludedIds, serverItems, changedDuringRequest = []) {
  const eligible = new Set(serverItems.filter(item => !item.isLiked).map(item => String(item.profileId)))
  const changed = new Set(changedDuringRequest.map(String))
  return excludedIds.filter(id => !eligible.has(String(id)) || changed.has(String(id)))
}

// Retain operation IDs after an ambiguous network failure so a deliberate retry
// can recover the committed response without charging or stacking it twice.
export function createBlessingOperations({ decide, rewind, refreshMembership, createRequestId }) {
  const requests = new Map()
  const pending = new Map()
  async function run(key, work) {
    if (pending.has(key)) return pending.get(key)
    const requestId = requests.get(key) || createRequestId()
    requests.set(key, requestId)
    const promise = Promise.resolve().then(() => work(requestId)).then(result => {
      requests.delete(key)
      return result
    }).catch(error => {
      // A definitive business rejection did not commit. A later user action can
      // use current policy after upgrade; transport failures keep their ID.
      if (error?.code) requests.delete(key)
      throw error
    }).finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
  }
  return {
    decide(profile, decision, source = 'card') {
      return run(`decision:${source}:${profile.profileId}:${decision}`, requestId => decide(profile.profileId, decision, source, requestId))
    },
    async rewind(actionId) {
      const result = await run(`rewind:${actionId}`, requestId => rewind(actionId, requestId))
      let membership = null
      try { membership = await refreshMembership() } catch (_) { /* The write already succeeded. */ }
      return { result, membership }
    }
  }
}
