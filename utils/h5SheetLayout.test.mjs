import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sheets = [
  {
    file: '../components/profile/ProfileLikesSheet.vue',
    mask: 'sheet-mask',
    sheet: 'sheet',
    scroll: 'likes-list'
  },
  {
    file: '../components/chat/GroupMemberSheet.vue',
    mask: 'sheet-mask',
    sheet: 'sheet',
    scroll: 'member-list'
  },
  {
    file: '../components/chat/MemberPickerSheet.vue',
    mask: 'sheet-mask',
    sheet: 'member-sheet',
    scroll: 'member-list'
  },
  {
    file: '../pages/account/accountCenter.vue',
    mask: 'language-sheet-mask',
    sheet: 'language-sheet',
    scroll: 'language-sheet-list'
  },
  {
    file: '../pages/notice/chatRequestReview.vue',
    mask: 'mask',
    sheet: 'reject-sheet',
    scroll: 'reason'
  },
  {
    file: '../pages/market/marketFeed.vue',
    mask: 'mask',
    sheet: 'panel',
    scroll: 'comment-list'
  }
]

async function sourceFor(file) {
  return readFile(new URL(file, import.meta.url), 'utf8')
}

test('bottom sheets use the shared H5 mask, sheet, and scroll contracts', async () => {
  for (const { file, mask, sheet, scroll } of sheets) {
    const source = await sourceFor(file)
    assert.match(source, new RegExp(`class="${mask} app-h5-sheet-mask"`))
    assert.match(source, new RegExp(`class="${sheet} app-h5-sheet"`))
    assert.match(source, new RegExp(`class="${scroll} app-h5-scroll"`))
  }
})

test('bottom sheet shells use a constrained vertical flex layout', async () => {
  for (const { file, sheet } of sheets) {
    const source = await sourceFor(file)
    const selector = sheet.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const rules = source.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 's'))
    assert.ok(rules, `${sheet} must have a CSS rule`)
    assert.match(rules[1], /display\s*:\s*flex/)
    assert.match(rules[1], /flex-direction\s*:\s*column/)
    assert.match(rules[1], /min-height\s*:\s*0/)
  }
})

test('member and likes lists no longer use a 70vh height cap', async () => {
  for (const file of [
    '../components/profile/ProfileLikesSheet.vue',
    '../components/chat/GroupMemberSheet.vue'
  ]) {
    const source = await sourceFor(file)
    assert.doesNotMatch(source, /70vh/)
  }
})
