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

function platformBlocks(source, directive) {
  return [...source.matchAll(new RegExp(`/\\*\\s*#${directive}\\s*\\*/(.*?)/\\*\\s*#endif\\s*\\*/`, 'gs'))]
}

function platformSource(source, directive) {
  return platformBlocks(source, directive)
    .map((match) => match[1])
    .join('\n')
}

function selectorRule(source, selector) {
  const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  return source.match(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`, 's'))
}

function selectorPosition(source, selector) {
  const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  return source.search(new RegExp(`\\.${escaped}\\s*\\{`))
}

function platformSelectorPosition(source, directive, selector) {
  return platformBlocks(source, directive)
    .find((match) => selectorRule(match[1], selector))?.index ?? -1
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
    const rules = selectorRule(source, sheet)
    assert.ok(rules, `${sheet} must have a CSS rule`)
    assert.match(rules[1], /display\s*:\s*flex/)
    assert.match(rules[1], /flex-direction\s*:\s*column/)
    assert.match(rules[1], /min-height\s*:\s*0/)
  }
})

test('scoped masks retain the visual viewport bottom offset on H5', async () => {
  for (const { file, mask } of sheets) {
    const source = await sourceFor(file)
    assert.match(selectorRule(source, mask)?.[1] || '', /inset\s*:\s*0/)
    assert.ok(
      platformSelectorPosition(source, 'ifdef H5', mask) > selectorPosition(source, mask),
      `${mask}'s H5 override must follow its scoped inset rule`
    )
    assert.match(
      selectorRule(platformSource(source, 'ifdef H5'), mask)?.[1] || '',
      /bottom\s*:\s*var\(--app-viewport-bottom-offset,\s*0px\)/
    )
  }
})

test('H5 sheet padding preserves the safe-area inset after scoped padding shorthands', async () => {
  for (const { file, sheet } of sheets.filter(({ sheet }) => !['sheet'].includes(sheet))) {
    const source = await sourceFor(file)
    assert.match(selectorRule(source, sheet)?.[1] || '', /padding\s*:/)
    assert.ok(
      platformSelectorPosition(source, 'ifdef H5', sheet) > selectorPosition(source, sheet),
      `${sheet}'s H5 safe-area override must follow its scoped padding rule`
    )
    assert.match(
      selectorRule(platformSource(source, 'ifdef H5'), sheet)?.[1] || '',
      /padding-bottom\s*:\s*calc\([^;]*env\(safe-area-inset-bottom\)\)/
    )
  }
})

test('market reply and input actions cannot shrink inside the comment sheet', async () => {
  const source = await sourceFor('../pages/market/marketFeed.vue')
  for (const selector of ['replying', 'input']) {
    const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    assert.match(source, new RegExp(`\\.${escaped}\\s*\\{[^}]*flex\\s*:\\s*0\\s+0\\s+auto`, 's'))
  }
})

test('non-H5 sheets preserve their former viewport height fallbacks', async () => {
  const fallbacks = [
    ['../components/profile/ProfileLikesSheet.vue', 'sheet', /max-height\s*:\s*70vh/, 'likes-list', /max-height\s*:\s*calc\(70vh\s*-\s*100rpx\)/],
    ['../components/chat/GroupMemberSheet.vue', 'sheet', /max-height\s*:\s*70vh/, 'member-list', /max-height\s*:\s*calc\(70vh\s*-\s*100rpx\)/],
    ['../components/chat/MemberPickerSheet.vue', 'member-sheet', /height\s*:\s*76vh/],
    ['../pages/market/marketFeed.vue', 'panel', /height\s*:\s*60vh/, 'panel', /min-height\s*:\s*60vh/]
  ]
  for (const [file, selector, expected, secondSelector, secondExpected] of fallbacks) {
    const source = platformSource(await sourceFor(file), 'ifdef H5')
    assert.doesNotMatch(source, expected)
    const fallback = platformSource(await sourceFor(file), 'ifndef H5')
    assert.match(selectorRule(fallback, selector)?.[1] || '', expected)
    if (secondSelector) assert.match(selectorRule(fallback, secondSelector)?.[1] || '', secondExpected)
  }
})
