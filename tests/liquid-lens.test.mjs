import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../utils/liquidLens.js', import.meta.url), 'utf8').catch(() => '')
const lens = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('the lens samples toward its centre, magnifying content rather than randomly blurring it', () => {
  const centre = lens.sampleLens(60, 30, 120, 60)
  assert.equal(centre.x, 60)
  assert.equal(centre.y, 30)
  const left = lens.sampleLens(30, 30, 120, 60)
  const right = lens.sampleLens(90, 30, 120, 60)
  assert.ok(left.x > 30 && left.x < 60)
  assert.ok(right.x < 90 && right.x > 60)
  assert.ok(Math.abs(left.x + right.x - 120) < 0.001)
  assert.ok(lens.sampleLens(60, 10, 120, 60).y > 10)
})

test('dragging follows the finger continuously and clamps at both ends', () => {
  assert.equal(lens.dragLensPosition(0, 55, 110, 3), 0.5)
  assert.equal(lens.dragLensPosition(1, -55, 110, 3), 0.5)
  assert.equal(lens.dragLensPosition(0, -400, 110, 3), 0)
  assert.equal(lens.dragLensPosition(1, 900, 110, 3), 2)
})

test('a tap settles the lens before changing pages, and cancellation never navigates', () => {
  const frames = []
  let now = 0
  const queue = new Map()
  let id = 0
  const clock = { now: () => now, request: fn => { queue.set(++id, fn); return id }, cancel: key => queue.delete(key) }
  const motion = lens.createLensMotion({ clock, update: value => frames.push(value) })
  const visits = []
  motion.settle(0, 2, () => visits.push(2))
  assert.deepEqual(visits, [])
  const advance = ms => { now += ms; const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn()) }
  advance(100)
  assert.ok(frames.at(-1) > 0 && frames.at(-1) < 2)
  assert.deepEqual(visits, [])
  advance(250)
  assert.equal(frames.at(-1), 2)
  assert.deepEqual(visits, [2])
  motion.settle(2, 0, () => visits.push(0))
  motion.cancel()
  advance(500)
  assert.deepEqual(visits, [2])
})
