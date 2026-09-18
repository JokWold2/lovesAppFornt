# Group chat approved design implementation

## Global constraints
- Work on existing dev branches, preserve all previous edits; do not commit, push, deploy, switch API environments, or write to real accounts/database.
- Reference: C:/Users/Administrator/.codex/visualizations/2026/09/18/01a0b31b-91da-7b93-be4c-4c0232e514b7/group-chat-design.html.
- Warm gray background, round white navigation controls, white rounded cards, yellow actions and pale yellow own messages. Preserve chat history/scroll, replies, mentions, images, emoji and receipts.
- Group members can inspect details. Only active L5/L6 group members can manage; membership is always required. Preserve protected target restrictions. Server must enforce this independently.
- Invite selection uses a yellow box with a white tick. Keep reusable review fields and API event contracts.
- New likes prefer avatar, then uploaded photo. Never expose protected photos through locked previews.
- Six locales, H5/WeChat/App, accessible touch sizes, recoverable loading errors and downward exit motion for sheets. No real-device claims from builds.

## Task 1: Backend permissions and avatar preference
Read AGENTS.md in frontend and inspect relevant backend tests. Own backend chat permission service/controller/tests and frontend pages/notice/notice.vue photo selection plus a focused behavioral test/helper if needed. Do not edit other frontend files. Expose group.canManage boolean in detail response based on active status, authenticated account L5/L6, and group membership. Expose profileId on detail members for viewing profiles, if available via existing profiles join. Authorize management using membership plus L5/L6, not a stale role flag. Keep target admin/self removal restrictions. Check invitation candidate authorization. Make avatar precedence fix in inbox without altering locked preview behavior. Test unauthorized forged admin, L5/L6, outsider, ordinary read and photo precedence as appropriate. Do not run heavyweight browsers/builds. Report paths, test results and concerns.

## Task 2: Frontend approved visual refresh
Root owns chatRoom, ChatComposer, ChatMessageBubble, groupManage, groupMembers, member sheets, translations and pages.json. Preserve existing behavior and review picker reuse; use SlideUpPanel and custom safe-area navigation. Backend canManage is authoritative; until available fail closed. Add profile detail access to member list. Provide errors/retry, safe pending state and confirmation panels. Verify permissions, selected tick, keyboard/history, long locales and narrow screens.

## Task 3: Integration and review
Run targeted frontend/backend behavior tests and the existing relevant suite. Review rendered views in H5 with mocked APIs (no real mutations); inspect ordinary and management paths. Build H5, mp-weixin and app sequentially. Review final changed files, address defects and preserve environment. Report build/device distinction and leave work uncommitted.
