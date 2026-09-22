<template>
  <CakeProductList
    nav-title-key="cake.shopTitle"
    :category-codes="categoryCodes"
    :mode="mode"
    :store-id="storeId"
    :marketing="marketing"
  />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CakeProductList from '@/components/cake/CakeProductList.vue'

// 蛋糕页覆盖蛋糕、面包与茶饮；点单页选中门店后会带 storeId 与 pickup 进来。
const categoryCodes = ['cake-birthday', 'cake-slice', 'bread', 'drink']

const mode = ref('pickup')
const storeId = ref(0)
const marketing = ref('')

onLoad(options => {
  if (options?.mode === 'pickup' || options?.mode === 'delivery') mode.value = options.mode
  const id = Number(options?.storeId)
  if (Number.isFinite(id) && id > 0) storeId.value = id
  if (options?.marketing) marketing.value = String(options.marketing)
})
</script>
