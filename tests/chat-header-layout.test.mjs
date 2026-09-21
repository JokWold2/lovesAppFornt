import test from 'node:test'
import assert from 'node:assert/strict'
import { getChatHeaderGeometry, readChatHeaderGeometry } from '../utils/chatHeaderLayout.js'

const phone = { windowWidth: 390, statusBarHeight: 44, uniPlatform: 'mp-weixin' }
const capsule = { left: 293, right: 380, top: 48, bottom: 80, width: 87, height: 32 }

test('compact chat navigation shares the capsule row and keeps an ordinary title screen-centered', () => {
  const layout = getChatHeaderGeometry(phone, capsule)
  assert.ok(layout.contentTop >= 44 && layout.contentTop < capsule.bottom)
  assert.equal(layout.titleLeft + layout.titleWidth / 2, 195)
  assert.ok(layout.titleLeft >= layout.backLeft + 44)
  assert.ok(layout.titleLeft + layout.titleWidth <= capsule.left - 8)
})

test('ordinary action and title stay clear of the capsule on both standard and narrow phones', () => {
  for (const width of [320, 375, 390, 430]) {
    const rect = { ...capsule, left: width - 97, right: width - 10 }
    const layout = getChatHeaderGeometry({ ...phone, windowWidth: width }, rect, { hasAction: true })
    const actionLeft = width - layout.actionRight - 44
    assert.ok(layout.titleLeft >= layout.backLeft + 44)
    assert.ok(layout.titleLeft + layout.titleWidth <= actionLeft)
    assert.ok(actionLeft + 44 <= rect.left - 8)
    assert.ok(layout.titleWidth >= 76)
    if (width >= 375) assert.equal(layout.titleLeft + layout.titleWidth / 2, width / 2)
  }
})

test('avatar header aligns edge controls to the centered avatar below the capsule', () => {
  const layout = getChatHeaderGeometry(phone, capsule, { avatarHeader: true, hasAction: true })
  assert.equal(layout.avatarCenterX, 195)
  assert.equal(layout.controlTop + 22, layout.contentTop + 27)
  assert.equal(layout.contentLeft, layout.contentRight)
  assert.ok(390 - layout.actionRight - 44 >= layout.avatarCenterX + 27 + 8)
  assert.equal(layout.actionRight, layout.backLeft)
  assert.equal(layout.contentTop, capsule.bottom + 4)
})

test('narrow avatar rows use the same compact capsule clearance and symmetric controls', () => {
  const rect = { ...capsule, left: 223, right: 310 }
  const layout = getChatHeaderGeometry({ ...phone, windowWidth: 320 }, rect, { avatarHeader: true, hasAction: true })
  assert.equal(layout.avatarCenterX, 160)
  assert.equal(layout.contentTop, rect.bottom + 4)
  assert.equal(layout.controlTop + 22, layout.contentTop + 27)
  assert.ok(320 - layout.actionRight - 44 > layout.avatarCenterX + 27)
  assert.equal(layout.backLeft, layout.actionRight)
})

for (const width of [390, 414]) {
  test(`${width}px WeChat avatar layout keeps generous equal gaps beside the avatar`, () => {
    const rect = { ...capsule, left: width - 97, right: width - 10 }
    const layout = getChatHeaderGeometry({ ...phone, windowWidth: width }, rect, { avatarHeader: true, hasAction: true })
    const leftGap = layout.avatarCenterX - 27 - layout.backLeft - 44
    const rightGap = width - layout.actionRight - 44 - layout.avatarCenterX - 27
    assert.equal(layout.contentTop, 84)
    assert.equal(layout.controlTop, 89)
    assert.equal(layout.rowHeight, 54)
    assert.equal(leftGap, rightGap)
    assert.ok(rightGap >= 100)
  })
}

test('avatar position does not jump when the trailing action becomes available', () => {
  const hidden = getChatHeaderGeometry(phone, capsule, { avatarHeader: true, hasAction: false })
  const shown = getChatHeaderGeometry(phone, capsule, { avatarHeader: true, hasAction: true })
  assert.equal(hidden.contentTop, 84)
  assert.equal(shown.contentTop, hidden.contentTop)
  assert.equal(shown.actionRight, hidden.actionRight)
  assert.equal(shown.controlTop, hidden.controlTop)
})

test('missing WeChat capsule uses its fallback bottom plus four pixels for avatar rows only', () => {
  const avatar = getChatHeaderGeometry(phone, null, { avatarHeader: true, hasAction: true })
  const ordinary = getChatHeaderGeometry(phone, null)
  assert.equal(avatar.contentTop, phone.statusBarHeight + 38 + 4)
  assert.equal(avatar.actionRight, 20)
  assert.ok(ordinary.contentTop < phone.statusBarHeight + 38)
})

test('H5 and App use their real status bar and horizontal safe area without a synthetic capsule row', () => {
  const web = getChatHeaderGeometry({ windowWidth: 390, statusBarHeight: 0, uniPlatform: 'web' })
  const app = getChatHeaderGeometry({ windowWidth: 390, statusBarHeight: 24, safeAreaInsets: { top: 30 }, uniPlatform: 'app' })
  assert.equal(web.hasCapsule, false)
  assert.equal(web.contentTop, 8)
  assert.equal(app.contentTop, 38)
  const landscape = getChatHeaderGeometry({ windowWidth: 844, statusBarHeight: 0, safeAreaInsets: { left: 44, right: 0 } }, null, { avatarHeader: true, hasAction: true })
  assert.equal(landscape.avatarCenterX, 422)
  assert.equal(landscape.contentLeft, landscape.contentRight)
  assert.ok(landscape.backLeft >= 44)
})

test('WeChat empty or malformed capsule metrics get a conservative compact fallback', () => {
  for (const rect of [null, {}, { ...capsule, left: -100 }, { ...capsule, top: 200, bottom: 232 }]) {
    const layout = getChatHeaderGeometry(phone, rect)
    assert.equal(layout.hasCapsule, true)
    assert.ok(layout.contentTop < 70)
    assert.ok(layout.titleLeft + layout.titleWidth <= 285)
    assert.ok(Number.isFinite(layout.titleWidth))
  }
})

test('SDK reader recovers platform metadata and refreshes geometry from current metrics', () => {
  let width = 390
  const api = {
    getWindowInfo: () => ({ windowWidth: width, statusBarHeight: 44 }),
    getSystemInfoSync: () => ({ uniPlatform: 'mp-weixin' }),
    getMenuButtonBoundingClientRect: () => ({})
  }
  assert.equal(readChatHeaderGeometry(api).hasCapsule, true)
  width = 430
  assert.equal(readChatHeaderGeometry(api).width, 430)
  assert.equal(readChatHeaderGeometry({ getWindowInfo() { throw Error('not ready') }, getSystemInfoSync: () => ({ windowWidth: 375, statusBarHeight: 20 }) }).contentTop, 28)
})

test('explicit WeChat build hint clears native chrome even when startup metrics are empty', () => {
  const layout = readChatHeaderGeometry({
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 0 }),
    getSystemInfoSync: () => ({ windowWidth: 390 }),
    getMenuButtonBoundingClientRect: () => ({})
  }, { clearCapsule: true }, 'mp-weixin')
  assert.equal(layout.hasCapsule, true)
  assert.equal(layout.contentTop, 86)
})
