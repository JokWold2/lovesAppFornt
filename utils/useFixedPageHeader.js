import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onReady, onResize, onShow } from '@dcloudio/uni-app'
import { readPageHeaderInset } from './pageHeaderLayout.js'

// Keep native page scrolling (including pull refresh and reach-bottom), while
// accounting for translated text that can change the fixed header's height.
export function useFixedPageHeader(selector, contentHeight, layoutKey) {
  const instance = getCurrentInstance()
  const topInset = ref(readPageHeaderInset(uni))
  const measuredHeight = ref(topInset.value + contentHeight)
  let disposed = false, pending = false, generation = 0

  function refreshHeaderLayout() {
    if (disposed) return
    const inset = readPageHeaderInset(uni)
    if (inset !== topInset.value) {
      measuredHeight.value += inset - topInset.value
      topInset.value = inset
    }
    if (pending) return
    pending = true
    const request = ++generation
    nextTick(() => {
      pending = false
      if (disposed || !uni.createSelectorQuery) return
      let query = uni.createSelectorQuery()
      if (instance?.proxy && query.in) query = query.in(instance.proxy)
      query.select(selector).boundingClientRect(rect => {
        if (disposed || request !== generation || !rect?.height) return
        const height = Math.ceil(rect.height)
        if (height !== measuredHeight.value) measuredHeight.value = height
      }).exec()
    })
  }

  onMounted(refreshHeaderLayout)
  onReady(refreshHeaderLayout)
  onShow(refreshHeaderLayout)
  onResize(refreshHeaderLayout)
  if (layoutKey) watch(layoutKey, refreshHeaderLayout, { flush: 'post' })
  onBeforeUnmount(() => { disposed = true; generation++ })

  return {
    headerStyle: computed(() => ({ paddingTop: `${topInset.value}px` })),
    spacerStyle: computed(() => ({ height: `${measuredHeight.value}px` }))
  }
}
