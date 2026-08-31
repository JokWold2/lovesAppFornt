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
