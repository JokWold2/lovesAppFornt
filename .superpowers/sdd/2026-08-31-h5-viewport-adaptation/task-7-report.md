# Task 7 报告：普通长页面最小高度适配

## RED/GREEN

- RED：新增 `utils/h5LongPageLayout.test.mjs` 后运行 `node --test utils/h5LongPageLayout.test.mjs`，因页面根节点尚未包含 `app-h5-min-screen` 失败。
- GREEN：为简报列出的 14 个页面根节点补充 `app-h5-min-screen` 后，目标测试通过（1/1），`git diff --check` 通过。

## 文件映射

以下根节点均保留原业务类并追加 `app-h5-min-screen`：login360、my、myFile、personShow、myLifeShowEdit、notice、interactionMessages、accountCenter、chatRequestReview、groupManage、groupMembers、marketList、myLifeShow、index360。

## 既有类保留核对

- `myLifeShow.vue` 的 `fab-container app-h5-fixed-bottom` 保留。
- `index360.vue` 的 `fab-button app-h5-fixed-bottom` 保留。
- `accountCenter.vue` 的 language sheet mask/sheet/scroll 类保留。
- `chatRequestReview.vue` 的 reject sheet mask/sheet/textarea scroll 类保留。
- 未新增 `app-h5-screen` 或普通页面列表滚动契约；未新增固定 `height: 100vh`、overflow 隐藏或底栏占位。

## 测试与自审

- `node --test utils/h5LongPageLayout.test.mjs`：PASS。
- `git diff --check`：PASS。
- 变更仅为根节点 class 与映射测试；未修改 `onReachBottom`、下拉刷新、分页、表单提交或原有 padding。

## 顾虑

部分页面已有局部 `min-height: 100vh` 与组件级 `overflow: hidden`，本任务未调整，避免扩大范围；公共类通过 `box-sizing: border-box` 处理安全区 padding。

## 修复轮次 1

- RED：重写映射测试，绑定模板真实根节点与对应 scoped 根规则；旧样式未隔离时测试失败（login 根 fallback 未置于 H5 条件内）。
- 修复：14 个根样式的 `min-height: 100vh` 改为非 H5 fallback；登录根 `overflow: hidden` 限制为非 H5；padding shorthand 页面在 H5 规则中显式合并 `env(safe-area-inset-bottom)`，保留原业务底部空间。
- 覆盖：测试验证根类、fallback 条件、H5 覆盖及 safe-area padding，并保留 fixed-bottom/sheet 既有契约。
- 命令：`node --test utils/h5LongPageLayout.test.mjs utils/h5ViewportLayout.test.mjs utils/h5FixedBottomPages.test.mjs utils/h5SheetLayout.test.mjs`（13/13 PASS）；`git diff --check`（PASS）。

## 修复轮次 2

- RED：测试改为解析 template 后第一个真实根 view，并检查 scoped 根规则；当前 `groupManage`、`chatRequestReview`、`marketList` 的 H5 `min-height: initial` 被明确捕获。
- GREEN：移除上述三个 H5 根级 `min-height`，仅保留必要的 safe-area `padding-bottom`；非 H5 `min-height: 100vh` fallback 保留。
- 测试：四组目标测试共 13/13 PASS；`git diff --check` PASS。

## 修复轮次 3

- RED：新条件归属测试先运行失败，首个具体失败为 `pages/login/login360.vue` 根 fallback 未在可提取的 `#ifndef H5` block 中；随后暴露三页无条件根 `min-height:100vh`。
- GREEN：14 页均增加明确的非 H5 根 fallback block；`groupManage`、`chatRequestReview`、`marketList` 的 base 根规则移除 `min-height`，H5 规则仅保留 safe-area padding。
- 测试命令：`node --test utils/h5LongPageLayout.test.mjs utils/h5ViewportLayout.test.mjs utils/h5FixedBottomPages.test.mjs utils/h5SheetLayout.test.mjs`，13/13 PASS；`git diff --check` PASS。

## 修复轮次 4

- 根因：b7f5674 将 `groupManage`、`chatRequestReview`、`marketList` 的整个根业务规则移入 `#ifndef H5`，H5 因而丢失原有 background、padding 及 groupManage 的 box-sizing/color；旧测试又只剔除非 H5 block，并只禁止无条件 `min-height:100vh`，未覆盖其他根锁滚声明。
- RED：增强测试后运行 `node --test utils/h5LongPageLayout.test.mjs`，实际输出为 `tests 2`、`pass 1`、`fail 1`；失败断言为 `pages/chat/groupManage.vue must keep an unconditional root rule`。
- 修复：三页无条件 root 恢复 c4c0153 的跨端业务属性且不含 height/min-height/overflow hidden；各自 `#ifndef H5` root 仅保留 `min-height:100vh`，`#ifdef H5` root 仅用后置 `padding-bottom` 合并原业务底部 padding 与 safe-area。
- 覆盖：测试会先剔除全部 `#ifdef H5`/`#ifndef H5` blocks，再逐个检查无条件 root rule；同时逐个检查 H5 block 内 root rule，明确禁止 `height`、`min-height`、`overflow:hidden`，且不扫描局部非根组件。另以独立属性断言锁定三页关键业务样式和条件块归属，未复制整块 CSS。
- GREEN 命令：`node --test utils/h5LongPageLayout.test.mjs utils/h5ViewportLayout.test.mjs utils/h5FixedBottomPages.test.mjs utils/h5SheetLayout.test.mjs`。
- GREEN 实际输出：`tests 14`、`pass 14`、`fail 0`、`cancelled 0`、`skipped 0`、`todo 0`；`git diff --check` 退出码 0、无输出。
