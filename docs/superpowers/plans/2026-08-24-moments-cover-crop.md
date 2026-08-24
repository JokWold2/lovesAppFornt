# 朋友圈封面裁切与展开 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在微信小程序、iOS 与 Android 上提供可确认裁切、可展开查看且不改变轮播位置的朋友圈顶部封面。

**Architecture:** 新增 `CoverCropper`，只处理本地临时图片的拖动、缩放及 Canvas 导出。`myLifeShow.vue` 仅编排选图、裁切、上传、轮播索引和预览状态；后端继续保存既有 `photos` URL 数组。

**Tech Stack:** Vue 3 `<script setup>`、uni-app `chooseImage` / Canvas、SCSS、Node 内置测试运行器。

**Spec:** `docs/superpowers/specs/2026-08-24-moments-cover-crop-design.md`

## Global Constraints

- 支持微信小程序、iOS App、Android App，不能使用浏览器专有 API。
- 用 Canvas 导出真实裁切图片后调用既有 `uploadProfilePhotosApi`，不修改后端或 `photos` 数据结构。
- 下方朋友圈图片流和资料相册不得修改。
- 常态封面为 `aspectFill`；展开态为深色遮罩中的 `aspectFit`。
- 展开时暂停并锁定当前轮播页；收起后回到同页并恢复自动播放。

---

### Task 1: 新建跨端封面裁切组件

**Files:**
- Create: `components/profile/CoverCropper.vue`
- Create: `components/profile/CoverCropper.test.mjs`

**Interfaces:**
- Consumes: `visible: Boolean`、`source: String`。
- Produces: `@cancel` 和 `@confirm(tempFilePath: String)`。

- [ ] **Step 1: Write the failing test**

Add a test named `裁切组件提供固定取景框并导出裁切后的临时文件` that reads `CoverCropper.vue` and asserts it contains `class="crop-frame"`, `canvas-id="coverCropCanvas"`, `uni.canvasToTempFilePath`, and `emit('confirm', tempFilePath)`.

- [ ] **Step 2: Run test to verify it fails**

Run `node --test components/profile/CoverCropper.test.mjs`. Expected: FAIL because `CoverCropper.vue` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create the overlay with a fixed-ratio `crop-frame` and `canvas-id="coverCropCanvas"`. Implement `onTouchStart`, `onTouchMove`, and `onTouchEnd` using uni-app touch events; maintain `scale`, `offsetX`, and `offsetY`; clamp offsets so no blank edge enters the frame. Use `uni.getImageInfo` for initial cover scaling, redraw Canvas after each touch, and export via `uni.canvasToTempFilePath`. On export failure show `uni.showToast({ title: '裁切失败，请重试', icon: 'none' })` without closing the overlay.

- [ ] **Step 4: Run test to verify it passes**

Run `node --test components/profile/CoverCropper.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

Stage `components/profile/CoverCropper.vue` and `components/profile/CoverCropper.test.mjs`, then commit `feat: add cross-platform cover cropper`.

### Task 2: 先裁切再上传封面

**Files:**
- Modify: `pages/my/myLifeShow/myLifeShow.vue:10-19, 181-200, 549-579`
- Modify: `pages/photoPresentation.test.mjs`

**Interfaces:**
- Consumes: `CoverCropper @confirm="uploadCroppedCover"`、`@cancel="cancelCoverCrop"`。
- Produces: `cropSource: Ref<String>`、`showCoverCropper: Ref<Boolean>`、`uploadCroppedCover(tempFilePath: String): Promise<void>`。

- [ ] **Step 1: Write the failing test**

Add a test named `选择封面先进入裁切层，只有裁切结果才能上传`. It must assert the page renders `CoverCropper` with `@confirm="uploadCroppedCover"`, assigns `cropSource.value = res.tempFilePaths[0]`, calls `uploadProfilePhotosApi([tempFilePath])`, and does not call `uploadProfilePhotosApi(res.tempFilePaths)`.

- [ ] **Step 2: Run test to verify it fails**

Run `node --test pages/photoPresentation.test.mjs`. Expected: FAIL because the page directly uploads `res.tempFilePaths`.

- [ ] **Step 3: Write minimal implementation**

Import `CoverCropper`; select one album image, assign `cropSource.value = res.tempFilePaths[0]`, and open the cropper. Move the current upload work into `uploadCroppedCover`, invoke `uploadProfilePhotosApi([tempFilePath])`, refresh profile data, set `currentCoverIndex` to the newly appended image, and clear crop state on completion and cancel. Preserve current loading cleanup and upload failure toast.

- [ ] **Step 4: Run test to verify it passes**

Run `node --test pages/photoPresentation.test.mjs components/profile/CoverCropper.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

Stage `pages/my/myLifeShow/myLifeShow.vue` and `pages/photoPresentation.test.mjs`, then commit `feat: crop covers before profile upload`.

### Task 3: 当前封面展开与轮播恢复

**Files:**
- Modify: `pages/my/myLifeShow/myLifeShow.vue:10-19, 196-205, 650-680`
- Modify: `pages/photoPresentation.test.mjs`

**Interfaces:**
- Consumes: `currentCoverIndex: Ref<Number>` 由 `onCoverChange` 更新。
- Produces: `coverExpanded: Ref<Boolean>`、`coverAutoplay`、`openCoverPreview()`、`closeCoverPreview()`。

- [ ] **Step 1: Write the failing test**

Add a test named `展开封面暂停轮播并固定当前图片，收起后恢复轮播`. Assert the swiper binds `:current="currentCoverIndex"`, `:autoplay="coverAutoplay"`, and `@change="onCoverChange"`; assert an element guarded by `v-if="coverExpanded"` closes via `@tap="closeCoverPreview"`; assert its `cover-preview-image` uses `mode="aspectFit"`.

- [ ] **Step 2: Run test to verify it fails**

Run `node --test pages/photoPresentation.test.mjs`. Expected: FAIL because current swiper has no current index, autoplay state, or preview overlay.

- [ ] **Step 3: Write minimal implementation**

Bind the swiper to `currentCoverIndex`, `coverAutoplay`, and `onCoverChange`. Add `coverExpanded` full-screen dark mask showing `profilePhotos[currentCoverIndex]` in `aspectFit`; image taps stop propagation and taps on blank mask close the preview. Define `coverAutoplay` as `profilePhotos.value.length > 1 && !coverExpanded.value`; closing only flips this state and leaves `currentCoverIndex` untouched. Add safe-area padding and close affordance. Do not change `.single-img`, `.grid-img`, or `ProfilePhotoGallery`.

- [ ] **Step 4: Run test to verify it passes**

Run `node --test pages/photoPresentation.test.mjs components/profile/CoverCropper.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

Stage `pages/my/myLifeShow/myLifeShow.vue` and `pages/photoPresentation.test.mjs`, then commit `feat: preview current moments cover`.

### Task 4: 回归验证

**Files:**
- Modify: `pages/photoPresentation.test.mjs` only if a failed test exposes a missing documented state contract.

- [ ] **Step 1: Run focused tests**

Run `node --test components/profile/CoverCropper.test.mjs pages/photoPresentation.test.mjs`. Expected: PASS with crop export, crop-before-upload, expanded preview, current slide, and autoplay assertions.

- [ ] **Step 2: Run full suite**

Run `node --test`. Expected: all tests pass; if an unrelated existing failure appears, preserve unrelated files and record the exact failing file, assertion, and actual value.

- [ ] **Step 3: Manual three-platform checklist**

Verify in WeChat Developer Tools, iOS App, and Android App: multi-cover autoplay; crop drag/pinch/confirm; persisted server replay after re-entry; current-cover preview pauses carousel; blank-mask close restores same slide and autoplay; cancel/export failure changes neither cover nor server data.

- [ ] **Step 4: Commit verification-only test adjustments if required**

Stage only `pages/photoPresentation.test.mjs`, then commit `test: cover cross-platform behavior`.
