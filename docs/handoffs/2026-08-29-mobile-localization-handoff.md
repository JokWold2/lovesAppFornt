# LovesApp 移动端语言切换交接

更新时间：2026-08-29

## 目标与规则

- 移动端支持 `zh-Hans`、`zh-Hant`、`en`、`ru`、`ja`、`ko`。
- 自动选择优先级：用户手动选择 > 系统语言 > 后端根据 IP/城市解析的地区 > 英语。
- 用户明确要求默认英语；中国大陆简中，港澳台繁中，美国英语，俄罗斯俄语，日本日语，韩国韩语。
- 后端保存原始 IP 至城市级别，长期保存；仅超级管理员可查看。该管理端权限与展示仍待接手确认。
- 用户原始资料、动态、商品标题/描述等内容不翻译；只翻译界面标签、按钮、空状态和提示。

## 当前仓库与分支

- 前端：`/Users/eliliang/Desktop/workspace/lovesAppFornt`
- 后端：`/Users/eliliang/Desktop/workspace/lovesApp`
- 当前前端分支：`main`
- 用户要求直接在 `main` 开发、暂不提交。
- 工作区已有多项先前功能改动；不得重置、覆盖或清理无关改动。

## 已实现的核心能力

### 语言运行时

- `utils/locale.js`：六语消息、地区映射、`resolveLocale`、`translate`。
- `utils/localeState.js`：纯状态层，保存手动选择，启动时恢复并解析最终语言。
- `utils/localeRuntime.js`：uni-app 存储适配、系统语言读取、tabBar 文案刷新。
- `main.js` 初始化运行时并提供 `$t`；`App.vue` 在 token 校验成功后调用 `bootstrapLocale()`。
- `api/index.js` 已增加 `getLocaleBootstrapApi`、`saveLocalePreferenceApi`。

### 已覆盖页面/组件

- 首页精选和祝福流：`pages/index/index360.vue`。
- 登录：`pages/login/login360.vue`、`pages/login/login.vue`；旧登录页的隐私政策文字可跳转。
- 账号中心：`pages/account/accountCenter.vue`，含手动语言选择。
- 消息、群聊、在线成员、已读成员、成员选择：`pages/notice/*`、`pages/chat/*`、`components/chat/*`。
- 朋友圈详情、发布、个人动态：`pages/moments/`、`pages/my/myLifeShow*`。
- 市场与搜索候选人：`pages/market/*`、`pages/searchPerson/*`。
- 个人资料展示、相册和收到点赞弹层：`components/profile/*`。
- 古董与拍卖列表/详情：`pages/index/components/Antiquecollection.vue`、`Auctionactivity.vue`、`pages/index/auctionDetail.vue`。
- 四步资料填写页刚开始接入：`pages/my/myFile/myFile.vue`；第一、二步已有一部分标题/字段，尚未完成。

## 后端相关实现（需复核）

此前已新增或修改下列语言/定位相关文件：

- `database/migrations/20260828_02_create_user_locale_and_location_history.sql`
- `services/locationResolver.js`
- `controllers/localeController.js`
- `routes/locale.js`
- `app.js` 挂载 `/api/locale`

需优先复核：`x-forwarded-for` 的信任边界应与 Express `trust proxy` 配置一致，不能无条件信任客户端伪造头。

## 尚未完成

1. **四步资料填写页** `pages/my/myFile/myFile.vue`
   - 四步的大量静态标签、按钮、占位文本及显示枚举尚未全部翻译。
   - 请求 payload 的枚举值必须保持现有原始值；只能翻译显示层。
2. **协议正文**
   - `utils/legalDocuments.js` 仍为中文正文，`pages/legal/*` 使用该内容。
   - 法律文本应由运营/法务提供或校对正式繁中、英、俄、日、韩版本；不要将未经确认的机器翻译直接作为正式协议上线。
3. **旧版/边缘页面**
   - `pages/index/index.vue` 与若干旧表单页还留有固定中文文案。
   - 使用 `rg -l "[\\u4e00-\\u9fff]" pages components` 排查，但需要区分注释、用户内容、后端枚举和值得翻译的 UI 文案。
4. **消息包完整性**
   - `utils/locale.js` 目前通过多个消息对象合并到 `profileMessages`；可逐步整理成领域更清晰的对象，但不要破坏现有 `t('profile.*')` 调用。
5. **真机验证**
   - 分别切换六种语言，检查 tabBar、长文案换行、弹层、picker 和日期/金额格式。
6. **管理端与 IP 权限**
   - 复核管理员端是否真的仅允许超级管理员读取原始 IP/城市历史；当前尚未在本轮完成端到端验证。

## 最近验证

前端工作目录运行：

```sh
node --test utils/locale.test.mjs utils/localeState.test.mjs utils/chatRequestState.test.mjs utils/searchPresentation.test.mjs utils/groupMemberSheetState.test.mjs
git diff --check
```

最近结果：10/10 通过，`git diff --check` 通过。Node 会输出 `MODULE_TYPELESS_PACKAGE_JSON` 警告；它不是测试失败，暂未修改 `package.json`。

## 接手建议顺序

1. 完成 `pages/my/myFile/myFile.vue`，每完成一段就跑语言键检测与 `git diff --check`。
2. 清理旧版首页与可访问页面的 UI 固定文案。
3. 等正式协议译文后，把 `utils/legalDocuments.js` 改为按 locale 返回文档。
4. 复核后端 `/api/locale` 与代理头安全边界、管理端原始 IP 权限。
5. 运行完整测试并用 HBuilderX/真机切换六种语言验收。

## 注意事项

- 不要执行 `git reset --hard`、`git checkout --` 或删除未跟踪文件。
- 不要提交代码，除非用户另行要求。
- 只使用 `apply_patch` 编辑文件。
- 本线程的 5 分钟自动续作任务当前处于启用状态；接手任务完成后应停止它，避免继续唤醒。
