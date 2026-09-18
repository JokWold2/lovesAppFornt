import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const source = await readFile(new URL('../components/profile/ProfileDetailSections.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .+$/gm, '')
function displayedFaith(value) {
  const context = {
    module: { exports: null },
    defineProps: () => ({ profile: { spouse_faith_life: value } }),
    defineEmits: () => () => {},
    ref: value => ({ value }),
    computed: getter => ({ get value() { return getter() } })
  }
  runInNewContext(script + '\nmodule.exports = spouseFaithText.value', context)
  return context.module.exports
}

test('JSON-looking faith text stays literal after being saved and returned by the backend', () => {
  for (const value of ['["祷告", "團契"]', '"保持原文"', 'null', '希望彼此尊重\n一起成长']) {
    assert.equal(displayedFaith(value), value)
  }
})

test('existing actual arrays retain their order while empty values show the placeholder', () => {
  assert.equal(displayedFaith(['祷告', '團契']), '祷告 / 團契')
  for (const value of [[], '', null, undefined]) assert.equal(displayedFaith(value), '—')
})
