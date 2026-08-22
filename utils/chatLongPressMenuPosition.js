const EDGE = 12
const GAP = 12

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getLongPressMenuPosition(anchor = {}, viewport = {}, menu = {}) {
  const width = Number(viewport.width) || 390
  const height = Number(viewport.height) || 760
  const menuWidth = Number(menu.width) || 172
  const menuHeight = Number(menu.height) || 62
  const x = Number(anchor.x) || width / 2
  const y = Number(anchor.y) || height / 2
  const canShowAbove = y >= menuHeight + GAP + EDGE
  const arrow = canShowAbove ? 'bottom' : 'top'

  return {
    left: clamp(Math.round(x - menuWidth / 2), EDGE, Math.max(EDGE, width - menuWidth - EDGE)),
    top: clamp(Math.round(canShowAbove ? y - menuHeight - GAP : y + GAP), EDGE, Math.max(EDGE, height - menuHeight - EDGE)),
    arrow
  }
}
