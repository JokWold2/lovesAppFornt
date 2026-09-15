const nonNegative = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0

// Reserve actual native chrome before placing custom controls. CSS safe-area
// variables alone do not include the WeChat menu capsule.
export function getPageHeaderInset(windowInfo = {}, capsule = null) {
  const statusTop = Math.max(
    nonNegative(windowInfo.statusBarHeight),
    nonNegative(windowInfo.safeAreaInsets?.top),
    nonNegative(windowInfo.safeArea?.top)
  )
  const top = Number(capsule?.top), bottom = Number(capsule?.bottom)
  const height = Number(capsule?.height), width = Number(capsule?.width)
  const hasCapsule = Number.isFinite(top) && Number.isFinite(bottom) &&
    top >= statusTop && bottom > top && bottom <= statusTop + 100 && height > 0 && width > 0
  if (hasCapsule) return Math.ceil(bottom + 8)
  // The SDK can briefly return an empty menu rectangle during page creation.
  return Math.ceil(statusTop + (windowInfo.uniPlatform === 'mp-weixin' ? 44 : 0))
}

export function readPageHeaderInset(api) {
  let windowInfo = {}, capsule = null
  try { windowInfo = api?.getWindowInfo?.() || api?.getSystemInfoSync?.() || {} } catch (_) {
    try { windowInfo = api?.getSystemInfoSync?.() || {} } catch (_) {}
  }
  try { capsule = api?.getMenuButtonBoundingClientRect?.() || null } catch (_) {}
  if (!windowInfo.uniPlatform && !(Number(capsule?.height) > 0)) {
    // getWindowInfo does not carry uniPlatform on every uni-app SDK version.
    try { windowInfo = { ...api?.getSystemInfoSync?.(), ...windowInfo } } catch (_) {}
  }
  return getPageHeaderInset(windowInfo, capsule)
}
