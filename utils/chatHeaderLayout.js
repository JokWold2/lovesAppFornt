const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0

export function getChatHeaderGlassProgress(scrollTop, fadeDistance = 36) {
  const distance = Math.max(1, number(fadeDistance) || 36)
  return Math.min(1, number(scrollTop) / distance)
}

// Native chrome owns the capsule row. Every custom navigation row starts just
// below it; avatar headers keep the same geometry as ordinary title headers.
export function getChatHeaderGeometry(windowInfo = {}, capsule = null, { avatarHeader = false, avatarSize = 54, hasAction = false, clearCapsule = false } = {}) {
  const width = number(windowInfo.windowWidth) || number(windowInfo.screenWidth) || 375
  const statusTop = Math.max(number(windowInfo.statusBarHeight), number(windowInfo.safeAreaInsets?.top), number(windowInfo.safeArea?.top))
  const fallbackStatusTop = windowInfo.uniPlatform === 'mp-weixin' && clearCapsule && statusTop === 0 ? 44 : statusTop
  const safeLeft = Math.max(number(windowInfo.safeAreaInsets?.left), number(windowInfo.safeArea?.left))
  const safeRight = Math.max(number(windowInfo.safeAreaInsets?.right), windowInfo.safeArea?.right > 0 ? Math.max(0, width - Number(windowInfo.safeArea.right)) : 0)
  const gutter = width <= 350 ? 16 : 20
  const backLeft = safeLeft + gutter
  const edgeRight = safeRight + gutter
  const controlSize = 44, gap = 8
  const size = Math.max(controlSize, number(avatarSize) || 54)
  const top = number(capsule?.top), bottom = number(capsule?.bottom)
  const left = number(capsule?.left), right = number(capsule?.right)
  const validCapsule = Number(capsule?.left) >= 0 && left > width / 2 && right <= width && right > left &&
    number(capsule?.width) > 0 && number(capsule?.height) > 0 && top >= statusTop && bottom > top && bottom <= statusTop + 100
  const rect = validCapsule ? { top, bottom, left, right } : windowInfo.uniPlatform === 'mp-weixin'
    ? { top: fallbackStatusTop + 6, bottom: fallbackStatusTop + 38, left: width - safeRight - 97, right: width - safeRight - 10 }
    : null
  const hasCapsule = !!rect
  const contentEnd = rect && !avatarHeader ? rect.left - gap : width - edgeRight
  const contentTop = rect
    ? avatarHeader || clearCapsule ? rect.bottom + 4 : Math.max(statusTop, (rect.top + rect.bottom - controlSize) / 2)
    : statusTop + (avatarHeader ? 12 : 8)
  const actionRight = width - contentEnd
  const avatarCenterX = width / 2
  const start = backLeft + controlSize + gap
  const end = contentEnd - (hasAction ? controlSize : 0)
  const centeredWidth = 2 * Math.max(0, Math.min(avatarCenterX - start, end - avatarCenterX))
  // Preserve screen centering whenever the title has room for a useful label.
  // On narrow screens with a real trailing action, use the remaining interval.
  const titleWidth = centeredWidth >= 76 ? centeredWidth : Math.max(0, end - start)
  const titleLeft = centeredWidth >= 76 ? avatarCenterX - titleWidth / 2 : start
  const symmetricGutter = Math.max(backLeft, edgeRight)
  return {
    width, hasCapsule, contentTop,
    contentLeft: avatarHeader ? symmetricGutter : backLeft,
    contentRight: avatarHeader ? symmetricGutter : width - contentEnd,
    backLeft, actionRight, titleLeft, titleWidth,
    backRailWidth: titleLeft - backLeft,
    actionRailWidth: Math.max(0, contentEnd - titleLeft - titleWidth),
    controlTop: contentTop + (avatarHeader ? (size - controlSize) / 2 : 0),
    avatarCenterX, rowHeight: avatarHeader ? size : controlSize
  }
}

export function readChatHeaderGeometry(api, options, platformOverride = '') {
  let info = {}, capsule = null
  try { info = api?.getWindowInfo?.() || api?.getSystemInfoSync?.() || {} } catch (_) {
    try { info = api?.getSystemInfoSync?.() || {} } catch (_) {}
  }
  if (!info.uniPlatform) {
    try { info = { ...api?.getSystemInfoSync?.(), ...info } } catch (_) {}
  }
  if (platformOverride) info = { ...info, uniPlatform: platformOverride }
  try { capsule = api?.getMenuButtonBoundingClientRect?.() || null } catch (_) {}
  return getChatHeaderGeometry(info, capsule, options)
}
