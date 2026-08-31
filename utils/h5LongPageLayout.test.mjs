import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const rootPages = [
  ['pages/login/login360.vue', 'container'],
  ['pages/my/my.vue', 'container'],
  ['pages/my/myFile/myFile.vue', 'page'],
  ['pages/searchPerson/personShow/personShow.vue', 'page'],
  ['pages/my/myLifeShowEdit/myLifeShowEdit.vue', 'container'],
  ['pages/notice/notice.vue', 'page'],
  ['pages/notice/interactionMessages.vue', 'interaction-page'],
  ['pages/account/accountCenter.vue', 'page'],
  ['pages/notice/chatRequestReview.vue', 'page'],
  ['pages/chat/groupManage.vue', 'page'],
  ['pages/chat/groupMembers.vue', 'page'],
  ['pages/market/marketList.vue', 'page'],
  ['pages/my/myLifeShow/myLifeShow.vue', 'container'],
  ['pages/index/index360.vue', 'container']
]

test('普通长页面根节点使用最小高度契约', async () => {
  for (const [file, rootClass] of rootPages) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const rootPattern = new RegExp(`<view(?:\\s+[^>]*?)?class="${rootClass} app-h5-min-screen"`)
    assert.match(source, rootPattern, `${file} root should use app-h5-min-screen`)
    const rootTag = source.match(/<view[^>]*class="[^"]*app-h5-min-screen[^"]*"/)?.[0] || ''
    assert.doesNotMatch(rootTag, /app-h5-screen|app-h5-scroll/, `${file} root should remain a normal document-flow page`)
    assert.doesNotMatch(source, /(?<!min-)height\s*:\s*100vh\b/, `${file} should not add fixed 100vh height`)
    assert.doesNotMatch(source.match(/<view[^>]*class="[^"]*app-h5-min-screen[^"]*"/)?.[0] || '', /overflow\s*:\s*hidden/, `${file} root should not hide overflow`)
  }
})
