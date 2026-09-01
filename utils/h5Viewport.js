function isValidNumber(value) {
  return Number.isFinite(value) && value >= 0
}

function nonNegativeNumber(value) {
  return isValidNumber(value) ? value : 0
}

function hasEditableFocus(documentLike) {
  const element = documentLike?.activeElement
  const tagName = String(element?.tagName || '').toLowerCase()
  return ['input', 'textarea', 'select'].includes(tagName) || element?.isContentEditable === true
}

export function measureH5Viewport({
  innerHeight,
  visualViewport,
  keyboardActive = false,
  layoutHeight,
} = {}) {
  const safeInnerHeight = nonNegativeNumber(innerHeight)
  const safeLayoutHeight = isValidNumber(layoutHeight) ? layoutHeight : safeInnerHeight
  const visualHeight = visualViewport?.height
  const height = isValidNumber(visualHeight) ? visualHeight : safeInnerHeight
  const offsetTop = nonNegativeNumber(visualViewport?.offsetTop)
  const coveredBottom = Math.max(0, safeInnerHeight - offsetTop - height)
  const bottomOffset = keyboardActive ? coveredBottom : 0
  return { height, offsetTop, bottomOffset, layoutHeight: safeLayoutHeight }
}

export function writeH5ViewportVariables(root, metrics) {
  root.style.setProperty('--app-viewport-height', `${metrics.height}px`)
  root.style.setProperty('--app-viewport-offset-top', `${metrics.offsetTop}px`)
  root.style.setProperty('--app-viewport-bottom-offset', `${metrics.bottomOffset}px`)
  root.style.setProperty('--app-layout-viewport-height', `${metrics.layoutHeight}px`)
}

export function installH5Viewport(windowLike = window, documentLike = document) {
  const visualViewport = windowLike.visualViewport
  let framePending = false
  let disposed = false
  let frameId
  let layoutHeight = nonNegativeNumber(windowLike.innerHeight)

  const syncNow = () => {
    try {
      if (!isValidNumber(windowLike.innerHeight)) return
      const keyboardActive = hasEditableFocus(documentLike)
      if (!keyboardActive) layoutHeight = windowLike.innerHeight
      const metrics = measureH5Viewport({
        innerHeight: windowLike.innerHeight,
        visualViewport,
        keyboardActive,
        layoutHeight,
      })
      writeH5ViewportVariables(documentLike.documentElement, metrics)
    } catch {
      console.warn('[h5Viewport] viewport sync failed')
    }
  }

  const sync = () => {
    if (disposed || framePending) return
    framePending = true
    try {
      frameId = windowLike.requestAnimationFrame(() => {
        framePending = false
        if (disposed) return
        syncNow()
      })
    } catch {
      framePending = false
      console.warn('[h5Viewport] viewport sync failed')
    }
  }

  const windowEvents = ['resize', 'orientationchange', 'pageshow']
  const visualEvents = ['resize', 'scroll']
  const documentEvents = ['focusin', 'focusout']
  const registeredListeners = []
  const register = (target, type) => {
    if (typeof target?.addEventListener !== 'function') return
    try {
      target.addEventListener(type, sync)
      registeredListeners.push({ target, type })
    } catch {
      console.warn('[h5Viewport] viewport sync failed')
    }
  }
  windowEvents.forEach((type) => register(windowLike, type))
  visualEvents.forEach((type) => register(visualViewport, type))
  documentEvents.forEach((type) => register(documentLike, type))
  syncNow()

  return () => {
    if (disposed) return
    disposed = true
    registeredListeners.forEach(({ target, type }) => {
      if (typeof target?.removeEventListener !== 'function') return
      try {
        target.removeEventListener(type, sync)
      } catch {}
    })
    if (framePending && windowLike.cancelAnimationFrame) windowLike.cancelAnimationFrame(frameId)
    framePending = false
  }
}
