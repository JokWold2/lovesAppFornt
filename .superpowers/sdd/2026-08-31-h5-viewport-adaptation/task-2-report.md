# Task 2 报告：建立公共 H5 页面布局契约

## 实现

- 在 `App.vue` 的 `/* #ifdef H5 */` 条件块内新增六个公共布局类：`.app-h5-screen`、`.app-h5-min-screen`、`.app-h5-scroll`、`.app-h5-fixed-bottom`、`.app-h5-sheet-mask`、`.app-h5-sheet`。
- 为固定视口、最小屏高、内部滚动、底部固定元素和底部 Sheet 接入 `--app-viewport-height`、`--app-viewport-bottom-offset` 与 `env(safe-area-inset-bottom)`。
- 高度声明按 `vh`、`dvh`、CSS 变量回退顺序排列；未给 `body` 或 `uni-page-body` 添加全局 `overflow: hidden`。

## RED/GREEN 证据

- RED：首次运行 `node --test utils/h5ViewportLayout.test.mjs`，1 项失败，断言明确指出 `.app-h5-screen` 尚不存在；全局滚动保护断言通过。
- GREEN：添加契约后运行同一命令，2 项测试通过、0 项失败。
- `git diff --check` 通过，无空白错误。

## 文件清单

- `App.vue`：新增仅 H5 生效的公共布局 CSS 契约。
- `utils/h5ViewportLayout.test.mjs`：新增公共类、变量、safe-area 与全局滚动限制测试。

## 自审

- 所有新增样式均位于 H5 条件编译块中。
- `.app-h5-screen` 仅在显式使用该类时隐藏自身溢出；普通页面没有被强制禁用原生滚动。
- 测试读取 `App.vue` 源码，确保契约不会因条件块遗漏而静默失效。

## 顾虑

- 本任务未迁移具体页面；调用方后续需按页面结构选择 screen/min-screen/scroll 等类。
- CSS `dvh` 与变量回退依赖运行环境对相应语法的支持，声明顺序已保留旧浏览器的前一条有效声明。
