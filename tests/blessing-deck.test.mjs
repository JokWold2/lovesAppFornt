import assert from 'node:assert/strict'
import test from 'node:test'

// Dynamic import makes the first red run report missing behaviour, not a loader error.
const deck = await import('../utils/blessingDeck.js').catch(() => ({}))

test('horizontal swipes choose like/pass while short and vertical gestures cancel', () => {
  assert.equal(typeof deck.getSwipeDecision, 'function')
  const swipe = (x, y, elapsed = 500) => deck.getSwipeDecision({ x, y, width: 360, elapsed })
  assert.equal(swipe(110, 12), 'like')
  assert.equal(swipe(-110, 12), 'pass')
  assert.equal(swipe(20, 0), null)
  assert.equal(swipe(100, 130), null)
  assert.equal(swipe(48, 2, 60), 'like')
  assert.equal(swipe(-48, 2, 60), 'pass')
})

test('a short card tap selects the touched photo half and is consumed only once', () => {
  assert.equal(typeof deck.createPhotoTapGesture, 'function')
  const tap = deck.createPhotoTapGesture()
  tap.start({ x: 30, y: 200, direction: -1, time: 100 })
  assert.equal(tap.end({ x: 32, y: 201, time: 220 }), -1)
  assert.equal(tap.end({ x: 32, y: 201, time: 225 }), null)
  tap.start({ x: 280, y: 200, direction: 1, time: 300 })
  assert.equal(tap.end({ x: 280, y: 200, time: 430 }), 1)
})

test('short drags, return drags and long presses never turn a photo', () => {
  assert.equal(typeof deck.createPhotoTapGesture, 'function')
  const tap = deck.createPhotoTapGesture()
  tap.start({ x: 280, y: 200, direction: 1, time: 100 })
  assert.equal(tap.end({ x: 300, y: 200, time: 220 }), null)
  tap.start({ x: 280, y: 200, direction: 1, time: 300 })
  tap.move({ x: 280, y: 218 })
  assert.equal(tap.end({ x: 280, y: 200, time: 420 }), null)
  tap.start({ x: 280, y: 200, direction: 1, time: 500 })
  assert.equal(tap.end({ x: 280, y: 200, time: 1400 }), null)
})

test('cancelled and non-photo gestures cannot advance a photo on release', () => {
  assert.equal(typeof deck.createPhotoTapGesture, 'function')
  const tap = deck.createPhotoTapGesture()
  tap.start({ x: 280, y: 200, direction: 1, time: 100 })
  tap.cancel()
  assert.equal(tap.end({ x: 280, y: 200, time: 220 }), null)
  tap.start({ x: 280, y: 200, time: 300 })
  assert.equal(tap.end({ x: 280, y: 200, time: 420 }), null)
})

test('cards omit myself and reviewed profiles without changing the original list', () => {
  assert.equal(typeof deck.getDeckCandidates, 'function')
  const profiles = [{ profileId: 1, userId: 7 }, { profileId: 2, userId: 8 }, { profileId: 3, userId: 9 }]
  assert.deepEqual(deck.getDeckCandidates(profiles, ['2'], '7'), [profiles[2]])
  assert.equal(profiles.length, 3)
  assert.deepEqual(deck.getDeckCandidates(profiles, [], null), profiles)
})

test('pagination retains consumed IDs and deduplicates repeated server results', () => {
  assert.equal(typeof deck.mergeProfileBatch, 'function')
  const previous = [{ profileId: 1, isLiked: true }]
  const result = deck.mergeProfileBatch(previous, [{ profileId: '1', isLiked: false }, { profileId: 2 }, { profileId: 2 }])
  assert.equal(result[0], previous[0])
  assert.deepEqual(result.map(item => Number(item.profileId)), [1, 2])
})

test('photos accept strings and url objects, deduplicate and fall back to an avatar', () => {
  assert.equal(typeof deck.getProfilePhotos, 'function')
  assert.deepEqual(deck.getProfilePhotos({ photos: ['/a.jpg', { url: '/b.jpg' }, null, '/a.jpg'] }, 'http://localhost:3000'), ['http://localhost:3000/a.jpg', 'http://localhost:3000/b.jpg'])
  assert.deepEqual(deck.getProfilePhotos({ photos: [], avatarUrl: 'https://example.com/avatar.jpg' }, ''), ['https://example.com/avatar.jpg'])
  assert.deepEqual(deck.getProfilePhotos({}, ''), [])
})

test('birth-year age does not show NaN, invalid or future values', () => {
  assert.equal(typeof deck.getProfileAge, 'function')
  assert.equal(deck.getProfileAge('1998', 2026), 28)
  for (const value of [null, '', 'unknown', 2030, 1800]) assert.equal(deck.getProfileAge(value, 2026), null)
})

test('right swipe reads current status and never unlikes an already liked profile', async () => {
  assert.equal(typeof deck.createProfileLikeActions, 'function')
  let writes = 0
  const actions = deck.createProfileLikeActions({ read: async () => ({ isLiked: true, total: 8 }), toggle: async () => { writes++ } })
  const profile = { profileId: 4, isLiked: false }
  await actions.ensureLiked(profile)
  assert.equal(writes, 0)
  assert.equal(profile.isLiked, true)
  assert.equal(profile.likeCount, 8)
})

test('right swipe saves one like and shares a lock with the list button', async () => {
  assert.equal(typeof deck.createProfileLikeActions, 'function')
  let resolveWrite
  let writes = 0
  const actions = deck.createProfileLikeActions({ read: async () => ({ isLiked: false, total: 0 }), toggle: () => { writes++; return new Promise(resolve => { resolveWrite = resolve }) } })
  const profile = { profileId: 4 }
  const pending = actions.ensureLiked(profile)
  await Promise.resolve()
  assert.equal(actions.isBusy(4), true)
  assert.equal(await actions.toggle(profile), null)
  resolveWrite({ isLiked: true, likeCount: 1 })
  await pending
  assert.equal(writes, 1)
  assert.equal(profile.isLiked, true)
  assert.equal(actions.isBusy(4), false)
})

test('ambiguous network failure reconciles status without repeating a toggle', async () => {
  assert.equal(typeof deck.createProfileLikeActions, 'function')
  let reads = 0
  let writes = 0
  const actions = deck.createProfileLikeActions({ read: async () => ({ isLiked: ++reads > 1, total: 1 }), toggle: async () => { writes++; throw new Error('response lost') } })
  const profile = { profileId: 5 }
  await actions.ensureLiked(profile)
  assert.equal(writes, 1)
  assert.equal(reads, 2)
  assert.equal(profile.isLiked, true)
})

test('right swipe waits for an earlier unlike from another view before checking status', async () => {
  let liked = true
  let finishUnlike
  let writes = 0
  const actions = deck.createProfileLikeActions({
    read: async () => ({ isLiked: liked, total: Number(liked) }),
    toggle: async () => {
      writes++
      if (writes === 1) await new Promise(resolve => { finishUnlike = resolve })
      liked = !liked
      return { isLiked: liked, likeCount: Number(liked) }
    }
  })
  const previous = actions.toggle({ profileId: 7 })
  const card = { profileId: 7 }
  const swipe = actions.ensureLiked(card)
  finishUnlike()
  await previous
  const result = await swipe
  assert.equal(result?.isLiked, true)
  assert.equal(liked, true)
  assert.equal(writes, 2)
})

test('failed like remains a failure and releases the lock for deliberate retry', async () => {
  assert.equal(typeof deck.createProfileLikeActions, 'function')
  const actions = deck.createProfileLikeActions({ read: async () => ({ isLiked: false, total: 0 }), toggle: async () => { throw new Error('offline') } })
  const profile = { profileId: 6 }
  await assert.rejects(actions.ensureLiked(profile), /offline/)
  assert.equal(profile.isLiked, false)
  assert.equal(actions.isBusy(6), false)
})
