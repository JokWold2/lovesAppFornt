<template>
  <CakeProductList
    nav-title-key="cake.transportTitle"
    :category-codes="categoryCodes"
    :mode="mode"
    :store-id="storeId"
    :marketing="marketing"
    :include-notice="true"
  />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CakeProductList from '@/components/cake/CakeProductList.vue'

// 月饼到家只展示月饼相关分类；后端新增分类时在这里补 code 即可。
const categoryCodes = ['mooncake-gift', 'mooncake-fresh', 'mooncake-set', 'cookie-gift']

const mode = ref('delivery')
const storeId = ref(0)
const marketing = ref('')

onLoad(options => {
  if (options?.mode === 'pickup' || options?.mode === 'delivery') mode.value = options.mode
  const id = Number(options?.storeId)
  if (Number.isFinite(id) && id > 0) storeId.value = id
  if (options?.marketing) marketing.value = String(options.marketing)
})
</script>
