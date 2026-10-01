# Bless 项目交接（Mac，本地开发）

更新时间：2026-09-28。本文是当前工作区的交接快照；进程、分支和未提交文件可能在新会话开始前变化。新会话先读本文及 `lovesAppFornt/AGENTS.md`，再按用户的新需求继续。不要把本文当作已经完成端上验收的证明。

## 项目位置

| 项目 | 当前 Mac 路径 | 技术与入口 |
| --- | --- | --- |
| 多端 App 前端 | `/Users/jkliang/Desktop/workspace/lovesAppFornt` | uni-app / Vue，`main.js`、`App.vue`、`pages.json`、`manifest.json`；HBuilderX 运行 H5、微信小程序、iOS、Android。根 `package.json` 没有 `dev` 脚本。 |
| 后端 | `/Users/jkliang/Desktop/workspace/lovesApp` | Express 5 / MySQL，入口 `app.js`；`npm run dev` 为 `nodemon app.js`，当前本地服务由 LaunchAgent 托管 `nodemon`。 |
| 管理后台 | `/Users/jkliang/Desktop/workspace/lovesApp/lovesApp-admin-system` | React / TypeScript / Vite，属于后端 Git 仓库；`npm run dev` 启动 Vite。 |

`/Users/jkliang/Desktop/workspace` 是 Codex 项目目录，本身不是 Git 仓库。App 和后端是两个独立 Git 仓库，目前都在 `dev` 分支。**两边都有大量尚未提交的用户工作和本轮修改，必须保留；不要执行 `reset`、`clean` 或覆盖文件。** 旧交接文档里的 Windows `F:/workspace` 路径已不适用于这台 Mac。

## 用户已确定的工作方式

- 只在 `dev` 分支开发，保留工作区现有修改。
- 当前默认只负责设计和写代码；测试、构建、浏览器/小程序及真机检查由用户负责，除非用户再次明确要求检查。未执行的验证不能写成“通过”。
- App 改动同时考虑 H5、微信小程序、iOS、Android。新增或修改的用户文案需覆盖简体中文、繁体中文、英语、俄语、日语、韩语；不得显示翻译键。
- 前端设计遵循已安装的 Emil Design Engineering skill：`/Users/jkliang/.codex/skills/emil-design-eng/SKILL.md`，以及 `lovesAppFornt/AGENTS.md` 的 Bless 视觉和弹层约定。
- 本地后端由 macOS LaunchAgent `com.lovesapp.backend.dev` 启动 `nodemon`，后端 JS/JSON 文件保存后自动重启。前端的 `127.0.0.1:3000` 仍指向这个本地服务；无需再为普通后端代码改动手动重启。不要另开一个 `node app.js` 抢占 3000 端口。若修改了环境变量或依赖，执行 `launchctl kickstart -k gui/$(id -u)/com.lovesapp.backend.dev`。
- 今后只要本轮工作修改本地后端数据库结构（新增、删除表，或新增、删除、修改字段及相关索引/约束），就由 Codex 同步编写并执行对应 SQL 迁移，无需用户再次提醒。执行前核对目标数据库和现有结构、确认迁移尚未应用并备份受影响数据；执行后检查实际结构和必要的数据结果，并在交付时说明。`nodemon` 只重启代码，不执行数据库迁移；生产数据库不随本地开发自动修改。
- 本轮用户明确：只统一公开展示名，保留个人资料里的原始本名字段及登录邮箱。

## 本地环境快照

- App 的 `lovesAppFornt/utils/config.js` 当前启用 `http://127.0.0.1:3000`。手机上的 `127.0.0.1` 不指向 Mac；真机连本地服务时需按该文件注释改为 Mac 的局域网地址，并遵照用户当时选定的环境。正式打包前应再次核对是否切回线上 HTTPS 地址。
- 后端本地开发服务由 `/Users/jkliang/Library/LaunchAgents/com.lovesapp.backend.dev.plist` 管理，运行 `lovesApp/node_modules/nodemon/bin/nodemon.js app.js`，监听 `3000` 端口。保存后端代码后 `nodemon` 会重启服务，PID 会变化；以 `lsof -nP -iTCP:3000 -sTCP:LISTEN` 和 `launchctl print gui/$(id -u)/com.lovesapp.backend.dev` 查看当前状态。日志：`/Users/jkliang/.local/var/log/lovesapp-backend-dev.log` 和 `.err`。后端仓库的 `nodemon.json` 排除了管理后台、数据库脚本、上传目录等文件。旧的 `com.lovesapp.backend.session` 已移除。
- 后端 `config/db.js` 从 `.env` 读取数据库配置。当前本地配置的非敏感部分为 MySQL `127.0.0.1:3307`、数据库 `myapp`；本文不记录账号或密码。
- 管理后台 `lovesApp-admin-system/vite.config.ts` 的 `/api/admin` 代理目前指向线上 `https://www.lovesapp2026.com`，本地代理选项只是注释。不要因为 App 连本地，就假定管理后台也连本地。

## 手机号登录开发状态

- App 登录页 `pages/login/login360.vue` 已接入手机号登录/首次注册入口，国家地区弹窗在 `components/login/PhoneCountryPicker.vue`。支持搜索、常用地区、右侧 A–Z 点按和滑动跳转；`utils/phoneCountries.js` 包含与后端号码库一致的 245 个国家/地区及六语名称。字母分组交界只保留一条分隔线，修复了用户截图中的双横线空白条。用户要求移除“测试阶段暂不发送简讯”的页面说明，页面没有发送短信按钮或该提示。
- 后端 `GET /api/auth/phone-login-capability` 供前端决定是否显示入口，`POST /api/auth/phone-login` 接收 `countryIso2`、`dialCode`、`phoneNumber`、`code`、`clientSessionId`。固定验证码为 `666666`，仅当本机 `.env` 设置 `PHONE_LOGIN_DEV_ENABLED=true` 且 `NODE_ENV=development` 时开放；默认只允许本机请求，真机调试可在 `PHONE_LOGIN_DEV_ALLOWED_IPS` 明确加入设备 IP。生产环境关闭。当前本机已设置开发开关，代码服务已重载。
- 首次使用手机号会建立独立账号，暂不自动合并既有邮箱账号或 `profiles.mobile` 联系电话。手机号规范化为 E.164，存入 `users.phone_e164`；账号邮箱可为 NULL。短信服务与找回密码仍暂缓。
- 手机号账号在账户中心展示登录手机号；个人资料联系方式页允许不填邮箱，其他账号仍维持原有要求。管理端用户列表/详情展示遮罩后的登录手机号，登录身份不可在管理端修改，查看完整号码继续走已有的带原因审计的敏感资料访问入口。
- 后端迁移 `database/migrations/20260928_01_add_phone_login_identity.sql` 已于 2026-09-28 应用到本地 `myapp`：`users.email` 可空，`users.phone_e164` 有唯一索引。执行前将 `users` 表备份到 `/Users/jkliang/Library/Application Support/BLESS/local-db-backups/users-before-phone-login-2026-09-27T18-13-26-589Z.sql`；执行后核对 3,533 条原记录数量不变。未对线上数据库执行迁移。
- 按用户约定，本轮未运行测试、构建、浏览器、小程序或真机验证；端上效果仍需用户验收。

## 最近完成的展示名修复

用户截图中，同一账号的动态卡片显示 `liangeli`，个人主页显示 `elikun`。根因是资料中本名拼接为 `liangeli`，`en_first_name` 为 `elikun`；原先各接口的优先级不一致。动态仅关联作者 ID，没有保存旧姓名快照，因此无需改历史动态或表结构。

现在公开展示名统一为：优先非空且去空格的 `en_first_name`，再回退完整本名、其他姓名字段。后端规则在 `lovesApp/utils/displayName.js`，App 规则在 `lovesAppFornt/utils/publicDisplayName.js`。涉及精选信息流、探索资料卡、动态详情/评论/回复/点赞/提醒、资料评论 GET 与 POST 回包、会员与财务作者名，以及 App 主页、账号页、搜索、他人资料、成员选择和发布页。管理后台用户详情页标题也采用该规则。精选评论不再把邮箱前缀当公开昵称。原始本名和登录邮箱没有改动，也没有为此执行 SQL。后端已按用户要求重启；本轮未运行测试、构建或端上检查。

## 工作区中的其他未提交功能

以下改动仍在工作区，不应因新任务被丢弃，也不要未经用户要求宣称已验收：

1. **铜会员市场门槛**：古董和二手市场需至少铜会员；低等级列表显示锁定/模糊预览，详情和交易接口受后端限制。相关后端在 `services/marketMembershipService.js`、`routes/market.js`、`routes/marketTrades.js`；App 有 `components/market/MarketLockedCover.vue`、市场列表/详情、精选流和会员升级页改动。
2. **Bless 主题弹层**：`components/common/BlessDialog.vue`、`BlessSheet.vue` 基于 `SlideUpPanel.vue` 接入多个页面；此前曾处理微信小程序 `<page-container>` 多实例错误。不能据此认为全项目旧弹层均已移除。
3. **消息列表与群退出**：列表左滑置顶/删除；删除是按用户隐藏会话，收到新消息后可再出现。群成员申请退出需管理员审核；管理员只看到审核入口，不显示“申请退出群聊”。群管理返回群聊页面。相关 App 文件包括 `components/market/TradeInboxPanel.vue`、`pages/chat/groupManage.vue`、`pages/chat/groupExitRequests.vue`，后端有会话偏好和群退出 controller/service/routes。
4. **数据库迁移文件**：`lovesApp/database/migrations/20260927_01_conversation_preferences_and_group_exit.sql` 新增 `conversation_preferences` 和 `chat_group_exit_requests`。2026-09-27 已在本地 `myapp` 数据库查询，两张表及迁移定义的字段、索引、外键均已存在；本次未重复执行 SQL。以后任何表结构或字段修改仍需单独落库并核验。

## 新会话开始时

先读取本文件、`lovesAppFornt/AGENTS.md`，必要时查看 `lovesAppFornt/docs/handoffs/` 和 `lovesApp/docs/handoffs/` 中较早的背景文档；以当前 Mac 路径、代码和用户最新要求为准。查看两个仓库的 `git status` 后再编辑，并继续保留全部未提交修改。除非用户提出新任务，新会话读取完交接后只需简要确认已接手，不主动改代码或运行验证。
