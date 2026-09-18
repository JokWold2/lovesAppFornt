// Tab pages are cached. A profile-likes entry should always open received likes,
// even when the user previously left the Likes tab on its outgoing list.
let incomingRequested = false

export function openIncomingLikes(runtime = uni) {
  incomingRequested = true
  try {
    runtime.switchTab({
      url: '/pages/likes/likes',
      fail: () => { incomingRequested = false }
    })
  } catch (error) {
    incomingRequested = false
    throw error
  }
}

export function consumeIncomingLikesIntent() {
  const requested = incomingRequested
  incomingRequested = false
  return requested
}
