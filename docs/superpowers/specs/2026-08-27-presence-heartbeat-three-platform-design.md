# 三端在线心跳接入设计

## 目标

在 uni-app 的 App、微信小程序和 H5 端，为已认证用户提供一致的在线状态：在线用户每五分钟上报一次心跳；十分钟未上报则由后端按超时离线处理。在线状态与登录凭证分离，应用重新打开后只要现有 Token 有效即可恢复在线，不要求用户重新登录。

## 现有边界

- 后端已提供 `POST /api/presence/heartbeat` 与 `POST /api/presence/offline`，请求层会从本地 Token 自动发送 `Authorization: Bearer <token>`。
- 当前有效登录页面是 `pages/login/login360.vue`；`pages/login/login.vue` 已废弃，不在本次范围内。
- `App.vue` 已有 `onLaunch`、`onShow`、`onHide` 与 Token 校验恢复流程。
- 本地登录 Token 已保存于 `AUTH_TOKEN`（由 `utils/auth.js` 管理）。

## 方案

新增 `utils/presence.js`，作为三端唯一的在线会话管理器。

### 本地会话标识

- 使用 `uni.getStorageSync` / `uni.setStorageSync` 保存 `clientSessionId`。
- 首次需要上报心跳时生成 UUID 风格随机字符串；同一登录态、同一安装实例复用该值。
- 显式退出账号或认证失效清理本地登录态时，同时移除该值。
- 旧版本已登录用户没有该字段时，首次 Token 校验成功或回到前台时自动补建；不要求重新登录。

### 生命周期

| 时机 | 行为 |
| --- | --- |
| `login360.vue` 邮箱或 Google 新登录请求 | 携带 `clientSessionId`，让服务端在登录成功时创建新会话。 |
| 登录成功 | 保存 Token 后立即启动在线心跳。 |
| `App.vue` 启动且 `/api/auth/validate` 成功 | 使用既有 Token 启动在线心跳，旧用户自动生成会话标识。 |
| `App.vue` `onShow` | 立即补发一次心跳，并启动五分钟间隔。 |
| `App.vue` `onHide` | 停止本地定时器，不发送离线请求、不清 Token。 |
| 用户点击显式退出账号 | 尽力调用离线接口，随后停止定时器并清理 Token、用户资料和会话标识。 |
| Token 无效或心跳返回 401 | 停止心跳；沿用现有认证失效跳转与清理流程。 |
| 心跳返回 `{ started: false, stale: true }` | 停止心跳且不清 Token；该设备不再拥有在线会话，后续正常登录可创建新会话。 |

应用被系统终止或网络中断时，客户端通常不能可靠地执行离线网络请求。因此不在退出/后台时强制调用 `/offline`；后端以最后一次心跳为准，超过十分钟将会话按超时处理。用户下次回到前台时，若 Token 仍然有效，立即心跳并恢复在线。

## 接口契约

### 登录

邮箱登录和 Google 登录在原请求体中新增：

```json
{ "clientSessionId": "稳定的本机登录会话标识" }
```

### 心跳

```http
POST /api/presence/heartbeat
Authorization: Bearer <token>
Content-Type: application/json

{ "clientSessionId": "稳定的本机登录会话标识" }
```

`201 { "started": true }` 表示创建会话；`200 { "started": false }` 表示刷新现有会话；`200 { "started": false, "stale": true }` 表示当前设备失去会话所有权。

### 显式离线

```http
POST /api/presence/offline
Authorization: Bearer <token>
```

仅在用户明确退出账号时使用。调用失败不阻止本地退出；后端超时机制仍会兜底。

## 模块职责

- `utils/presence.js`：会话 ID、心跳请求、计时器、防并发、前后台状态、停止与显式离线。
- `utils/auth.js`：导出/清理会话 ID，并保持 Token 与会话标识一起移除。
- `api/index.js`：登录参数与心跳/离线 API 封装。
- `pages/login/login360.vue`：邮箱/Google 新登录携带会话 ID，成功后启动心跳。
- `App.vue`：认证恢复成功后启动，`onShow` 恢复，`onHide` 暂停。
- `utils/request.js`：认证失效清理时停止并清理 presence；不把 Token 失效错误误当成一次可用的离线请求。

## 错误与幂等性

- 同一时刻最多一个心跳请求；网络失败保留本地登录态并等待下一个前台或五分钟周期重试。
- 重复启动不会叠加定时器。
- `onShow` 在 Token 不存在、恢复校验中或会话已标记 stale 时不发心跳。
- 显式退出使用 best-effort 离线请求：无论请求成功、失败或超时，最终都清理本地登录态。

## 验证

新增纯 JS 单元测试覆盖：会话 ID 持久化、一次性定时器、后台暂停/前台立即恢复、stale 停止、旧登录态自动补建 ID、显式退出清理。现有登录页测试或可执行的模块测试验证邮箱和 Google 请求均携带 `clientSessionId`。

手工三端验收：

1. 旧版本已登录用户升级后打开应用，无需重新登录，后台在 20 秒刷新内显示在线。
2. 前后台切换后在线状态恢复；后台超过十分钟后从在线人数移除。
3. 显式退出账号后在线人数移除且下次进入需要登录。
4. H5、App 和小程序均只保留一个五分钟心跳定时器。
