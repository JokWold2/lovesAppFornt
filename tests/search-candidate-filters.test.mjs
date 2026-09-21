import test from 'node:test'
import assert from 'node:assert/strict'

let filters = null
try { filters = await import('../utils/searchCandidateFilters.js') } catch (_) {}

test('candidate search starts unrestricted and keeps the three primary groups multi-select', () => {
  assert.ok(filters?.createSearchForm, 'candidate filter model is not implemented yet')
  const form = filters.createSearchForm()
  assert.deepEqual(form.gender, [])
  assert.deepEqual(form.generation, [])
  assert.deepEqual(form.status, [])
})

test('advanced count excludes name and visible gender while counting active advanced choices', () => {
  assert.ok(filters?.countAdvancedFilters, 'advanced filter count is not implemented yet')
  const form = filters.createSearchForm()
  form.name = '林'
  form.gender.push('女', '男')
  form.generation.push('祝福子女')
  form.status.push('候选人', '申请者')
  form.ageMin = '25'
  form.tools.mbti = { enabled: true, value: 'INTJ' }
  assert.equal(filters.countAdvancedFilters(form), 5)
})

test('payload keeps arrays, removes placeholder ranges and does not mutate the form', () => {
  assert.ok(filters?.buildSearchPayload, 'search payload builder is not implemented yet')
  const form = filters.createSearchForm()
  form.gender.push('女', '男')
  form.generation.push('一世會員')
  form.ageMin = '全部'
  form.heightMax = '180'
  const payload = filters.buildSearchPayload(form, 2, 20)
  assert.deepEqual(payload.gender, ['女', '男'])
  assert.deepEqual(payload.generation, ['一世會員'])
  assert.equal('ageMin' in payload, false)
  assert.equal(payload.heightMax, '180')
  assert.equal(payload.page, 2)
  assert.equal(payload.pageSize, 20)
  assert.equal(form.ageMin, '全部')
})
