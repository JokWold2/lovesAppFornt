# 三端在线心跳接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 App、微信小程序和 H5 的已登录用户无需重新登录即可上报在线心跳，并让后端仪表盘可靠统计在线人数。

**Architecture:** 新建无 UI 的 `utils/presence.js` 统一维护持久化的客户端会话 ID、带认证的心跳请求、五分钟定时器、前后台暂停与显式退出。`App.vue` 负责已登录会话恢复和生命周期，`login360.vue` 只负责新登录时携带会话 ID；请求层的认证失效路径负责停止并清除 presence 状态。

**Tech Stack:** uni-app、Vue 3、uni storage/request、Node 内置 test runner。

**Spec:** `docs/superpowers/specs/2026-08-27-presence-heartbeat-three-platform-design.md`

## Global Constraints

- 只修改正在使用的 `pages/login/login360.vue`，不修改废弃的 `pages/login/login.vue`。
- 心跳立即在成功登录、Token 恢复成功与 `onShow` 时发送；仅在前台每五分钟发送一次。
- `onHide` 只停止定时器，不清 Token、不调用离线接口。
- 用户显式退出账号时 best-effort 调用 `/api/presence/offline`，之后总是清理 Token、用户资料和 `clientSessionId`。
- 后端 `stale: true` 时停止心跳，但不清除仍有效的 Token。
- 旧用户缺失 `clientSessionId` 时必须自动生成，不能要求重新登录。
- 不修改用户已有的 `manifest.json`、`.idea/` 或 `static/img/comment.png` 变更。

---

## File Structure

- Create `utils/presence.js`: 跨端会话 ID、心跳 API、前后台计时器与显式离线。
- Create `utils/presence.test.mjs`: 使用 `uni` 与 API 的最小 mock 验证 presence 状态机。
- Modify `utils/config.js`: 声明 `presenceSessionKey`。
- Modify `utils/auth.js`: 公开/清除 presence 会话标识，并让 `clearAuth()` 一并清理它。
- Modify `api/index.js`: 为邮箱/Google 登录传入 `clientSessionId`，导出心跳与离线 API。
- Modify `pages/login/login360.vue`: 两种登录均提供会话 ID，Token 保存后启动心跳。
- Modify `App.vue`: Token 恢复成功、`onShow` 与 `onHide` 连接 presence 生命周期。
- Modify `utils/request.js`: 认证失效时先停止 presence，再按既有行为清理登录态。
- Create `docs/operations/2026-08-27-three-platform-presence-heartbeat.md`: 提供三端部署、验证与排障步骤。

### Task 1: Build the platform-neutral presence state machine

**Files:**
- Create: `utils/presence.js`
- Create: `utils/presence.test.mjs`
- Modify: `utils/config.js`
- Modify: `utils/auth.js`

**Interfaces:**
- Produces: `getOrCreatePresenceSessionId()`, `startPresence()`, `pausePresence()`, `stopPresence()`, `logoutPresence()`.
- Consumes: `getToken()`, `getPresenceSessionId()`, `removePresenceSessionId()`, plus injected heartbeat/offline API methods for tests.

- [ ] **Step 1: Write failing state-machine tests**

```js
test('creates one persistent session ID and reuses it for restored users', async () => {
  const presence = await loadPresence({ token: 'jwt' })
  const first = presence.getOrCreatePresenceSessionId()
  assert.match(first, /^[a-f0-9-]{36}$/)
  assert.equal(presence.getOrCreatePresenceSessionId(), first)
})

test('sends immediately, schedules five minutes, pauses on hide, and restarts on show', async () => {
  const { presence, heartbeat, timers } = await loadPresence({ token: 'jwt' })
  await presence.startPresence()
  assert.equal(heartbeat.calls.length, 1)
  assert.equal(timers.intervals[0].delay, 5 * 60 * 1000)
  presence.pausePresence()
  assert.equal(timers.cleared.length, 1)
})

test('stale stops future heartbeats but explicit logout clears session even if offline fails', async () => {
  const { presence, heartbeat, offline, storage } = await loadPresence({ token: 'jwt' })
  heartbeat.result = { started: false, stale: true }
  await presence.startPresence()
  assert.equal(presence.isPresenceBlocked(), true)
  offline.reject(new Error('network'))
  await presence.logoutPresence()
  assert.equal(storage.PRESENCE_SESSION_ID, undefined)
})
```

- [ ] **Step 2: Run the new tests to verify RED**

Run: `node --test utils/presence.test.mjs`

Expected: FAIL because the presence module and session-key auth helpers do not exist.

- [ ] **Step 3: Implement storage helpers and the state machine**

```js
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000
let timer = null
let inFlight = null
let blocked = false

export async function startPresence() {
  if (!getToken() || blocked) return
  await sendHeartbeat()
  if (!timer && !blocked) timer = setInterval(() => { void sendHeartbeat() }, HEARTBEAT_INTERVAL_MS)
}

export function pausePresence() {
  if (timer) clearInterval(timer)
  timer = null
}
```

Generate the UUID without a browser-only dependency: prefer `crypto.randomUUID()` when present, otherwise create RFC-4122-like hexadecimal groups from `Math.random`. `sendHeartbeat()` must reuse a single in-flight promise, call `heartbeatPresenceApi({ clientSessionId })`, and set `blocked = true` plus `pausePresence()` only for `stale: true`.

- [ ] **Step 4: Run state-machine tests to verify GREEN**

Run: `node --test utils/presence.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add utils/presence.js utils/presence.test.mjs utils/config.js utils/auth.js
git commit -m "feat: add cross-platform presence heartbeat"
```

### Task 2: Connect login, token restoration, lifecycle, and auth expiry

**Files:**
- Modify: `api/index.js`
- Modify: `pages/login/login360.vue`
- Modify: `App.vue`
- Modify: `utils/request.js`
- Test: `utils/presence.test.mjs`

**Interfaces:**
- Consumes: Task 1 exports and `clientSessionId` from `getOrCreatePresenceSessionId()`.
- Produces: New and restored logins automatically become online without user interaction.

- [ ] **Step 1: Write failing integration-oriented tests**

```js
test('login API includes clientSessionId for email and Google requests', async () => {
  const { loginApi, socialLoginApi, post } = await loadApi()
  await loginApi('a@example.com', 'password', { clientSessionId: 'session-a' })
  await socialLoginApi('google', { idToken: 'id-token' }, { clientSessionId: 'session-a' })
  assert.deepEqual(post.calls[0].data.clientSessionId, 'session-a')
  assert.deepEqual(post.calls[1].data.clientSessionId, 'session-a')
})

test('a restored valid Token calls startPresence while hide only pauses it', async () => {
  const app = await loadAppWithPresence()
  await app.onLaunch()
  assert.equal(app.presence.startCalls, 1)
  app.onHide()
  assert.equal(app.presence.pauseCalls, 1)
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test utils/presence.test.mjs`

Expected: FAIL because login API does not accept the third argument and App lifecycle does not invoke presence.

- [ ] **Step 3: Make the integration changes**

```js
export function loginApi(email, password, opts = {}) {
  const { clientSessionId, ...requestOpts } = opts
  return post('/api/auth/login', { email, password, ...(clientSessionId ? { clientSessionId } : {}) }, { noAuth: true, ...requestOpts })
}

export function heartbeatPresenceApi(payload) { return post('/api/presence/heartbeat', payload, { silent: true }) }
export function offlinePresenceApi() { return post('/api/presence/offline', {}, { silent: true }) }
```

In `login360.vue`, create the session ID before each email/Google API call, save the returned token, then call `startPresence()`. In `App.vue`, call `startPresence()` only after successful validation and on `onShow` when a Token exists; call `pausePresence()` in `onHide`. In `logoutAndRedirect`, call `stopPresence({ clearSession: true })` before `clearAuth()`; do not call `/offline` for auth-expiry paths because the credential may already be invalid.

- [ ] **Step 4: Run regression tests and source checks**

Run: `node --test utils/presence.test.mjs && rg -n "clientSessionId|startPresence|pausePresence" App.vue pages/login/login360.vue api/index.js utils/request.js`

Expected: PASS and matches in exactly the active login page, API module, App lifecycle, and request expiry handler.

- [ ] **Step 5: Commit Task 2**

```bash
git add api/index.js pages/login/login360.vue App.vue utils/request.js utils/presence.test.mjs
git commit -m "feat: report foreground presence from uni app"
```

### Task 3: Deliver client operations documentation and verify three-platform behavior

**Files:**
- Create: `docs/operations/2026-08-27-three-platform-presence-heartbeat.md`
- Test: `utils/presence.test.mjs`

**Interfaces:**
- Consumes: final presence APIs and lifecycle behavior from Tasks 1–2.
- Produces: operator/developer runbook for App, Mini Program, and H5 validation.

- [ ] **Step 1: Write the deploy and verification document**

Document exact API paths, authentication header ownership, session ID storage key, five-minute/ten-minute rules, restored-user behavior, `stale: true` handling, and the following manual test matrix:

| Scenario | Expected dashboard result |
| --- | --- |
| Existing valid Token opens App/Mini Program/H5 | online count rises after next dashboard refresh; no login screen |
| Frontground after short background | online count remains/returns after immediate heartbeat |
| Background over ten minutes | count falls after server expiry processing |
| Explicit account exit | offline is attempted, local Token/session ID are removed |
| Newer login from another device | older device stops heartbeats after `stale: true` |

- [ ] **Step 2: Run final client verification**

Run: `node --test utils/*.test.mjs api/*.test.mjs pages/**/*.test.mjs components/**/*.test.mjs`

Expected: PASS. If shell glob expansion does not include recursive paths on the host, run the listed test files through `find ... -name '*.test.mjs' -print0 | xargs -0 node --test`.

- [ ] **Step 3: Run whitespace and scope checks**

Run: `git diff --check && git status --short`

Expected: no task-owned uncommitted files; preserve existing `manifest.json`, `.idea/`, and `static/img/comment.png` user changes.

- [ ] **Step 4: Commit Task 3**

```bash
git add docs/operations/2026-08-27-three-platform-presence-heartbeat.md
git commit -m "docs: add three-platform presence runbook"
```

## Plan Self-Review

- Spec coverage: Task 1 covers persistence, interval, stale, best-effort exit, and old-user session creation; Task 2 covers the active login page, existing Token restoration, lifecycle and auth expiry; Task 3 covers runbook and the App/Mini Program/H5 manual matrix.
- Placeholder scan: no TBD/TODO/incomplete implementation markers; every task specifies paths, interfaces, commands, tests, and commits.
- Type consistency: Task 1 exports are used identically in Task 2; API argument names use the server’s required `clientSessionId`; the storage key is added in Task 1 before its consumers use it.
