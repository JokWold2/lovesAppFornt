# Moments hub implementation plan

**Goal:** Implement the approved warm gray / white / yellow Moments preview on dev, with separate own-moments and personal-profile tabs, no search control, and profile likes opening the Likes tab.

**Architecture:** Keep existing own-moments APIs, photo management, profile sections, comments/replies, and tab navigation. Use native uni-app controls and page scrolling. Reuse the shared card presentation with an optional photo section so the management gallery is shown once. Preserve each inner tab's scroll position.

**Tech stack:** uni-app / Vue 3, shared six-language translation registry, Playwright H5 fixtures, HBuilderX builds.

**Approved design:** `F:/workspace/.lovesapp-runtime/moments-design-preview/index.html`, plus user's removal of search and redirection of received profile likes. Existing profile fields and API permissions remain in force. Work stays on dev; no publication or commit requested.

## Implementation

- [x] Restructure `pages/my/myLifeShow/myLifeShow.vue`: fixed safe-area header, compact identity, own-moments/profile tabs, white post cards, composer, compact interaction previews with full replies, grouped profile fields and photo management. Keep failed requests distinct from empty data.
- [x] Add `showPhotos` (default true) to `ProfileDetailSections.vue`, hiding only the duplicated gallery for this page.
- [x] Add one-use incoming Likes-tab intent, consumed on the Likes page. Navigation must not mark any incoming likes read.
- [x] Add `momentsHub` translations in all six supported languages, including existing Facebook strings touched by this page.
- [x] Add actual H5 fixture coverage for tabs, scroll position, likes navigation, dynamic actions, photo management, complete profile content, narrow screens, long language, loading/empty/errors.
- [x] Build H5, WeChat, and App sequentially; check generated WeChat handlers and package size. Report browser/build evidence separately from unavailable physical-device testing.

## Verification boundaries

Source API base URL remains unchanged. Test APIs are mocked, including writes. No live comments, likes, deletions, photo uploads, or publication are performed during QA. Preserve the user's existing uncommitted changes.

## Verified results
- H5 browser suite: original 13/13 passed; added cache-zero and slow-bio cases passed with both narrow-screen layouts and exception checks (5/5 follow-up).
- Related unit regression: 29/29 passed. All 396 page-localization lookups resolve across six languages.
- Final production builds: H5, mp-weixin and App all exit 0. Existing push-notification HarmonyOS detection warning remains outside this page change.
- WeChat output: 322 generated files, 1,223,576 bytes; copied into the existing development-tool project and verified all hashes. Private project config preserved; no upload performed.
- Physical WeChat / iOS / Android devices were not available for this verification.
