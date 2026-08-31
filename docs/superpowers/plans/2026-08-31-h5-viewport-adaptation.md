# H5 视口与安全区适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 LovesApp 的 H5 页面在 iPhone Safari、iPhone Chrome、Android Chrome 和微信内置浏览器中使用真实可视高度，优先修复群聊消息滚动与输入栏遮挡，并统一修复高风险全屏页、固定底栏和底部弹层。

**Architecture:** 新增一个仅在 H5 安装的 `visualViewport` 运行时，把当前可视高度与底部遮挡写入根 CSS 变量；`App.vue` 提供按页面类型使用的公共布局类。页面只选择合适的布局契约，不全局接管 `uni-page-body`，从而保留普通长页面的原生滚动以及小程序/App 的原有实现。

**Tech Stack:** uni-app、Vue 3 Composition API、条件编译、CSS 自定义属性、Visual Viewport API、Node.js `node:test`、HBuilderX CLI。

**Spec:** `docs/superpowers/specs/2026-08-31-h5-viewport-adaptation-design.md`

## Global Constraints

- 所有 H5 专用运行时代码和样式必须放在 `#ifdef H5` 条件中；不得改变微信小程序和 App 的 `scroll-view`、键盘高度或安全区逻辑。
- 不对 `uni-page-body`、`body` 或所有页面统一设置 `overflow: hidden`；普通长页面继续使用浏览器原生页面滚动。
- H5 中同一份键盘位移只能由 `visualViewport` 或组件外边距补偿一次，禁止重复叠加。
- 每个行为改动先写失败测试，再写最小实现；每个任务的目标测试通过后再提交。
- 当前执行 `node --test` 已存在与本需求无关的历史失败，主要是旧中文文案/source-regex 断言与当前国际化代码不一致。新增 H5 测试必须全部通过，最终全量测试不得新增失败文件或失败签名；不得借本任务扩大范围重写这些历史测试。
- 保留用户现有未提交改动；每次提交前用 `git diff --check` 和 `git status --short` 核对范围。

---

## Task 1: 建立可测试的 H5 Visual Viewport 运行时

**Files:**

- Create: `utils/h5Viewport.js`
- Create: `utils/h5Viewport.test.mjs`
- Modify: `main.js`

- [ ] **Step 1: 写纯计算函数的失败测试**

在 `utils/h5Viewport.test.mjs` 使用 `node:test` 和 `node:assert/strict` 覆盖：

```js
import {
  measureH5Viewport,
  writeH5ViewportVariables,
  installH5Viewport,
} from './h5Viewport.js'

test('prefers visual viewport and calculates the covered bottom area', () => {
  assert.deepEqual(
    measureH5Viewport({
      innerHeight: 844,
      visualViewport: { height: 500, offsetTop: 20 },
    }),
    { height: 500, bottomOffset: 324 },
  )
})
```

另测 `visualViewport` 缺失时回退 `innerHeight`、无效/负值归零，以及有效值写成 `px` CSS 变量。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5Viewport.test.mjs`

Expected: FAIL，原因是 `utils/h5Viewport.js` 尚不存在。

- [ ] **Step 3: 实现纯函数与安装函数**

在 `utils/h5Viewport.js` 导出：

```js
export function measureH5Viewport({ innerHeight, visualViewport })
export function writeH5ViewportVariables(root, metrics)
export function installH5Viewport(windowLike = window, documentLike = document)
```

实现约束：

- 只接受有限非负数；`visualViewport.height` 有效时优先使用，否则用 `innerHeight`；
- `bottomOffset = max(0, innerHeight - visualViewport.offsetTop - visualViewport.height)`；
- 写入 `--app-viewport-height` 和 `--app-viewport-bottom-offset`；
- 使用单个 `requestAnimationFrame` 合并更新；监听 `visualViewport.resize`、`visualViewport.scroll`、`window.resize`、`window.orientationchange` 和 `pageshow`；
- 安装函数立即同步一次并返回 cleanup；更新异常只输出不含用户数据的 `console.warn('[h5Viewport] viewport sync failed')`；
- 如果本次读数无效，不覆盖上一次有效 CSS 变量。

- [ ] **Step 4: 为事件、合帧和清理补充测试并跑到 GREEN**

用可记录监听器的 fake window/fake visualViewport 与立即执行的 fake RAF 验证：安装即同步、每类事件触发同步、同帧只排队一次、cleanup 后不再响应。

Run: `node --test utils/h5Viewport.test.mjs`

Expected: PASS。

- [ ] **Step 5: 仅在 H5 启动时安装**

在 `main.js` 中添加条件编译导入和一次性安装：

```js
// #ifdef H5
import { installH5Viewport } from './utils/h5Viewport.js'

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installH5Viewport(window, document)
}
// #endif
```

不要把 cleanup 存入页面实例；它与 H5 应用进程同生命周期。

- [ ] **Step 6: 验证并提交**

Run: `node --test utils/h5Viewport.test.mjs && git diff --check`

Expected: PASS，且无空白错误。

```bash
git add main.js utils/h5Viewport.js utils/h5Viewport.test.mjs
git commit -m "fix(h5): publish visual viewport metrics"
```

---

## Task 2: 建立公共 H5 页面布局契约

**Files:**

- Modify: `App.vue`
- Create: `utils/h5ViewportLayout.test.mjs`

- [ ] **Step 1: 写公共类契约的失败测试**

读取 `App.vue` 源码并断言 H5 条件块中存在：

- `.app-h5-screen`
- `.app-h5-min-screen`
- `.app-h5-scroll`
- `.app-h5-fixed-bottom`
- `.app-h5-sheet-mask`
- `.app-h5-sheet`
- `--app-viewport-height`
- `--app-viewport-bottom-offset`
- `env(safe-area-inset-bottom)`

还要断言没有新增 `uni-page-body { overflow: hidden; }` 或 `body { overflow: hidden; }`。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5ViewportLayout.test.mjs`

Expected: FAIL，公共类尚不存在。

- [ ] **Step 3: 在 `App.vue` 添加仅 H5 生效的公共样式**

核心契约如下，先写 `vh`，再写 `dvh`，最后写 CSS 变量，使旧浏览器保留前一条有效声明：

```css
/* #ifdef H5 */
.app-h5-screen {
  height: calc(100vh - var(--window-top, 44px));
  height: calc(100dvh - var(--window-top, 44px));
  height: calc(var(--app-viewport-height, 100dvh) - var(--window-top, 44px));
  min-height: 0;
  overflow: hidden;
}

.app-h5-min-screen {
  min-height: calc(100vh - var(--window-top, 44px));
  min-height: calc(100dvh - var(--window-top, 44px));
  min-height: calc(var(--app-viewport-height, 100dvh) - var(--window-top, 44px));
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.app-h5-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.app-h5-fixed-bottom {
  --app-fixed-bottom-base: 0px;
  bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.app-h5-sheet-mask {
  bottom: var(--app-viewport-bottom-offset, 0px);
  overscroll-behavior: contain;
}

.app-h5-sheet {
  max-height: calc(var(--app-viewport-height, 100dvh) - var(--window-top, 0px) - 24px);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}
/* #endif */
```

- [ ] **Step 4: 运行契约测试并提交**

Run: `node --test utils/h5ViewportLayout.test.mjs && git diff --check`

Expected: PASS。

```bash
git add App.vue utils/h5ViewportLayout.test.mjs
git commit -m "fix(h5): add shared viewport layout contracts"
```

---

## Task 3: 修复群聊唯一滚动容器与输入栏可见性

**Files:**

- Modify: `pages/chat/chatRoom.vue`
- Modify: `utils/chatMessageListState.test.mjs`
- Create: `utils/h5ChatViewport.test.mjs`

- [ ] **Step 1: 写群聊 DOM/条件编译契约的失败测试**

在 `utils/h5ChatViewport.test.mjs` 读取 `pages/chat/chatRoom.vue` 并断言：

- 根节点使用 `page app-h5-screen`；
- H5 消息节点使用 `messages messages--h5 app-h5-scroll`；
- H5 消息节点只有模板 `@scroll="onH5MessageScroll"`；
- 源码不存在为消息节点调用 `addEventListener('scroll'` 或 `addEventListener("scroll"`；
- `ChatComposer` 位于消息节点结束标签之后；
- 非 H5 的 `<scroll-view>`、`@scrolltoupper="loadOlder"`、`:scroll-top="scrollTop"` 保留；
- H5 传给 composer 的键盘高度为 `0`，非 H5 仍使用现有 `keyboardHeight`。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5ChatViewport.test.mjs utils/chatMessageListState.test.mjs`

Expected: FAIL，现有页面同时存在模板监听和手动 DOM 监听，且仍使用 `100vh` 与 H5 键盘外边距。

- [ ] **Step 3: 迁移页面容器和消息滚动节点**

在模板中：

```html
<view class="page app-h5-screen">
...
<view ref="h5MessagesRef" class="messages messages--h5 app-h5-scroll" @scroll="onH5MessageScroll">
```

删除 H5 `.page { height: calc(100vh ...); }` 与 `.messages--h5` 中已由公共类提供的滚动属性；保留页面自己的颜色、间距与 `flex` 属性。

- [ ] **Step 4: 删除重复监听并保留一套滚动状态机**

删除 `mountH5ScrollListener`、`removeH5ScrollListener`、相关原生 handler 和生命周期调用。`onH5MessageScroll` 直接从 `event.target` 或 `event.currentTarget` 读取：

```js
const target = event?.currentTarget || event?.target || h5MessagesRef.value
updateMessageScrollState({
  scrollTop: Number(target?.scrollTop || 0),
  scrollHeight: Number(target?.scrollHeight || 0),
  clientHeight: Number(target?.clientHeight || 0),
})
```

删除 `event.isTrusted` 首次滚动门禁和 `hasUserTriggeredH5Scroll`，确保自动滚动、触摸滚动和测试环境共用同一路径。

- [ ] **Step 5: 避免 H5 键盘高度重复补偿**

新增 `composerKeyboardHeight` 计算值：H5 返回 `0`，非 H5 返回现有 `keyboardHeight.value`。模板改为 `:keyboard-height="composerKeyboardHeight"`。H5“回到最新”按钮只使用 composer 自身高度对应的固定基值，不再叠加 `keyboardHeight`；非 H5 保持原计算。

- [ ] **Step 6: 保持顶部加载和历史阅读位置**

复核并测试：

- H5 `scrollTop <= 60` 时调用现有 `loadOlder()`；
- 加载旧消息前记录 `scrollHeight`，DOM 更新后把 `scrollTop` 增加高度差；
- 五秒轮询只在 `isNearBottom` 为真时滚到底部，否则显示“回到最新”；
- 发送消息和点击“回到最新”仍调用 `scrollToLast(true)`。

将 `utils/chatMessageListState.test.mjs` 中与上述行为直接相关的旧断言更新为真实的新契约，不修改国际化或消息展示的无关断言。

- [ ] **Step 7: 运行群聊目标测试并提交**

Run:

```bash
node --test \
  utils/h5ChatViewport.test.mjs \
  utils/chatMessageListState.test.mjs \
  components/chat/ChatComposer.test.mjs \
  utils/chatComposerState.test.mjs
```

Expected: 新增 H5 测试、消息滚动状态测试和 composer 状态测试 PASS。若 `ChatComposer.test.mjs` 仍命中已记录的历史文案断言，只允许该既有签名继续存在，不得新增失败。

```bash
git add pages/chat/chatRoom.vue utils/h5ChatViewport.test.mjs utils/chatMessageListState.test.mjs
git commit -m "fix(h5): keep chat messages scrollable above composer"
```

---

## Task 4: 迁移其他全屏独立滚动页面

**Files:**

- Modify: `pages/moments/momentDetail.vue`
- Modify: `pages/market/marketFeed.vue`
- Modify: `components/legal/LegalDocument.vue`
- Create: `utils/h5FullscreenPages.test.mjs`

- [ ] **Step 1: 写页面类型契约的失败测试**

逐文件断言：

- `momentDetail.vue` 根节点使用 `app-h5-screen`，评论内容区使用 `app-h5-scroll`，底部评论栏在滚动区外；
- `marketFeed.vue` 根容器使用 `app-h5-screen`，H5 feed 使用 `app-h5-scroll`，图片内容允许 `flex: 1; min-height: 0`；
- `LegalDocument.vue` 根节点同时使用 `app-h5-screen app-h5-scroll`；
- 三个文件的 H5 样式中不再用裸 `height: 100vh` 接管页面。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5FullscreenPages.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 迁移 moment detail**

根节点加 `app-h5-screen`，承载动态正文和评论的中间容器加 `app-h5-scroll`。保持 `.bottom-bar` 在该滚动节点之后并处于 flex 文档流底部，不改评论提交、点赞和回复逻辑。

- [ ] **Step 4: 迁移 market feed**

H5 根节点加 `app-h5-screen`，feed 节点加 `app-h5-scroll`；把 H5 单条内容从固定 `100vh` 改为父容器 `height: 100%`，图片/媒体主体使用 `flex: 1; min-height: 0`。不改变竖向切换、点赞、评论和商品数据加载。

- [ ] **Step 5: 迁移 legal document**

根节点加 `app-h5-screen app-h5-scroll`，移除 H5 裸 `100vh`；保留文档正文的原有 padding、字体与富文本渲染。

- [ ] **Step 6: 运行页面测试并提交**

Run:

```bash
node --test \
  utils/h5FullscreenPages.test.mjs \
  pages/moments/momentDetail.test.mjs \
  pages/market/marketFeed.test.mjs
```

Expected: H5 契约 PASS；原页面业务测试不新增失败。

```bash
git add pages/moments/momentDetail.vue pages/market/marketFeed.vue components/legal/LegalDocument.vue utils/h5FullscreenPages.test.mjs
git commit -m "fix(h5): migrate fullscreen content pages"
```

---

## Task 5: 修复固定底栏和悬浮控件遮挡

**Files:**

- Modify: `pages/index/auctionDetail.vue`
- Modify: `pages/searchPerson/searchPerson.vue`
- Modify: `pages/my/myLifeShow/myLifeShow.vue`
- Modify: `pages/index/index360.vue`
- Create: `utils/h5FixedBottomPages.test.mjs`

- [ ] **Step 1: 写固定控件契约的失败测试**

断言：

- `auctionDetail.vue` 的 `.bottom-bar` 使用 `app-h5-fixed-bottom`；
- `searchPerson.vue` 的根节点使用 `app-h5-screen`，内部内容滚动区使用 `app-h5-scroll`，`.bottom-bar` 使用 `app-h5-fixed-bottom`；
- `myLifeShow.vue` 的 `.fab-container` 使用 `app-h5-fixed-bottom` 并设置 `--app-fixed-bottom-base: 60rpx`；
- `index360.vue` 的 `.fab-button` 使用 `app-h5-fixed-bottom` 并设置 `--app-fixed-bottom-base: 200rpx`；
- 页面正文已有或新增的底部空间不小于固定控件高度加安全区。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5FixedBottomPages.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 迁移详情页固定操作栏**

`auctionDetail.vue` 根节点加 `app-h5-min-screen`，bottom bar 加 `app-h5-fixed-bottom`。保持原固定高度并核对正文底部 padding；不足时只增加等高占位，不改竞拍操作。

`searchPerson.vue` 采用全屏 flex：根节点加 `app-h5-screen`，现有结果滚动节点加 `app-h5-scroll`，bottom bar 加 `app-h5-fixed-bottom`。确保滚动节点最后一项可滚到栏上方。

- [ ] **Step 4: 迁移悬浮按钮**

给 `myLifeShow.vue` 与 `index360.vue` 的 H5 悬浮按钮加公共类，并在各自局部样式中设置 `--app-fixed-bottom-base`。不要改按钮点击、返回顶部和封面预览逻辑。

- [ ] **Step 5: 验证并提交**

Run: `node --test utils/h5FixedBottomPages.test.mjs && git diff --check`

Expected: PASS。

```bash
git add pages/index/auctionDetail.vue pages/searchPerson/searchPerson.vue pages/my/myLifeShow/myLifeShow.vue pages/index/index360.vue utils/h5FixedBottomPages.test.mjs
git commit -m "fix(h5): keep fixed actions inside visual viewport"
```

---

## Task 6: 统一底部弹层高度和内部滚动

**Files:**

- Modify: `components/profile/ProfileLikesSheet.vue`
- Modify: `components/chat/GroupMemberSheet.vue`
- Modify: `components/chat/MemberPickerSheet.vue`
- Modify: `pages/account/accountCenter.vue`
- Modify: `pages/notice/chatRequestReview.vue`
- Modify: `pages/market/marketFeed.vue`
- Create: `utils/h5SheetLayout.test.mjs`

- [ ] **Step 1: 写底部弹层契约的失败测试**

为每个文件建立 mask/sheet 映射并断言：mask 使用 `app-h5-sheet-mask`，sheet 使用 `app-h5-sheet`。另外断言成员/点赞/选择列表所在节点使用 `app-h5-scroll`，且 sheet 使用纵向 flex 与 `min-height: 0`。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5SheetLayout.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 迁移三个复用组件**

修改：

- `ProfileLikesSheet.vue`: `.sheet-mask` 加 mask 公共类，`.sheet` 加 sheet 公共类，likes list 加 scroll 公共类；
- `GroupMemberSheet.vue`: 同样处理 members list；
- `MemberPickerSheet.vue`: `.sheet-mask`、`.member-sheet` 和成员列表分别使用公共 mask/sheet/scroll 类。

sheet 自身使用 `display: flex; flex-direction: column; min-height: 0`；标题和操作区不滚动，列表 `flex: 1; min-height: 0`。移除列表对 `70vh` 的硬编码最大高度。

- [ ] **Step 4: 迁移页面内弹层**

修改：

- `accountCenter.vue` 的语言 mask/sheet；
- `chatRequestReview.vue` 的审核 mask/reject sheet；
- `marketFeed.vue` 的评论 mask/comment panel。

阻止弹层内容触发背景点击，并保留现有 `@tap.stop`。长内容放入 `app-h5-scroll`，按钮区保持可见；不改语言选择、审核提交和评论接口。

- [ ] **Step 5: 运行相关测试并提交**

Run:

```bash
node --test \
  utils/h5SheetLayout.test.mjs \
  components/chat/GroupMemberSheet.test.mjs \
  utils/groupMemberSheetState.test.mjs \
  pages/account/accountCenter.lifecycle.test.mjs \
  pages/market/marketFeed.test.mjs
```

Expected: 新 H5 契约 PASS，现有业务测试不新增失败。

```bash
git add components/profile/ProfileLikesSheet.vue components/chat/GroupMemberSheet.vue components/chat/MemberPickerSheet.vue pages/account/accountCenter.vue pages/notice/chatRequestReview.vue pages/market/marketFeed.vue utils/h5SheetLayout.test.mjs
git commit -m "fix(h5): constrain bottom sheets to visual viewport"
```

---

## Task 7: 普通长页面只统一最小高度与安全区

**Files:**

- Modify: `pages/login/login360.vue`
- Modify: `pages/my/my.vue`
- Modify: `pages/my/myFile/myFile.vue`
- Modify: `pages/searchPerson/personShow/personShow.vue`
- Modify: `pages/my/myLifeShowEdit/myLifeShowEdit.vue`
- Modify: `pages/notice/notice.vue`
- Modify: `pages/notice/interactionMessages.vue`
- Modify: `pages/account/accountCenter.vue`
- Modify: `pages/notice/chatRequestReview.vue`
- Modify: `pages/chat/groupManage.vue`
- Modify: `pages/chat/groupMembers.vue`
- Modify: `pages/market/marketList.vue`
- Modify: `pages/my/myLifeShow/myLifeShow.vue`
- Modify: `pages/index/index360.vue`
- Create: `utils/h5LongPageLayout.test.mjs`

- [ ] **Step 1: 写长页面映射测试**

测试以明确的文件/根类数组逐个读取，断言每个根节点包含 `app-h5-min-screen`，同时断言这些文件没有新增 `app-h5-screen`、`overflow: hidden` 或 H5 固定 `height: 100vh`。`searchPerson.vue` 不在此列表中，因为 Task 5 已明确把它作为全屏内部滚动页面处理。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node --test utils/h5LongPageLayout.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 只给根节点加最小高度契约**

给上述普通页面根节点加 `app-h5-min-screen`。不得给内容列表加 `app-h5-scroll`，不得改变 `onReachBottom`、下拉刷新、分页和表单提交逻辑。

检查原有根节点 padding：如果页面已经包含底部 padding，避免因公共类与局部规则重复造成明显空白；只有固定底栏页面额外保留控件等高占位。

- [ ] **Step 4: 验证并提交**

Run: `node --test utils/h5LongPageLayout.test.mjs && git diff --check`

Expected: PASS。

```bash
git add pages/login/login360.vue pages/my/my.vue pages/my/myFile/myFile.vue pages/searchPerson/personShow/personShow.vue pages/my/myLifeShowEdit/myLifeShowEdit.vue pages/notice/notice.vue pages/notice/interactionMessages.vue pages/account/accountCenter.vue pages/notice/chatRequestReview.vue pages/chat/groupManage.vue pages/chat/groupMembers.vue pages/market/marketList.vue pages/my/myLifeShow/myLifeShow.vue pages/index/index360.vue utils/h5LongPageLayout.test.mjs
git commit -m "fix(h5): add safe minimum height to long pages"
```

---

## Task 8: 完整验证、H5 构建与移动浏览器验收

**Files:**

- Verify: all files changed in Tasks 1–7
- Update only if evidence requires it: affected H5 layout files and their tests

- [ ] **Step 1: 运行全部新增 H5 测试**

Run:

```bash
node --test \
  utils/h5Viewport.test.mjs \
  utils/h5ViewportLayout.test.mjs \
  utils/h5ChatViewport.test.mjs \
  utils/h5FullscreenPages.test.mjs \
  utils/h5FixedBottomPages.test.mjs \
  utils/h5SheetLayout.test.mjs \
  utils/h5LongPageLayout.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 2: 运行现有全量 Node 测试并与基线比对**

Run: `node --test`

Expected: 不出现新的失败文件或失败签名。记录仍存在的历史文案/source-regex 失败，不把它们误报为本次通过，也不在本任务中扩大修复范围。

- [ ] **Step 3: 执行 H5 生产构建**

Run:

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli publish web --project /Users/eliliang/Desktop/workspace/lovesAppFornt
```

Expected: exit code 0；构建产物生成于项目现有 `unpackage/dist/build/web` 目录；无模板、条件编译或 CSS 语法错误。

- [ ] **Step 4: 静态检查构建产物和改动范围**

Run:

```bash
rg -n -- '--app-viewport-height|--app-viewport-bottom-offset|visualViewport' unpackage/dist/build/web
git diff --check
git status --short
```

Expected: H5 产物包含视口运行时和公共变量；源码无空白错误；构建产物是否被 Git 忽略与项目当前规则一致。

- [ ] **Step 5: 在本地/测试环境进行浏览器验收**

在进行需要登录的浏览器操作前，要求用户自行登录，或在操作当时再次确认可以使用其提供的测试账号；不得依赖旧消息中的密码授权直接输入。

至少覆盖 390×844、430×932、412×915 三种竖屏视口，并在 iPhone Safari、iPhone Chrome、Android Chrome、微信内置浏览器各验收一次：

1. 群聊进入后输入栏的底边不超过 `visualViewport.height + visualViewport.offsetTop`；
2. 消息列表连续上下滑动时 `scrollTop` 可变；到顶加载旧消息后视线位置保持；
3. 停在历史消息处等待一次五秒轮询，不自动跳底；发送消息和点击“回到最新”会到底部；
4. 软键盘弹出只压缩消息列表，输入栏仍在键盘上方；收键盘、地址栏展开/收起和横竖屏切换后高度恢复；
5. 动态详情、市场 feed、法律文档可滚到最后内容；
6. 竞拍/找人底栏与首页/生活秀悬浮按钮不被底部工具栏遮挡；
7. 点赞成员、群成员、成员选择、语言、审核、评论弹层的标题/按钮可见，列表独立滚动且背景不跟随；
8. 登录、个人中心、资料编辑、通知、群管理、市场列表仍使用页面原生滚动。

- [ ] **Step 6: 修正验收中发现的本需求回归并重跑对应测试**

每个问题先在对应 `utils/h5*.test.mjs` 增加可复现断言，再做最小修正。重复 Steps 1–5，直到新增 H5 测试、H5 构建和浏览器验收都满足要求。

- [ ] **Step 7: 最终状态检查**

Run:

```bash
git log --oneline -8
git status --short
```

Expected: Tasks 1–7 的提交存在；除用户原有改动和被忽略的构建产物外没有遗漏的实现文件。最终交付中明确列出：新增 H5 测试结果、构建结果、浏览器/真机覆盖情况，以及仍存在的历史全量测试失败。
