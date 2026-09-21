import { onBeforeUnmount, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
// #ifdef APP-PLUS
import { onBackPress } from '@dcloudio/uni-app'
// #endif

// #ifdef H5
const HISTORY_MARKER = '__lovesProfileSheet'
let nextHistoryId = 0
// #endif

// Call from the host page, so page visibility also follows membership/group
// navigation while the detail sheet remains mounted underneath.
export function useProfileDetailSheet() {
  const profileId = ref(null)
  const pageVisible = ref(true)
  let disposed = false

  // #ifdef H5
  const browser = typeof window === 'undefined' ? null : window
  let historyEntry = null
  let releasingHistory = false
  let queuedProfileId = null
  let listening = false

  function ownsCurrentEntry() {
    return !!historyEntry && browser?.history?.state?.[HISTORY_MARKER] === historyEntry.id
      && browser.location.href === historyEntry.url
  }

  function stopHistoryListener() {
    if (listening) browser.removeEventListener('popstate', onHistoryPop, true)
    listening = false
  }

  function onHistoryPop(event) {
    if (!historyEntry || ownsCurrentEntry()) return
    // Returning from a child route must reach the router before the host's onShow.
    if (!pageVisible.value && !releasingHistory) return
    if (browser.location.href !== historyEntry.url) {
      if (releasingHistory || disposed) {
        historyEntry = null
        releasingHistory = false
        queuedProfileId = null
        stopHistoryListener()
      }
      return
    }
    // This entry has the same URL as the host. Prevent the router from treating
    // its removal as another page navigation (and hiding/recreating the host).
    event.stopImmediatePropagation?.()
    profileId.value = null
    historyEntry = null
    releasingHistory = false
    const nextProfile = queuedProfileId
    queuedProfileId = null
    stopHistoryListener()
    if (!disposed && pageVisible.value && nextProfile != null) open(nextProfile)
  }

  function claimHistoryEntry() {
    if (!browser?.history?.pushState || !pageVisible.value || disposed || ownsCurrentEntry()) return
    // An existing entry can be underneath membership/chat; never push over it.
    if (historyEntry && browser.location.href !== historyEntry.url) return
    const entry = { id: `${Date.now()}-${++nextHistoryId}`, url: browser.location.href }
    const state = browser.history.state
    try {
      browser.history.pushState({ ...(state && typeof state === 'object' ? state : {}), [HISTORY_MARKER]: entry.id }, '', entry.url)
      historyEntry = entry
      if (!listening) browser.addEventListener('popstate', onHistoryPop, true)
      listening = true
    } catch (_) { /* The visible close button remains usable if history is unavailable. */ }
  }

  function releaseHistoryEntry() {
    if (releasingHistory || !ownsCurrentEntry()) return
    releasingHistory = true
    try {
      browser.history.back()
    } catch (_) {
      // Do not leave our marker on the router's current entry after a denied back.
      const state = { ...browser.history.state }
      delete state[HISTORY_MARKER]
      try { browser.history.replaceState(state, '', browser.location.href) } catch (_) {}
      historyEntry = null
      releasingHistory = false
      stopHistoryListener()
    }
  }
  // #endif

  const close = () => {
    profileId.value = null
    // #ifdef H5
    queuedProfileId = null
    if (pageVisible.value) releaseHistoryEntry()
    // #endif
  }
  const open = id => {
    const value = Number(id)
    if (disposed || !Number.isSafeInteger(value) || value <= 0) return
    // #ifdef H5
    if (releasingHistory) { queuedProfileId = value; return }
    // #endif
    profileId.value = value
    // #ifdef H5
    claimHistoryEntry()
    // #endif
  }

  onShow(() => {
    if (disposed) return
    pageVisible.value = true
    // #ifdef H5
    if (profileId.value == null) releaseHistoryEntry()
    else claimHistoryEntry()
    // #endif
  })
  onHide(() => { pageVisible.value = false })
  // #ifdef APP-PLUS
  onBackPress(() => {
    if (disposed || !pageVisible.value || profileId.value == null) return false
    close()
    return true
  })
  // #endif

  const dispose = () => {
    if (disposed) return
    disposed = true
    pageVisible.value = false
    profileId.value = null
    uni.$off('auth-session-changed', close)
    // #ifdef H5
    queuedProfileId = null
    releaseHistoryEntry()
    // A pending owned back still needs one capture listener to keep the router
    // from processing it. onHistoryPop removes that listener after the pop.
    if (!releasingHistory) { historyEntry = null; stopHistoryListener() }
    // #endif
  }
  onUnload(dispose)
  uni.$on('auth-session-changed', close)
  onBeforeUnmount(dispose)
  return { profileId, pageVisible, open, close }
}
