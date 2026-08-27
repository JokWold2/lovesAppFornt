# Presence heartbeat final-fix report

## Scope

- Added persistent foreground eligibility: `pausePresence()` marks the application backgrounded; `resumePresence()` is called from `App.vue` `onShow` before restarting presence.
- Explicit logout now stops and invalidates presence synchronously before awaiting the best-effort offline request.
- Heartbeat requests carry ownership versions so an old request cannot be reused by, clear, or mark stale a new presence session.

## RED

Command:

```sh
node --test utils/presence.test.mjs utils/presence.integration.test.mjs
```

Result: exit 1; 10 passed, 5 failed. The failures were the missing `resumePresence()` lifecycle call, a backgrounded start that still sent a heartbeat, the timer still live while logout awaited offline, and a stopped in-flight heartbeat being reused by the next start. The existing pause/resume lifecycle test also failed because the new foreground-resume API did not yet exist.

## GREEN

Command:

```sh
node --test utils/presence.test.mjs utils/presence.integration.test.mjs
```

Result: exit 0; 15 passed, 0 failed.

Additional check:

```sh
git diff --check
```

Result: exit 0 with no whitespace errors.

Project-wide test command check:

```sh
npm test
```

Result: exit 1 because `package.json` has no `test` script. The focused Node presence suite above is the executable test coverage available for this change.
