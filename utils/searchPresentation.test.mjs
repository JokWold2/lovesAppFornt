import test from 'node:test'
import assert from 'node:assert/strict'
import { searchOptionLabel, searchPayloadValue } from './searchPresentation.js'

test('search option labels are localized without changing backend values', () => {
  assert.equal(searchOptionLabel('en', '女'), 'Female')
  assert.equal(searchOptionLabel('en', '1: 改革型'), '1: Reformer')
  assert.equal(searchOptionLabel('ja', '全部'), 'すべて')
  assert.equal(searchPayloadValue('女'), '女')
})

test('Chinese search options never fall back to English labels', () => {
  assert.equal(searchOptionLabel('zh-Hans', '女'), '女')
  assert.equal(searchOptionLabel('zh-Hant', '候選人'), '候選人')
  assert.equal(searchOptionLabel('zh-Hans', '全部'), '全部')
})

test('Russian search filters translate generation, status, and region choices', () => {
  assert.equal(searchOptionLabel('ru', '祝福子女'), 'Благословлённый ребёнок')
  assert.equal(searchOptionLabel('ru', '候選人'), 'Кандидат')
  assert.equal(searchOptionLabel('ru', 'Korea'), 'Корея')
  assert.equal(searchOptionLabel('ru', 'Europe(+Middle East)'), 'Европа (+Ближний Восток)')
})
