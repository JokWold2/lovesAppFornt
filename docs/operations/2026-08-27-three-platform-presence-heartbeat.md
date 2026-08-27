# Three-platform presence heartbeat runbook

Use this runbook to deploy and validate authenticated online presence in the uni-app App, WeChat Mini Program, and H5 builds. The client uses the same lifecycle manager on all three platforms; validate each built artifact because background behavior and network inspection differ by platform.

## API contract and request ownership

The configured API base URL is `http://8.218.94.132`. Paths below are relative to that base URL.

| Operation | HTTP request | JSON body | Authentication and ownership | Successful response |
| --- | --- | --- | --- | --- |
| Email login | `POST /api/auth/login` | `{ "email", "password", "clientSessionId" }` | `noAuth: true`; do not send `Authorization` | Login response containing the Token |
| Google login | `POST /api/auth/social-login` | `{ "provider", "authResult", "clientSessionId" }` | `noAuth: true`; do not send `Authorization` | Login response containing the Token |
| Validate restored login | `GET /api/auth/validate` | none | The shared request layer reads `AUTH_TOKEN` and adds `Authorization: Bearer <token>` | `{ "valid": true, "user": ... }` |
| Presence heartbeat | `POST /api/presence/heartbeat` | `{ "clientSessionId": "<stable local ID>" }` | `heartbeatPresenceApi()` calls the shared request layer, which owns `Authorization: Bearer <token>` and `Content-Type: application/json;charset=utf-8` | `201 { "started": true }` for a new session, or `200 { "started": false }` for refresh |
| Explicit offline | `POST /api/presence/offline` | `{}` | `offlinePresenceApi()` calls the shared request layer, which owns `Authorization: Bearer <token>` and `Content-Type: application/json;charset=utf-8` | Any successful 2xx response |

Do not duplicate the authorization header in a page or lifecycle hook. `utils/request.js` attaches it from local storage unless the request is explicitly `noAuth`. The actual header value must be `Authorization: Bearer <AUTH_TOKEN>`; do not log the Token while debugging.

## Session and timing rules

- `PRESENCE_SESSION_ID` is the local-storage key for `clientSessionId`. It is generated as a UUID-shaped value only when needed, then reused for the current local login session.
- A successful new email or Google login gets/creates this ID, sends it with the login request, saves the returned Token, then starts presence.
- When an already-authenticated user opens the App, Mini Program, or H5 build, `/api/auth/validate` must succeed before presence starts. An older installation with a valid `AUTH_TOKEN` but no `PRESENCE_SESSION_ID` creates the ID automatically; it must not show a login screen solely for that reason.
- Start and foreground resume send a heartbeat immediately, then maintain one five-minute interval. Repeated starts must not create more than one timer; at most one heartbeat may be in flight.
- Hiding/backgrounding pauses the local timer only. It does not call `/api/presence/offline` and it does not clear Token or session ID.
- The server treats ten minutes without a successful heartbeat as offline. A terminated app or lost network may therefore remain represented as online until server expiry processing runs.
- A heartbeat response of `200 { "started": false, "stale": true }` means a newer session owns the account. The older client stops its timer and sends no more heartbeats, but keeps the Token and local session ID. A later normal login can establish a new session.
- Only an explicit account exit attempts `/api/presence/offline`. It is best effort: failure or timeout must not prevent local exit. The final local cleanup removes `AUTH_TOKEN`, user data, and `PRESENCE_SESSION_ID`.
- Authentication expiry is different from explicit logout: stop and clear local presence without calling offline, because the credential can no longer authorize that request.

## Deployment preflight

1. Deploy a backend that exposes both `POST /api/presence/heartbeat` and `POST /api/presence/offline`, validates Bearer Tokens, and expires stale sessions after ten minutes.
2. Configure the built client with the intended HTTPS production base URL. `http://8.218.94.132` is the current source configuration and may require platform-specific development allowances; do not ship an unintended LAN or HTTP endpoint.
3. Ensure the H5 origin, App network policy, and Mini Program request-domain allowlist allow the base URL. Confirm no proxy strips `Authorization` or rewrites the two presence paths.
4. Use a dashboard that reports online users from the same production backend. Refresh it after each client-side action; it is not expected to update itself instantly.

## Manual acceptance matrix

Perform every scenario separately in **App**, **WeChat Mini Program**, and **H5**. Record platform, build/version, test account, approximate timestamp, dashboard count before/after, and observed request status. Use separate accounts for parallel platform runs unless deliberately testing the newer-login scenario.

| Scenario | Procedure on each platform | Expected dashboard result |
| --- | --- | --- |
| Existing valid Token opens App/Mini Program/H5 | Seed a currently valid `AUTH_TOKEN`; for the legacy-user path, remove only `PRESENCE_SESSION_ID`; reopen the client. | Online count rises after the next dashboard refresh; no login screen. The missing session ID is recreated locally and the first heartbeat is immediate. |
| Foreground after short background | Start from an online account, background/hide for less than ten minutes, then foreground/show it. | Online count remains or returns after the immediate heartbeat. The client uses the existing session ID and has one five-minute timer. |
| Background over ten minutes | Start from an online account, background/hide for more than ten minutes without restoring it, and allow server expiry processing to run. | Count falls after server expiry processing. No offline request is expected when the app is merely hidden or terminated. |
| Explicit account exit | While online, use the account-exit control; observe the offline request if the platform allows inspection, then reopen the client. | Offline is attempted, local Token/session ID are removed, and the dashboard count falls after refresh/processing. Reopening requires login. A failed offline request still must remove the local values. |
| Newer login from another device | Keep device A online. Login to the same account on device B with a different client session ID, then let device A make its next heartbeat or foreground it. | Device A receives `stale: true` and stops heartbeats; device B remains represented online. Device A does not need to show a login screen. |

Pass the release only when all five rows pass on all three platforms, except where a documented platform limitation prevents request inspection; in that case use the dashboard result and server request logs.

## Request-debugging guide

1. Identify the platform and timestamp, then confirm `AUTH_TOKEN` exists without copying its value into logs. Confirm `PRESENCE_SESSION_ID` is non-empty and remains stable across a short background/foreground cycle.
2. Inspect the first request after login, restore, or foreground. It must be `POST /api/presence/heartbeat` with `Content-Type: application/json;charset=utf-8`, `Authorization: Bearer <token>`, and a body containing exactly the client session ID needed by the server. A first successful request may return `201`/`started: true`; later refreshes normally return `200`/`started: false`.
3. On H5, use browser DevTools Network and preserve the log across reloads. On App and Mini Program, use the respective platform debugger/remote inspector or backend access logs. Filter by `/api/presence/heartbeat` and `/api/presence/offline`.
4. If the header is missing, trace through `utils/request.js`: authenticated calls must not set `noAuth: true`, and the stored Token must be present. If the path or body is wrong, trace the wrappers in `api/index.js` before changing platform-specific code.
5. For a missing online count, compare the client request time, HTTP status, response body, and dashboard refresh time against server logs. A network error preserves local login state and retries on the next foreground or five-minute cycle; it does not prove the server received a heartbeat.
6. For unexpected logout, distinguish a 401/expired Token from `stale: true`. A 401 clears local auth and presence without an offline call. `stale: true` stops heartbeats but intentionally retains the Token and does not redirect by itself.
7. For duplicate count or excessive traffic, verify only one five-minute interval exists. Repeated foreground/start calls should send an immediate heartbeat but must not create multiple active timers or concurrent heartbeat requests.
8. For explicit exit, verify one best-effort `POST /api/presence/offline`, then verify local removal of `AUTH_TOKEN` and `PRESENCE_SESSION_ID` even if the network call fails. Do not use the offline endpoint for backgrounding, process termination, or invalid-token cleanup.

## Current implementation check

The presence manager exposes `logoutPresence()` for the best-effort offline request and local session cleanup. Before release, confirm the active exit control invokes it before `clearAuth()`. The current `pages/index/index360.vue` exit handler calls `clearAuth()` directly, so it removes local values but does not currently attempt `/api/presence/offline`; this acceptance row is expected to reveal that gap and requires a follow-up wiring change before the explicit-exit requirement can pass.
