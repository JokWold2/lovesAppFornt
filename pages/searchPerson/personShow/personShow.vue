<template>
  <view class="profile-detail-route" :class="{ 'is-closing': closing }">
    <ProfileDetailView :id="profileId" :visible="visible" @close="goBack" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import ProfileDetailView from '@/components/profile/ProfileDetailView.vue'

const profileId = ref(null)
const visible = ref(false)
const closing = ref(false)
let closeTimer = null
onLoad(options => { profileId.value = options?.id ? Number(options.id) : null })
onShow(() => { visible.value = true })
onHide(() => { visible.value = false })
onUnload(() => { visible.value = false; clearTimeout(closeTimer) })

function goBack() {
  if (closing.value) return
  closing.value = true
  visible.value = false
  let duration = 240
  // #ifdef H5
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) duration = 0
  // #endif
  closeTimer = setTimeout(() => {
    const fail = () => { closing.value = false; visible.value = true }
    if (getCurrentPages().length > 1) uni.navigateBack({ animationType: 'none', animationDuration: 0, fail })
    else uni.switchTab({ url: '/pages/index/index360', fail })
  }, duration)
}
</script>

<style scoped>
.profile-detail-route { position: fixed; inset: 0; height: 100%; overflow: hidden; background: #f5f4f1; transform: translate3d(0,0,0); transition: transform 240ms cubic-bezier(.32,.72,0,1); }
.profile-detail-route.is-closing { transform: translate3d(0,100%,0); pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .profile-detail-route { transition: none; } }
</style>
