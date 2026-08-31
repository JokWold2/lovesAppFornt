function isValidNumber(value) {
  return Number.isFinite(value) && value >= 0
}

function nonNegativeNumber(value) {
  return isValidNumber(value) ? value : 0
}

export function measureH5Viewport({ innerHeight, visualViewport } = {}) {
  const safeInnerHeight = nonNegativeNumber(innerHeight)
  const visualHeight = visualViewport?.height
  const height = isValidNumber(visualHeight) ? visualHeight : safeInnerHeight
  const offsetTop = nonNegativeNumber(visualViewport?.offsetTop)
  const bottomOffset = Math.max(0, safeInnerHeight - offsetTop - height)
  return { height, bottomOffset }
}

export function writeH5ViewportVariables(root, metrics) {
  root.style.setProperty('--app-viewport-height', `${metrics.height}px`)
  root.style.setProperty('--app-viewport-bottom-offset', `${metrics.bottomOffset}px`)
}

export function installH5Viewport(windowLike = window, documentLike = document) {
  const visualViewport = windowLike.visualViewport
  let framePending = false
  let disposed = false
  let frameId

  const sync = () => {
    if (disposed || framePending) return
    framePending = true
    frameId = windowLike.requestAnimationFrame(() => {
      framePending = false
      if (disposed) return
      try {
        if (!isValidNumber(windowLike.innerHeight)) return
        const metrics = measureH5Viewport(windowLike)
        writeH5ViewportVariables(documentLike.documentElement, metrics)
      } catch {
        console.warn('[h5Viewport] viewport sync failed')
      }
    })
  }

  const windowEvents = ['resize', 'orientationchange', 'pageshow']
  const visualEvents = ['resize', 'scroll']
  windowEvents.forEach((type) => windowLike.addEventListener(type, sync))
  visualEvents.forEach((type) => visualViewport?.addEventListener(type, sync))
  sync()

  return () => {
    if (disposed) return
    disposed = true
    windowEvents.forEach((type) => windowLike.removeEventListener(type, sync))
    visualEvents.forEach((type) => visualViewport?.removeEventListener(type, sync))
    if (framePending && windowLike.cancelAnimationFrame) windowLike.cancelAnimationFrame(frameId)
    framePending = false
  }
}
