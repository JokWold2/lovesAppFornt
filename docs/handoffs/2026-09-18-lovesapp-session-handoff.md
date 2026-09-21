# LovesApp 会话交接（2026-09-18）

## 1. 接手时先看

本次用户要求：整理本会话交接文档，并新开会话继续交流。**目前没有新增开发或发布任务；新会话先读取本文、确认接手，等待用户下一步。** 不要因交接自行提交、合并、发布或重复修改数据库。

最近一项任务已完成：消息页底部白色背景、旧群聊恢复显示。旧数据仍在服务器，群聊消失的直接原因是微信编译后的前端变量遮蔽错误，已修复并在现有登录账号的微信模拟器中看到原群聊及旧消息摘要。此次没有执行数据库恢复、重建群聊或删除数据。

**最新修复尚未重新上传微信体验版。** 已上传过的体验版为 1.0.5，上传之后还有消息页间距、背景、群聊加载等修复；不能把手机当前体验版当作最新源码。

## 2. 工作区、分支与未提交工作

工作区是 `F:/workspace`，它本身不是 Git 仓库，内部有两个独立仓库：

| 工程 | 路径 | 当前分支及 HEAD |
| --- | --- | --- |
| uni-app 前端 | `F:/workspace/lovesAppFornt` | `dev` / `3b5afb11fae35fdc47db71e057e7bab4d14a226c` |
| Express 后端及管理后台 | `F:/workspace/lovesApp` | `dev` / `6b580a4351bf1e138f65325e0289aa1d05b2dadd` |
| React 管理后台 | `F:/workspace/lovesApp/lovesApp-admin-system` | 随后端仓库 |

2026-09-18 只读核对，没有 fetch：

- 前端 dev 与已有 origin/dev 一致；dev 比 main 多 1 个提交。**此外有大量尚未提交的完整功能工作**：文档创建前 28 个已跟踪修改、43 个未跟踪条目（含目录）。本文会再增加一个未跟踪文件。
- 后端 dev/main/origin/dev/origin/main 的已有引用均指向 `6b580a4`。
- 后端唯一未提交文件是 `lovesApp-admin-system/vite.config.ts`，属于本地配置，保留，不顺手提交。
- 不执行 reset/clean，不覆盖未跟踪组件。源码直接在当前 dev 工作区内；新会话应继续使用本地项目，另起干净 worktree 会漏掉未提交实现。
- 下一次提交前重新核对两仓库状态；不要依赖本文中的条目数判断是否有新增修改。

## 3. 当前接口与运行状态（尤其注意）

**交接时源码 `F:/workspace/lovesAppFornt/utils/config.js` 当前启用 `http://127.0.0.1:3000`，线上地址被注释。** 不要擅自更改用户现在的调试选择。

但上次验证通过的隔离微信构建 `F:/workspace/.lovesapp-runtime/build-check/message-group-fix-20260917/mp-weixin/utils/config.js` 使用 `https://www.lovesapp2026.com`，实际群聊恢复是在这个公网构建上验证的。源码环境与历史构建环境不同是现状，重新构建/发布前必须核对，手机中的 127.0.0.1 不指向开发电脑。

本次交接只读端口检查：3000、3307 正在监听；5173、5174 没有监听。不要照抄旧会话 PID，也不要声称 H5 仍在运行。旧的运行说明 `F:/workspace/.lovesapp-runtime/README.md` 包含历史端口安排，可能过时。

- 本地启动辅助目录：`F:/workspace/.lovesapp-runtime`。
- 本地启动入口：`Start-LovesApp.ps1`、`start-h5.cjs`、`start-admin.mjs`；运行前先读配置并检查端口。
- 后端、数据库连接凭据留在已有本地配置里，本文不复制 Token、密码、完整请求头或个人资料。

## 4. 用户已经明确的业务与设计规则

这些是已确认需求，后续修改应继续保留：

- 在 dev 开发，不在 main/master 直接开发；保留其他人的修改。
- 六语言：简体中文、繁体中文、英语、俄语、日语、韩语。UI 文案与选项做语言适配；**资料数据按后端返回原文展示，前端提交什么语言的文本就存什么，不做数据库多语言结构。**
- 使用 Emil 设计工程规范：`C:/Users/Administrator/.codex/skills/emil-design-eng/SKILL.md`；前端仓库 `AGENTS.md` 已记录跨端、视觉和动效约定。
- 统一白色、暖灰、主题黄色；兼顾触控面积、窄屏、长语言和减少动画偏好。H5/微信/App 同时考虑，构建成功不等于 iOS/Android 真机已验证。
- 弹层从下向上展开、向下收起，遮罩淡入淡出，退出动画完成再卸载；取消、确认、系统返回及嵌套弹层都遵循。
- 铁/铜/银/金会员中 L0 取消；铜/银/金为 20/50/100 美元，一次购买永久有效，升级补差价。用户提交申请，管理员确认收款后开通，没有在线支付流程。
- 撤回最近一次卡片操作退还已消耗的点赞额度，消耗的撤回额度不返还；撤回点赞不自动解散已有群聊。
- 申请私聊区分尚未点赞与单向点赞：未点赞先提示点赞，只有一方点赞则提示等待对方。
- 点赞 tab 角标不是打开 tab 就清除：银会员及以上实际查看点赞者详情才清掉该人未查看状态，未查看卡片有红点。互动消息已读独立统计，进入互动消息页后清除互动角标。数字超过 99 显示 99+。
- 从祝福资料详情返回，不刷新掉原列表/卡片位置；资料详情采用可向下收起的资料层。

## 5. 本轮累计完成的前端功能范围

以下主要实现仍在前端未提交工作区中，不要只迁移最新一个 notice.vue：

### 5.1 个人资料与照片

- 资料详情改为大照片、分组白色卡片、底部操作区，保留现有字段和业务功能；自我介绍用引用图标，会员页品牌 LOVES 改 BLESS。
- “我的动态”和“个人资料”分开，默认先个人资料；底部 tab 改个人资料与对应图标。原“赞过我的资料”入口跳转点赞 tab；资料页不保留原搜索按钮。
- 顶部头像与照片叠放，最多两张，默认头像兜底；提供资料未完善提示和完善度。
- 我的照片支持概览、网格管理、选中照片编辑、更换、删除，以及从手机相册上传/拍照；不加入参考图中的 AI 照片模块。
- 编辑入口、分组编辑弹层、保存、取消及动画；不展示单选/多选提示、不显示选中勾，单选再次点击可取消。
- 学历含初中；职业、信仰生活、期望对方信仰生活为文本；双手交握为左手/右手。协助者邮箱编辑时可见完整值，资料展示继续脱敏，不添加解释性敏感信息文案。
- 国家/语言选项目录和国旗资源；签名标签使用“签名”。资料编辑数据保存既有文本规则。

重点文件：

- `components/common/SlideUpPanel.vue`
- `components/profile/ProfileDetailView.vue`、`ProfileDetailSheet.vue`、`ProfileDetailSections.vue`
- `components/profile/ProfileEditor.vue`、`ProfileEditorWorkspace.vue`
- `components/profile/ProfilePhotoManager.vue`、`ProfilePhotoWorkspace.vue`、`ProfilePhotoGallery.vue`
- `components/profile/ProfileCatalogPicker.vue`、`ProfileCountryFlag.vue`
- `utils/profileEditorModel.js`、`profileEditorMessages.js`、`profileCatalog.js`、`profileCatalogData.js`
- `utils/useProfileDetailSheet.js`、`utils/likesTabIntent.js`
- `pages/my/myLifeShow/myLifeShow.vue`、`pages/index/index360.vue`、`pages/likes/likes.vue`
- `docs/superpowers/plans/2026-09-17-{moments-hub,profile-editor,profile-photos,profile-catalog-result}.md`
- `docs/profile-catalog-sources.md`、来源校验及许可证文件。

以上相对路径均相对于 `F:/workspace/lovesAppFornt`。前期设计预览在 `.lovesapp-runtime/moments-design-preview`、`profile-edit-design`，不是线上运行页面。

### 5.2 消息页

- 上方“新的点赞”：首卡为收到的点赞入口，银会员以下使用受保护预览；后面的卡片只展示互相点赞的人，照片清晰，点击打开既有资料层。
- 下方“互动消息”使用白色火焰图标、主题黄色背景；保留群聊、消息摘要、未读计数、管理审核入口及搜索。
- 去掉重复的原生导航栏，保留微信安全区/胶囊位置；缩小标题、点赞区与消息列表间距。
- 重试按钮视觉约 32px 高，外层触控区域至少 44px，文字水平和垂直居中，六语言窄屏可换行。
- 消息面板背景纯白，底部导航栏及安全区后方同为白色，上方仍保留暖灰。

重点：`pages/notice/notice.vue`、`utils/messageLikesState.js`、`utils/messageInboxMessages.js`、`components/navigation/LiquidGlassTabBar.vue`。

## 6. 最近故障：群聊“消失”的确定根因与修复

### 6.1 证据

微信控制台报 `Cannot read property 'getNotificationsApi' of undefined`，同时 Network 没有 chat-groups 请求。

微信实际二次编译产物把异步 load 后半段的块级局部变量提升成函数级 `var a`，遮住外层通知 API 导入变量 `a`。于是首个 `a.getNotificationsApi(...)` 就抛错，后续群聊请求也没有运行。

- 不是群聊数据被删除，也不是会员等级/互赞筛选把群过滤了。
- 后端群接口仍是按当前用户群成员关系读取，返回 `{ groups }`；没有改变聊天数据表、群接口过滤契约或删除旧群。
- 隔离执行真实微信编译函数可重现 0 次群请求；仅修正遮蔽的对照版本会发请求并展示旧群。
- 根因片段：`F:/workspace/.lovesapp-runtime/wechat-babel6-audit/notice-wechat-shadow-proof.txt`。目录名是调查过程遗留，实际出错缓存使用 Babel 7 runtime，不能因此断言是 Babel 6。

### 6.2 已完成修复

- `load()` 改为普通 Promise 调度函数；未读摘要提取为独立同步函数 `applyUnreadSummary()`，隔离局部作用域，避免微信 async 转译冲突。
- 通知、群聊、审核、未读摘要各自收到响应就更新，任何其他慢请求不再阻塞群聊展示。
- 请求同步抛错也不会阻断其他请求；失败显示错误，保留之前成功加载的群列表。
- 群数据必须包含数组 `groups`；无效响应不冒充正常空列表清掉旧内容；合法 `groups: []` 可以更新为空。
- 保留页面隐藏、卸载和账号切换的过期响应隔离，也不新增已读确认请求。
- 消息页根容器不再承担灰色底部占位，改由白色消息面板承担 tabbar 与安全区留白。

### 6.3 实际验证

2026-09-17 修复后重新编译既有微信开发者工具项目，使用原登录状态和公网接口：

- 消息页出现原“沟通群聊”等多个历史群及旧消息摘要、日期。
- Network 恢复 chat-groups 正常缓存响应（304），页面成功拿到数据；不是把异常伪装成空列表。
- 新微信实际编译缓存中已无原变量遮蔽。
- 未打开群聊触发额外已读操作，未恢复/修改数据库。

## 7. 后端互赞 400 的处理与发布边界

前一个问题 `GET /api/blessings/likes?direction=mutual` 返回 400 / INVALID_REQUEST / 点赞方向无效，原因是支持 mutual 的后端改动当时还未进入已推送代码。

已完成：

1. 后端提交 `757430e`：互赞列表、资料编辑/照片等已授权改动。
2. 合并远端主线用户的需求大厅改动 `3903d91`，得到 `6b580a4`。
3. 后端 dev 和 main 已推送到 `6b580a4`，当前工作区回到 dev。
4. 合并后后端相关 144 项测试通过；没有提交管理后台本地 Vite 配置。

互赞契约为 `{ items, total, hasMore }`，只包含真实双向点赞的有效成员，所有会员级别均可看清互赞用户；收到的单向赞仍走银会员隐私门槛。此次 mutual 接口无需数据库迁移。

详情：`F:/workspace/.lovesapp-runtime/message-redesign-backend-report.md`、`backend-mutual-postmerge-tests.log`。

曾尝试用 Chrome 中的服务器控制台继续发布，但 Computer Use 无法确认浏览器 URL 而阻止操作，未绕过。用户后来运行的微信公网互赞请求已不再报 400，但**没有读取线上 Git SHA/PM2 状态，因此不要宣称已由助手验证完整线上部署。** 以后要发布后端，先核实实际仓库路径与进程名；历史用户提过 mybackend/my-backend，不要猜路径或重启无关进程。

## 8. 验证记录与构建目录

最新修复的验证：

- 前端 Node 测试：239/239 通过（`tests/*.test.mjs` 加 `pages/notice/notice.test.mjs`）。
- 新增消息加载回归：14/14，包括慢请求、同步错误、失败保留列表、合法空列表、异常格式、隐藏/卸载/跨账号隔离。
- 真实 H5 运行的隔离接口浏览器回归：11/11，包括六语言 320px、互赞、资料层返回、独立已读、群摘要/搜索、管理员入口、错误恢复。
- H5、微信、App 三种构建成功。微信有现存 `utils/pushNotifications.js:16` 鸿蒙识别兼容提醒。
- 已验证微信开发者工具中的真实群列表；没有把浏览器模拟/编译结果当作 iOS、Android 真机验证。

路径：

- `F:/workspace/.lovesapp-runtime/build-check/message-group-fix-20260917/`
  - `check.cjs`、`run.cjs`：隔离构建脚本，平台参数 h5 / mp-weixin / app。
  - `h5.log`、`mp-weixin.log`、`app.log` 与对应产物目录。
  - `sync-wechat.ps1`：校验目标目录、备份、保留私人项目设置并同步构建，随后逐文件比对哈希。
- `F:/workspace/.lovesapp-runtime/message-group-fix-qa/report.json`：浏览器报告；`errors=[]`、`unexpectedWrites=[]`。
- 同目录有 `empty-inbox.png`、`bronze-inbox.png`、`error-inbox*.png` 等视觉证据。
- `F:/workspace/lovesAppFornt/tests/message-inbox-loading.test.mjs`
- `F:/workspace/lovesAppFornt/tests/message-inbox.browser.cjs`

构建使用已安装 HBuilderX 5.24 编译器，脚本内有资源上限与 4 分钟超时。机器曾出现微信工具内存不足，建议同时只跑一个重型构建/浏览器检查。不要沿用旧进程 ID。

## 9. 微信体验版与下次发布

- 上次成功上传：**1.0.5**，官方 CLI 返回成功，包体 1,837,709 字节（约 1.8MB）。证据：`F:/workspace/.lovesapp-runtime/wechat-trial-20260917-upload.json`；该文件只有大小，版本号取自当时上传操作记录。
- 当时工具提示原上传记录已设为体验版，新上传替换该记录。不能仅凭此断言之后的新本地构建已发布。
- 原 GUI 上传出现过 Out of Memory；官方 CLI 上传成功。可以优先使用现有工具/CLI，不必重复打开开发者工具。
- 现有工具项目：`F:/workspace/lovesAppFornt/unpackage/dist/dev/mp-weixin`。
- 官方 CLI：`C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat`。
- **最新白底和群聊修复只在本地构建/工具中验证，未再次上传体验版。**
- 下次用户要求发布时：确认源码/构建实际接口地址，确认完整未提交工作与构建一致，检查包体，上传后记录新的版本与成功证据。不要用本地接口包覆盖手机体验版。

## 10. 新会话工作约定

1. 先读本文及 `F:/workspace/lovesAppFornt/AGENTS.md`，再分别检查两仓库状态。
2. 本轮请求是交接与新会话；先确认接手，等用户继续，别自动开始部署。
3. 用户在手机端时，设计图需要真正显示到消息中；只给本地 HTML 链接或声称“图片已发”不够。图片用绝对路径嵌入，并如实确认展示方式。
4. 用户不喜欢重复确认已经授权的事项；按明确范围推进。数据库真实数据、发布版本、账号与环境必须先核实，不把推测当事实。
5. 旧交接文档里 macOS 路径、main 开发方式及旧失败数量均为历史记录，以当前 Windows 工作区和本文新证据为准。
6. 本文不包含任何登录凭据。此前提到的重置卡是历史授权记录，不因新开会话就重复兑换；若有明确额度问题，按当前账号工具状态处理。

交接文档创建过程仅进行只读状态核对和本文写入，没有提交、合并、上传、启动/停止服务或修改业务数据。
