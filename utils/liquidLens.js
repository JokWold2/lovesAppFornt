// Inverse optical sampling: pixels nearer the centre are stretched outwards.
// Unlike turbulence, this keeps the centre steady and bends the capsule rim.
export function sampleLens(x, y, width, height, zoom = 1.18) {
  const cx = width / 2
  const cy = height / 2
  const dx = x - cx
  const dy = y - cy
  const radius = height / 2
  const capX = Math.sign(dx) * Math.max(0, Math.abs(dx) - (cx - radius))
  const rim = Math.min(1, Math.hypot(capX, dy) / radius)
  const bend = 1 - 1 / zoom + 0.12 * Math.pow(rim, 8)
  return { x: x - dx * bend, y: y - dy * bend }
}

export function dragLensPosition(start, deltaX, itemWidth, count) {
  return Math.max(0, Math.min(count - 1, start + deltaX / Math.max(1, itemWidth)))
}

export function createLensMotion({ update, clock = {
  now: () => Date.now(), request: fn => setTimeout(fn, 16), cancel: id => clearTimeout(id)
} }) {
  let frame = null
  const cancel = () => { if (frame !== null) clock.cancel(frame); frame = null }
  return {
    cancel,
    settle(from, to, done, duration = 280) {
      cancel()
      const start = clock.now()
      const tick = () => {
        const t = duration ? Math.min(1, (clock.now() - start) / duration) : 1
        // Fast initial travel and a gentle landing; the capsule's CSS handles
        // the elastic width so its centre never overshoots outside the dock.
        update(from + (to - from) * (1 - Math.pow(1 - t, 3)))
        if (t < 1) frame = clock.request(tick)
        else { frame = null; done?.() }
      }
      tick()
    }
  }
}

// H5 only. A bounded cache avoids regenerating maps on cached-tab activation.
const maps = new Map()
export function createLensMap(width, height, zoom) {
  const key = `${width}:${height}:${zoom}`
  if (maps.has(key)) return maps.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  const pixels = context.createImageData(width, height)
  const scale = Math.max(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sample = sampleLens(x, y, width, height, zoom)
      const offset = (y * width + x) * 4
      pixels.data[offset] = Math.round(255 * (0.5 + (sample.x - x) / scale))
      pixels.data[offset + 1] = Math.round(255 * (0.5 + (sample.y - y) / scale))
      pixels.data[offset + 2] = 128
      pixels.data[offset + 3] = 255
    }
  }
  context.putImageData(pixels, 0, 0)
  const map = { href: canvas.toDataURL(), width, height, scale }
  if (maps.size >= 12) maps.delete(maps.keys().next().value)
  maps.set(key, map)
  return map
}
